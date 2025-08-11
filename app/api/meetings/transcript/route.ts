import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

// Recommended indexes:
// db.meetings.createIndex({ meetingId: 1 }, { unique: true })
// db.meetings.createIndex({ hostId: 1, meetingId: 1 })
// db.meetings.createIndex({ participants: 1, meetingId: 1 })

/**
 * POST /api/meetings/transcript
 * Store meeting transcript in database
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { meetingId, transcript } = body ?? {};

    // VALIDATION: Validate meetingId syntax
    if (!meetingId || typeof meetingId !== 'string' || 
        meetingId.length > 128 || !/^[A-Za-z0-9:_\-.]+$/.test(meetingId)) {
      return NextResponse.json({ error: 'Invalid meetingId' }, { status: 400 });
    }

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }

    // ACCESS CONTROL: Enforce user access to that meeting
    const db = await getDb();
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);
    
    const meeting = await meetingsCollection.findOne(
      { meetingId }, 
      { projection: { hostId: 1, participants: 1 } }
    );
    
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }
    
    const participants: string[] = Array.isArray(meeting.participants) ? meeting.participants : [];
    if (meeting.hostId !== userId && !participants.includes(userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // CLAMP TRANSCRIPT SIZE: Protect DB from large transcripts
    const maxLen = 100_000;
    const safeTranscript = String(transcript).slice(0, maxLen);

    const result = await meetingsCollection.updateOne(
      { meetingId },
      {
        $set: {
          transcript: safeTranscript,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Transcript stored successfully',
      meetingId,
      truncated: transcript.length > maxLen
    });

  } catch (error) {
    console.error('Error storing transcript:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/meetings/transcript?meetingId=xxx
 * Get meeting transcript from database
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');

    // VALIDATION: Validate meetingId syntax
    if (!meetingId || meetingId.length > 128 || !/^[A-Za-z0-9:_\-.]+$/.test(meetingId)) {
      return NextResponse.json({ error: 'Invalid meetingId' }, { status: 400 });
    }

    // ACCESS CONTROL: Enforce user access to that meeting
    const db = await getDb();
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);

    const meeting = await meetingsCollection.findOne(
      { meetingId },
      { projection: { transcript: 1, meetingId: 1, hostId: 1, participants: 1 } }
    );

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const participants: string[] = Array.isArray(meeting.participants) ? meeting.participants : [];
    if (meeting.hostId !== userId && !participants.includes(userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      meetingId: meeting.meetingId,
      transcript: meeting.transcript || ''
    });

  } catch (error) {
    console.error('Error retrieving transcript:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 