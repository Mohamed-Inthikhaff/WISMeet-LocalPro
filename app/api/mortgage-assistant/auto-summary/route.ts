import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  generateAndSendMeetingSummary,
  captureMeetingTranscript,
  getMeetingParticipants,
  determineMeetingType,
  MeetingSummaryData
} from '@/lib/meeting-summary';

/**
 * POST /api/mortgage-assistant/auto-summary
 * Automatically generates and sends meeting summary when meeting ends
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { meetingId, startTime, endTime, triggerType = 'manual_end' } = body;

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    console.log(`🤖 Processing automatic summary for meeting: ${meetingId} (Trigger: ${triggerType})`);

    // Handle different trigger types
    let summaryMessage = 'Meeting summary generated and sent successfully';
    switch (triggerType) {
      case 'host_departure':
        summaryMessage = 'Meeting summary generated due to host departure';
        break;
      case 'call_ended':
        summaryMessage = 'Meeting summary generated due to call ending';
        break;
      case 'page_closed':
        summaryMessage = 'Meeting summary generated due to page close';
        break;
      case 'all_participants_left':
        summaryMessage = 'Meeting summary generated - all participants left';
        break;
      case 'meeting_timeout':
        summaryMessage = 'Meeting summary generated due to timeout';
        break;
      case 'network_disconnected':
        summaryMessage = 'Meeting summary generated due to network issues';
        break;
      case 'manual_end':
      default:
        summaryMessage = 'Meeting summary generated manually';
        break;
    }

    // Step 1: Capture meeting transcript
    const transcript = await captureMeetingTranscript(meetingId);
    console.log('📝 Meeting transcript captured');

    // Step 2: Get meeting participants
    const participants = await getMeetingParticipants(meetingId);
    console.log(`👥 Found ${participants.length} participants`);

    // Step 3: Determine meeting type
    const meetingType = determineMeetingType({ meetingId, participants });

    // Step 4: Prepare meeting data
    const meetingData: MeetingSummaryData = {
      meetingId,
      participants,
      transcript,
      meetingType,
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : new Date()
    };

    // Step 5: Generate and send summary
    const result = await generateAndSendMeetingSummary(meetingData);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Failed to generate meeting summary',
          details: result.error 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: summaryMessage,
      summary: result.summary,
      keyPoints: result.keyPoints,
      actionItems: result.actionItems,
      nextSteps: result.nextSteps,
      emailSent: result.emailSent
    });

  } catch (error) {
    console.error('Error in automatic meeting summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mortgage-assistant/auto-summary
 * Test endpoint for automatic summary generation
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: 'Automatic meeting summary endpoint is working',
      testData: {
        meetingId: 'test-meeting-123',
        participants: [
          { userId: 'user_123', name: 'John Smith', email: 'john@email.com', role: 'client' },
          { userId: 'user_456', name: 'Sarah Johnson', email: 'sarah@mortgage.com', role: 'advisor' }
        ],
        meetingType: 'mortgage_consultation',
        features: [
          'Automatic transcript capture',
          'AI-powered summarization',
          'Email delivery to participants',
          'Key points extraction',
          'Action items identification',
          'Next steps generation'
        ]
      }
    });

  } catch (error) {
    console.error('Error in auto-summary test endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 