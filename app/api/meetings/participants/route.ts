import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

/**
 * POST /api/meetings/participants
 * Add or remove participants from a meeting
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { meetingId, participantId, action } = body;

    if (!meetingId || !participantId || !action) {
      return NextResponse.json(
        { error: 'Meeting ID, participant ID, and action are required' },
        { status: 400 }
      );
    }

    if (!['add', 'remove'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "add" or "remove"' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);

    // Check if meeting exists
    const meeting = await meetingsCollection.findOne({ meetingId });
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Update participants array
    if (action === 'add') {
      // Add participant if not already in the array
      await meetingsCollection.updateOne(
        { meetingId },
        { 
          $addToSet: { participants: participantId },
          $set: { updatedAt: new Date() }
        }
      );
      console.log(`✅ Added participant ${participantId} to meeting ${meetingId}`);
    } else {
      // Remove participant from the array
      await meetingsCollection.updateOne(
        { meetingId },
        { 
          $pull: { participants: participantId },
          $set: { updatedAt: new Date() }
        }
      );
      console.log(`✅ Removed participant ${participantId} from meeting ${meetingId}`);
    }

    return NextResponse.json({
      success: true,
      message: `Participant ${action === 'add' ? 'added to' : 'removed from'} meeting`,
      meetingId,
      participantId,
      action
    });

  } catch (error) {
    console.error('Error managing meeting participants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/meetings/participants?meetingId=xxx
 * Get participants for a meeting
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);

    const meeting = await meetingsCollection.findOne(
      { meetingId },
      { projection: { participants: 1, hostId: 1 } }
    );

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      meetingId,
      participants: meeting.participants || [],
      hostId: meeting.hostId
    });

  } catch (error) {
    console.error('Error getting meeting participants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

