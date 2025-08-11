import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';
import { MessageReaction } from '@/lib/types/chat';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/chat/export?meetingId=xxx&format=json|csv
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');
    const format = searchParams.get('format') || 'json';

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    const db = await getDb();
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);
    const messagesCollection = db.collection(COLLECTIONS.MESSAGES);

    // Verify user has access to this meeting
    const meeting = await meetingsCollection.findOne({ meetingId });
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    if (meeting.hostId !== userId && !meeting.participants.includes(userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all messages for this meeting
    const messages = await messagesCollection
      .find({ meetingId })
      .sort({ timestamp: 1 })
      .toArray();

    const exportData = {
      meeting: {
        id: meeting.meetingId,
        title: meeting.title,
        hostId: meeting.hostId,
        participants: meeting.participants,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        status: meeting.status
      },
      messages: messages.map(msg => ({
        id: msg._id,
        senderId: msg.senderId,
        senderName: msg.senderName,
        message: msg.message,
        messageType: msg.messageType,
        timestamp: msg.timestamp,
        isEdited: msg.isEdited,
        reactions: msg.reactions
      })),
      exportInfo: {
        exportedAt: new Date().toISOString(),
        totalMessages: messages.length,
        format: format
      }
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = 'Timestamp,Sender,Message,Type,Reactions\n';
      const csvRows = messages.map(msg => {
        const reactions = msg.reactions.map((r: MessageReaction) => r.emoji).join(' ');
        return `"${new Date(msg.timestamp).toISOString()}","${msg.senderName}","${msg.message.replace(/"/g, '""')}","${msg.messageType}","${reactions}"`;
      }).join('\n');
      
      const csvContent = csvHeaders + csvRows;
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="chat-export-${meetingId}.csv"`
        }
      });
    } else {
      // Return JSON format
      return NextResponse.json(exportData);
    }

  } catch (error) {
    console.error('Error exporting chat:', error);
    return NextResponse.json(
      { error: 'Failed to export chat' },
      { status: 500 }
    );
  }
} 