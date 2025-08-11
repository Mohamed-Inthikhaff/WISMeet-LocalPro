import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sendBulkInvitationEmails, verifyEmailConfig } from '@/lib/email';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

// POST /api/meetings/send-invitations
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      meetingId, 
      title, 
      description, 
      startTime, 
      endTime, 
      guestEmails = [],
      hostName 
    } = body;

    // Validate required fields
    if (!meetingId || !title || !startTime || !guestEmails.length || !hostName) {
      return NextResponse.json(
        { error: 'Meeting ID, title, start time, guest emails, and host name are required' },
        { status: 400 }
      );
    }

    // Verify email configuration
    const emailConfigCheck = await verifyEmailConfig();
    if (!emailConfigCheck.success) {
      return NextResponse.json(
        { error: 'Email service not configured properly', details: emailConfigCheck.error },
        { status: 500 }
      );
    }

    // Create meeting link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const meetingLink = `${baseUrl}/meeting/${meetingId}`;

    // Send invitation emails
    const emailResults = await sendBulkInvitationEmails({
      title,
      hostName,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      description,
      meetingLink,
      guestEmails
    });

    // Track email sending results in database
    const db = await getDb();
    const invitationsCollection = db.collection(COLLECTIONS.INVITATIONS || 'invitations');

    const invitationRecord = {
      meetingId,
      hostId: userId,
      hostName,
      title,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      description,
      guestEmails,
      emailResults,
      sentAt: new Date(),
      status: 'sent'
    };

    await invitationsCollection.insertOne(invitationRecord);

    // Calculate success/failure statistics
    const successfulEmails = emailResults.filter(result => result.success);
    const failedEmails = emailResults.filter(result => !result.success);

    return NextResponse.json({
      success: true,
      message: `Invitations sent successfully`,
      statistics: {
        total: emailResults.length,
        successful: successfulEmails.length,
        failed: failedEmails.length,
        successRate: `${((successfulEmails.length / emailResults.length) * 100).toFixed(1)}%`
      },
      results: emailResults,
      meetingLink
    });

  } catch (error) {
    console.error('Error sending invitations:', error);
    return NextResponse.json(
      { error: 'Failed to send invitations' },
      { status: 500 }
    );
  }
}

// GET /api/meetings/send-invitations?meetingId=xxx
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
    const invitationsCollection = db.collection(COLLECTIONS.INVITATIONS || 'invitations');

    // Get invitation history for this meeting
    const invitations = await invitationsCollection
      .find({ meetingId, hostId: userId })
      .sort({ sentAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      invitations
    });

  } catch (error) {
    console.error('Error fetching invitation history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitation history' },
      { status: 500 }
    );
  }
} 