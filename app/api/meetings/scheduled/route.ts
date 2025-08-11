import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';

// Recommended indexes:
// db.meetings.createIndex({ meetingId: 1 }, { unique: true })
// db.meetings.createIndex({ hostId: 1, startTime: -1 })
// db.meetings.createIndex({ participants: 1, startTime: -1 })
// db.meetings.createIndex({ status: 1, startTime: 1 })
// db.meetings.createIndex({ status: 1, endTime: 1 })

// Utility function to update meeting statuses
const updateMeetingStatuses = async (db: any) => {
  const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);
  const now = new Date();

  // Update meetings that have started but not ended
  await meetingsCollection.updateMany(
    {
      startTime: { $lte: now },
      endTime: { $exists: false },
      status: 'scheduled'
    },
    {
      $set: { status: 'active', updatedAt: now }
    }
  );

  // Update meetings that have ended
  await meetingsCollection.updateMany(
    {
      endTime: { $lte: now },
      status: { $in: ['scheduled', 'active'] }
    },
    {
      $set: { status: 'ended', updatedAt: now }
    }
  );
};

// GET /api/meetings/scheduled
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // SECURITY & VALIDATION: Sanitize and clamp limit
    const rawLimit = Number(searchParams.get('limit') ?? 20);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20;

    // VALIDATION: Validate status parameter
    const statusParam = (searchParams.get('status') ?? 'scheduled').toLowerCase();
    const allowedStatuses = new Set(['scheduled', 'active', 'ended']);
    const status = allowedStatuses.has(statusParam) ? statusParam : 'scheduled';

    const db = await getDb();
    
    // PERFORMANCE: Remove heavy updateMeetingStatuses from every GET request
    // TODO: Move status updates to a cron/queue worker. Avoid doing this on every GET.
    // await updateMeetingStatuses(db);
    
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);

    // ROBUSTNESS: Build query safely and consistently
    const now = new Date();
    const query: Record<string, any> = {
      $or: [{ hostId: userId }, { participants: userId }],
    };

    if (status === 'scheduled') {
      query.status = 'scheduled';
      query.startTime = { $gt: now };
    } else if (status === 'active') {
      query.status = 'active';
    } else if (status === 'ended') {
      query.status = 'ended';
    }

    // Fetch scheduled meetings
    const meetings = await meetingsCollection
      .find(query)
      .sort({ startTime: status === 'ended' ? -1 : 1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      meetings,
      total: meetings.length
    });

  } catch (error) {
    console.error('Error fetching scheduled meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled meetings' },
      { status: 500 }
    );
  }
}

// POST /api/meetings/scheduled - Create a new scheduled meeting
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // VALIDATION: Validate body inputs
    const body = await request.json();
    const { 
      meetingId, 
      title, 
      description, 
      startTime, 
      endTime, 
      participants = [] 
    } = body ?? {};

    // Validate meetingId
    if (typeof meetingId !== 'string' || !meetingId.trim() || meetingId.length > 128 || !/^[A-Za-z0-9:_\-.]+$/.test(meetingId)) {
      return NextResponse.json({ error: 'Invalid meetingId' }, { status: 400 });
    }

    // Validate title
    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // ROBUSTNESS: Never rely on client-provided time parsing without checks
    let parsedStartTime: Date;
    let parsedEndTime: Date | undefined;

    try {
      parsedStartTime = new Date(startTime);
      if (isNaN(parsedStartTime.getTime())) {
        return NextResponse.json({ error: 'Invalid startTime' }, { status: 400 });
      }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid startTime format' }, { status: 400 });
    }

    if (endTime) {
      try {
        parsedEndTime = new Date(endTime);
        if (isNaN(parsedEndTime.getTime())) {
          return NextResponse.json({ error: 'Invalid endTime' }, { status: 400 });
        }
        if (parsedEndTime <= parsedStartTime) {
          return NextResponse.json({ error: 'endTime must be after startTime' }, { status: 400 });
        }
      } catch (error) {
        return NextResponse.json({ error: 'Invalid endTime format' }, { status: 400 });
      }
    }

    const db = await getDb();
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);

    // ROBUSTNESS: Ensure participants is always an array of strings, host included once
    const uniq = new Set<string>((Array.isArray(participants) ? participants : []).filter(p => typeof p === 'string'));
    uniq.add(userId);
    const participantList = Array.from(uniq);

    // OPTIONAL IMPROVEMENT: Use upsert for creating scheduled meetings
    const now = new Date();
    const meetingData: Record<string, any> = {
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      startTime: parsedStartTime,
      hostId: userId,
      participants: participantList,
      status: 'scheduled',
      updatedAt: now,
    };

    // Only include endTime if it's provided and valid
    if (parsedEndTime) {
      meetingData.endTime = parsedEndTime;
    }

    const res = await meetingsCollection.updateOne(
      { meetingId },
      {
        $set: meetingData,
        $setOnInsert: {
          createdAt: now,
          recordingId: `recording-${meetingId}-${Date.now()}`
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      meetingId,
      created: res.upsertedCount > 0,
      updated: res.matchedCount > 0 && res.modifiedCount > 0,
    });

  } catch (error) {
    console.error('Error creating scheduled meeting:', error);
    return NextResponse.json(
      { error: 'Failed to create scheduled meeting' },
      { status: 500 }
    );
  }
} 