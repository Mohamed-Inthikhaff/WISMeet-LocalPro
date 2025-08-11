import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';

// Recommended indexes:
// db.messages.createIndex({ meetingId: 1, timestamp: 1 })
// db.meetings.createIndex({ meetingId: 1 }, { unique: true })

type ChatMessage = {
  _id?: any;
  meetingId: string;
  message: string;
  messageType: 'user' | 'system';
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date;
  reactions: { userId: string; emoji: string }[];
}

// GET /api/chat/messages?meetingId=xxx&limit=50
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');
    const rawLimit = parseInt(searchParams.get('limit') || '50');

    // Validate meetingId
    if (!meetingId || meetingId.length > 128 || !/^[A-Za-z0-9:_\-.]+$/.test(meetingId)) {
      return NextResponse.json({ error: 'Invalid meetingId' }, { status: 400 });
    }

    // Clamp limit to 1..100
    const limit = Math.min(Math.max(rawLimit, 1), 100);

    const db = await getDb();
    const messagesCollection = db.collection(COLLECTIONS.MESSAGES);
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);

    // Verify meeting exists and user belongs (hostId or participants includes userId)
    const meeting = await meetingsCollection.findOne({ meetingId });
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const participants: string[] = Array.isArray(meeting.participants) ? meeting.participants : [];
    if (meeting.hostId !== userId && !participants.includes(userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get messages sorted oldest->newest
    const messages = await messagesCollection
      .find({ meetingId })
      .sort({ timestamp: 1 }) // Oldest first
      .limit(limit)
      .toArray();

    return NextResponse.json({ messages });

  } catch (error) {
    console.error('Chat messages API: Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/chat/messages
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      meetingId, 
      message, 
      senderId, 
      senderName, 
      senderAvatar, 
      messageType = 'user' 
    } = body;

    // Validate meetingId
    if (!meetingId || meetingId.length > 128 || !/^[A-Za-z0-9:_\-.]+$/.test(meetingId)) {
      return NextResponse.json({ error: 'Invalid meetingId' }, { status: 400 });
    }

    // Validate fields (non-empty strings)
    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!senderId || typeof senderId !== 'string' || !senderId.trim()) {
      return NextResponse.json({ error: 'Sender ID is required' }, { status: 400 });
    }

    if (!senderName || typeof senderName !== 'string' || !senderName.trim()) {
      return NextResponse.json({ error: 'Sender name is required' }, { status: 400 });
    }

    // Validate messageType
    if (messageType !== 'user' && messageType !== 'system') {
      return NextResponse.json({ error: 'Invalid messageType' }, { status: 400 });
    }

    // Validate that the sender is the authenticated user
    if (senderId !== userId) {
      return NextResponse.json(
        { error: 'Sender ID must match authenticated user' },
        { status: 403 }
      );
    }

    const db = await getDb();
    const messagesCollection = db.collection(COLLECTIONS.MESSAGES);
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);

    // Verify user belongs to meeting
    const meeting = await meetingsCollection.findOne({ meetingId });
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const participants: string[] = Array.isArray(meeting.participants) ? meeting.participants : [];
    if (meeting.hostId !== userId && !participants.includes(userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create new message
    const newMessage: Omit<ChatMessage, '_id'> = {
      meetingId,
      message: message.trim(),
      messageType,
      senderId,
      senderName: senderName.trim(),
      senderAvatar: senderAvatar?.trim(),
      timestamp: new Date(),
      reactions: []
    };

    const result = await messagesCollection.insertOne(newMessage);

    return NextResponse.json({
      success: true,
      _id: result.insertedId
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
} 