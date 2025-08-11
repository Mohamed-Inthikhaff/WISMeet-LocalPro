import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';
import { Meeting, ChatSession } from '@/lib/types/chat';

// Recommended indexes:
// db.meetings.createIndex({ meetingId: 1 }, { unique: true })
// db.meetings.createIndex({ hostId: 1, startTime: -1 })
// db.meetings.createIndex({ participants: 1, startTime: -1 })
// db.messages.createIndex({ meetingId: 1, timestamp: -1 })
// db.chat_sessions.createIndex({ meetingId: 1 })

// GET /api/chat/meetings?meetingId=xxx&limit=20
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // SECURITY: Ignore ?userId=, always use authenticated userId
    const queryUserId = userId;
    
    // VALIDATION: Sanitize limit
    const rawLimit = Number(searchParams.get('limit') ?? 20);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20;
    
    // VALIDATION: Validate meetingId
    const meetingId = searchParams.get('meetingId') ?? null;
    if (meetingId && (meetingId.length > 128 || !/^[A-Za-z0-9:_\-.]+$/.test(meetingId))) {
      return NextResponse.json({ error: 'Invalid meetingId' }, { status: 400 });
    }

    const db = await getDb();
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);
    const chatSessionsCollection = db.collection(COLLECTIONS.CHAT_SESSIONS);
    const messagesCollection = db.collection(COLLECTIONS.MESSAGES);

    let meetings;

    if (meetingId) {
      // Get specific meeting
      const meeting = await meetingsCollection.findOne({ meetingId });
      if (!meeting) {
        return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
      }
      
      // ROBUSTNESS: Coalesce participants array
      const participants = Array.isArray(meeting.participants) ? meeting.participants : [];
      
      // Single-meeting access check
      if (meeting.hostId !== queryUserId && !participants.includes(queryUserId)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      
      // Get message count for this meeting
      const messageCount = await messagesCollection.countDocuments({ meetingId });
      
      meetings = [{
        ...meeting,
        messageCount
      }];
    } else {
      // Get meetings where user participated
      meetings = await meetingsCollection
        .find({
          $or: [
            { hostId: queryUserId },
            { participants: queryUserId }
          ]
        })
        .sort({ startTime: -1 })
        .limit(limit)
        .toArray();

      // PERFORMANCE: Early return if no meetings to avoid $in: [] queries
      if (meetings.length === 0) {
        return NextResponse.json({
          meetings: [],
          total: 0
        });
      }

      // Get message counts for all meetings
      const meetingIds = meetings.map(m => m.meetingId);
      const messageCounts = await messagesCollection.aggregate([
        { $match: { meetingId: { $in: meetingIds } } },
        { $group: { _id: '$meetingId', count: { $sum: 1 } } }
      ]).toArray();

      const countMap = new Map();
      messageCounts.forEach(item => {
        countMap.set(item._id, item.count);
      });

      // Add message counts to meetings
      meetings = meetings.map(meeting => ({
        ...meeting,
        messageCount: countMap.get(meeting.meetingId) || 0
      }));

      // Get chat sessions for all meetings
      const sessions = await chatSessionsCollection.find({
        meetingId: { $in: meetingIds }
      }).toArray();

      const sessionMap = new Map();
      sessions.forEach(session => {
        sessionMap.set(session.meetingId, session);
      });

      // CONSISTENCY: Keep chatSession: null if absent
      meetings = meetings.map((meeting: any) => ({
        ...meeting,
        chatSession: sessionMap.get(meeting.meetingId) || null
      }));
    }

    return NextResponse.json({
      meetings: meetings,
      total: meetings.length
    });

  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}

// POST /api/chat/meetings - Create or update meeting
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // VALIDATION: Validate body
    const body = await request.json();
    const { meetingId, title, participants = [] } = body ?? {};
    
    if (typeof meetingId !== 'string' || !meetingId.trim() || meetingId.length > 128 || !/^[A-Za-z0-9:_\-.]+$/.test(meetingId)) {
      return NextResponse.json({ error: 'Invalid meetingId' }, { status: 400 });
    }
    
    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // ROBUSTNESS: Ensure participants is string[] and include host once
    const uniq = new Set<string>((Array.isArray(participants) ? participants : []).filter(p => typeof p === 'string'));
    uniq.add(userId);
    const participantList = Array.from(uniq);

    const db = await getDb();
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);

    // PERFORMANCE: Use single Mongo upsert for POST
    const now = new Date();
    const res = await meetingsCollection.updateOne(
      { meetingId },
      {
        $set: {
          title: title.trim(),
          participants: participantList,
          updatedAt: now,
        },
        $setOnInsert: {
          hostId: userId,
          startTime: now,
          status: 'active',
          createdAt: now,
          recordingId: `recording-${meetingId}-${Date.now()}`,
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
    console.error('Error creating/updating meeting:', error);
    return NextResponse.json(
      { error: 'Failed to create/update meeting' },
      { status: 500 }
    );
  }
} 