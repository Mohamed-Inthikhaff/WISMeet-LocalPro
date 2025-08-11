import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { summarizeTranscript, GeminiSummaryRequest } from '@/lib/gemini';

/**
 * POST /api/mortgage-assistant/summarize
 * Summarizes mortgage meeting transcript using Gemini AI
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { transcript, meetingType, clientName, advisorName } = body;

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    // Validate meeting type
    const validMeetingTypes = ['mortgage_consultation', 'loan_application', 'refinance', 'general'];
    if (meetingType && !validMeetingTypes.includes(meetingType)) {
      return NextResponse.json(
        { error: 'Invalid meeting type' },
        { status: 400 }
      );
    }

    // Create summary request
    const summaryRequest: GeminiSummaryRequest = {
      transcript,
      meetingType: meetingType || 'mortgage_consultation',
      clientName,
      advisorName
    };

    // Get summary from Gemini AI
    const summaryResult = await summarizeTranscript(summaryRequest);

    if (!summaryResult.success) {
      return NextResponse.json(
        { 
          error: 'Failed to summarize transcript',
          details: summaryResult.error 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      summary: summaryResult.summary,
      keyPoints: summaryResult.keyPoints,
      actionItems: summaryResult.actionItems,
      nextSteps: summaryResult.nextSteps,
      meetingType: summaryRequest.meetingType
    });

  } catch (error) {
    console.error('Error in mortgage assistant summarize:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mortgage-assistant/summarize
 * Test endpoint for mortgage assistant summarization
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return test data for development
    return NextResponse.json({
      success: true,
      message: 'Mortgage Assistant Summarize endpoint is working',
      testData: {
        meetingType: 'mortgage_consultation',
        sampleTranscript: 'Advisor: Good morning, Mr. Johnson. Thank you for coming in today to discuss your mortgage options...',
        expectedResponse: {
          summary: 'Discussed mortgage options for home purchase',
          keyPoints: ['Loan amount discussed', 'Interest rate quoted', 'Documents required'],
          actionItems: ['Provide documentation', 'Complete application'],
          nextSteps: ['Follow up in 7 days', 'Schedule closing']
        }
      }
    });

  } catch (error) {
    console.error('Error in mortgage assistant test endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 