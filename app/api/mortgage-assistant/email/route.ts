import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  sendMortgageSummaryEmail, 
  sendSummaryEmail,
  testMortgageSummaryEmail 
} from '@/lib/email';

/**
 * POST /api/mortgage-assistant/email/summary
 * Sends mortgage meeting summary email to participants
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      action,
      summaryData,
      toEmails,
      subject,
      htmlContent 
    } = body;

    if (action === 'send-summary') {
      // Send mortgage meeting summary email
      if (!summaryData) {
        return NextResponse.json(
          { error: 'Summary data is required' },
          { status: 400 }
        );
      }

      const {
        clientName,
        advisorName,
        meetingDate,
        summary,
        keyPoints,
        actionItems,
        nextSteps,
        meetingType,
        clientEmail,
        advisorEmail
      } = summaryData;

      // Validate required fields
      if (!clientName || !advisorName || !meetingDate || !summary || !clientEmail || !advisorEmail) {
        return NextResponse.json(
          { error: 'Missing required summary data fields' },
          { status: 400 }
        );
      }

      const emailResult = await sendMortgageSummaryEmail({
        clientName,
        advisorName,
        meetingDate: new Date(meetingDate),
        summary,
        keyPoints: keyPoints || [],
        actionItems: actionItems || [],
        nextSteps: nextSteps || [],
        meetingType: meetingType || 'Mortgage Meeting',
        clientEmail,
        advisorEmail
      });

      if (!emailResult.success) {
        return NextResponse.json(
          { 
            error: 'Failed to send summary email',
            details: emailResult.error 
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Mortgage summary email sent successfully',
        messageId: emailResult.messageId,
        recipients: emailResult.recipients
      });
    }

    if (action === 'send-custom') {
      // Send custom summary email
      if (!toEmails || !subject || !htmlContent) {
        return NextResponse.json(
          { error: 'toEmails, subject, and htmlContent are required' },
          { status: 400 }
        );
      }

      const emailResult = await sendSummaryEmail(toEmails, subject, htmlContent);

      if (!emailResult.success) {
        return NextResponse.json(
          { 
            error: 'Failed to send custom email',
            details: emailResult.error 
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Custom email sent successfully',
        messageId: emailResult.messageId,
        recipients: emailResult.recipients
      });
    }

    return NextResponse.json(
      { error: 'Invalid action specified' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in mortgage assistant email endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mortgage-assistant/email/test
 * Test endpoint for email functionality
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'test') {
      // Test email functionality
      const testResult = await testMortgageSummaryEmail();
      
      return NextResponse.json({
        success: true,
        message: 'Email test completed',
        testResult
      });
    }

    // Default response
    return NextResponse.json({
      success: true,
      message: 'Mortgage Assistant Email endpoint',
      availableActions: ['send-summary', 'send-custom', 'test'],
      sampleSummaryData: {
        clientName: 'John Smith',
        advisorName: 'Sarah Johnson',
        meetingDate: new Date().toISOString(),
        summary: 'Discussed mortgage options for home purchase',
        keyPoints: ['Loan amount: $350,000', 'Interest rate: 6.5%', 'Down payment: 20%'],
        actionItems: ['Provide documentation', 'Complete application'],
        nextSteps: ['Follow up in 7 days', 'Schedule closing'],
        meetingType: 'Mortgage Consultation',
        clientEmail: 'john.smith@example.com',
        advisorEmail: 'sarah.johnson@mortgagecompany.com'
      }
    });

  } catch (error) {
    console.error('Error in mortgage assistant email test endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 