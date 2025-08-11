import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { 
  generateAuthUrl, 
  exchangeCodeForTokens, 
  createMortgageFollowUpMeeting,
  CalendarEventDetails 
} from '@/lib/google-calendar';

/**
 * GET /api/mortgage-assistant/calendar/auth
 * Generates Google OAuth 2.0 authorization URL
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'auth') {
      // Generate OAuth URL
      const authUrl = generateAuthUrl();
      
      return NextResponse.json({
        success: true,
        authUrl,
        message: 'Google OAuth authorization URL generated'
      });
    }

    // Default response for GET requests
    return NextResponse.json({
      success: true,
      message: 'Google Calendar integration endpoint',
      availableActions: ['auth', 'callback', 'create-event']
    });

  } catch (error) {
    console.error('Error in Google Calendar auth endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mortgage-assistant/calendar/callback
 * Handles OAuth callback and token exchange
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code, action } = body;

    if (action === 'callback' && code) {
      // Exchange authorization code for tokens
      const tokens = await exchangeCodeForTokens(code);
      
      return NextResponse.json({
        success: true,
        message: 'OAuth tokens obtained successfully',
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          scope: tokens.scope,
          token_type: tokens.token_type
        }
      });
    }

    if (action === 'create-event') {
      const { 
        eventDetails, 
        accessToken,
        summary,
        clientEmail,
        advisorEmail 
      } = body;

      if (!accessToken) {
        return NextResponse.json(
          { error: 'Access token is required' },
          { status: 400 }
        );
      }

      let result;

      if (summary && clientEmail && advisorEmail) {
        // Create follow-up meeting based on mortgage summary
        result = await createMortgageFollowUpMeeting(
          summary,
          clientEmail,
          advisorEmail,
          accessToken
        );
      } else if (eventDetails) {
        // Create custom calendar event
        const calendarEventDetails: CalendarEventDetails = {
          summary: eventDetails.summary,
          description: eventDetails.description,
          startTime: new Date(eventDetails.startTime),
          endTime: new Date(eventDetails.endTime),
          attendees: eventDetails.attendees,
          location: eventDetails.location,
          reminders: eventDetails.reminders
        };

        const { createFollowUpMeeting } = await import('@/lib/google-calendar');
        result = await createFollowUpMeeting(calendarEventDetails, accessToken);
      } else {
        return NextResponse.json(
          { error: 'Either summary data or event details are required' },
          { status: 400 }
        );
      }

      if (!result.success) {
        return NextResponse.json(
          { 
            error: 'Failed to create calendar event',
            details: result.error 
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Calendar event created successfully',
        eventId: result.eventId,
        eventLink: result.eventLink
      });
    }

    return NextResponse.json(
      { error: 'Invalid action specified' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in Google Calendar callback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 