import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { verifyEmailConfig, testMortgageSummaryEmail } from '@/lib/email';

/**
 * GET /api/test-email
 * Test email configuration and send a test email
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🧪 Testing email configuration...');

    // Step 1: Verify email configuration
    const configResult = await verifyEmailConfig();
    
    if (!configResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Email configuration failed',
        details: configResult.error,
        message: 'Please check your EMAIL_* environment variables in .env.local'
      }, { status: 500 });
    }

    // Step 2: Send test email
    console.log('🧪 Sending test email...');
    const testResult = await testMortgageSummaryEmail();

    if (!testResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Test email sending failed',
        details: testResult.error,
        message: 'Email configuration is valid but sending failed'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Email configuration and test email successful',
      messageId: testResult.messageId,
      recipients: testResult.recipients
    });

  } catch (error) {
    console.error('Error in email test:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
