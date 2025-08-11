/**
 * Google Calendar API Integration for Mortgage Meeting Assistant Bot
 * Handles OAuth 2.0 authentication and calendar event creation
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface CalendarEventDetails {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

export interface CalendarEventResponse {
  success: boolean;
  eventId?: string;
  eventLink?: string;
  error?: string;
}

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date?: number;
}

/**
 * Creates OAuth2 client for Google Calendar API
 */
const createOAuth2Client = (): OAuth2Client => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth credentials not configured');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

/**
 * Generates OAuth 2.0 authorization URL
 */
export const generateAuthUrl = (): string => {
  const oauth2Client = createOAuth2Client();
  const scopes = process.env.GOOGLE_SCOPES?.split(' ') || [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
};

/**
 * Exchanges authorization code for access tokens
 */
export const exchangeCodeForTokens = async (code: string): Promise<OAuthTokens> => {
  const oauth2Client = createOAuth2Client();
  
  const { tokens } = await oauth2Client.getToken(code);
  
  if (!tokens.access_token) {
    throw new Error('Failed to obtain access token');
  }

  return tokens as OAuthTokens;
};

/**
 * Refreshes access token using refresh token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<OAuthTokens> => {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  const { credentials } = await oauth2Client.refreshAccessToken();
  
  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token');
  }

  return credentials as OAuthTokens;
};

/**
 * Creates a Google Calendar event with follow-up meeting details
 */
export const createFollowUpMeeting = async (
  eventDetails: CalendarEventDetails,
  accessToken: string
): Promise<CalendarEventResponse> => {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Format attendees
    const attendees = eventDetails.attendees.map(email => ({ email }));

    // Set up reminders
    const reminders = eventDetails.reminders || {
      useDefault: true,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 24 hours before
        { method: 'popup', minutes: 30 } // 30 minutes before
      ]
    };

    const event = {
      summary: eventDetails.summary,
      description: eventDetails.description,
      start: {
        dateTime: eventDetails.startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: eventDetails.endTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees,
      location: eventDetails.location,
      reminders,
      conferenceData: {
        createRequest: {
          requestId: `wismeet-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all'
    });

    if (!response.data.id) {
      throw new Error('Failed to create calendar event');
    }

    return {
      success: true,
      eventId: response.data.id,
      eventLink: response.data.htmlLink || response.data.hangoutLink || undefined
    };

  } catch (error) {
    console.error('Error creating calendar event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Creates a follow-up meeting based on mortgage meeting summary
 */
export const createMortgageFollowUpMeeting = async (
  summary: any,
  clientEmail: string,
  advisorEmail: string,
  accessToken: string
): Promise<CalendarEventResponse> => {
  try {
    // Determine follow-up timing based on action items
    const hasUrgentItems = summary.actionItems?.some((item: string) => 
      item.toLowerCase().includes('urgent') || 
      item.toLowerCase().includes('immediate') ||
      item.toLowerCase().includes('asap')
    );

    const hasDocumentationItems = summary.actionItems?.some((item: string) =>
      item.toLowerCase().includes('document') ||
      item.toLowerCase().includes('paperwork') ||
      item.toLowerCase().includes('form')
    );

    // Set follow-up timing
    let followUpDays = 7; // Default 1 week
    if (hasUrgentItems) {
      followUpDays = 2; // 2 days for urgent items
    } else if (hasDocumentationItems) {
      followUpDays = 5; // 5 days for documentation review
    }

    const startTime = new Date();
    startTime.setDate(startTime.getDate() + followUpDays);
    startTime.setHours(10, 0, 0, 0); // 10 AM

    const endTime = new Date(startTime);
    endTime.setHours(11, 0, 0, 0); // 1 hour duration

    const eventDetails: CalendarEventDetails = {
      summary: `Mortgage Follow-up: ${summary.keyPoints?.[0] || 'Review Meeting'}`,
      description: `Follow-up meeting to discuss:
      
Summary: ${summary.summary}

Key Points:
${summary.keyPoints?.map((point: string) => `• ${point}`).join('\n') || 'No key points available'}

Action Items:
${summary.actionItems?.map((item: string) => `• ${item}`).join('\n') || 'No action items available'}

Next Steps:
${summary.nextSteps?.map((step: string) => `• ${step}`).join('\n') || 'No next steps available'}`,
      startTime,
      endTime,
      attendees: [clientEmail, advisorEmail],
      location: 'WISMeet Video Conference',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours
          { method: 'popup', minutes: 30 } // 30 minutes
        ]
      }
    };

    return await createFollowUpMeeting(eventDetails, accessToken);

  } catch (error) {
    console.error('Error creating mortgage follow-up meeting:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Gets user's calendar events for a specific time range
 */
export const getCalendarEvents = async (
  accessToken: string,
  startDate: Date,
  endDate: Date
): Promise<any[]> => {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    return response.data.items || [];

  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
};

/**
 * Test function to verify Google Calendar integration
 */
export const testGoogleCalendarIntegration = async (accessToken: string): Promise<CalendarEventResponse> => {
  const testEventDetails: CalendarEventDetails = {
    summary: 'Test Mortgage Follow-up Meeting',
    description: 'This is a test meeting to verify Google Calendar integration.',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // Tomorrow + 1 hour
    attendees: ['test@example.com'],
    location: 'WISMeet Test Meeting',
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 30 }
      ]
    }
  };

  return await createFollowUpMeeting(testEventDetails, accessToken);
}; 