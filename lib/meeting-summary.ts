/**
 * Automatic Meeting Summary System
 * Handles automatic summary generation and email sending when meetings end
 */

import { summarizeTranscript } from './gemini';
import { sendMortgageSummaryEmail } from './email';
import { getDb, COLLECTIONS } from './mongodb';
import { getUserEmail, getUserName } from './user-management';

export interface MeetingSummaryData {
  meetingId: string;
  participants: Array<{
    userId: string;
    name: string;
    email: string;
    role: 'client' | 'advisor' | 'participant';
  }>;
  transcript: string;
  meetingType: 'mortgage_consultation' | 'loan_application' | 'refinance' | 'general';
  startTime: Date;
  endTime: Date;
}

export interface SummaryResult {
  success: boolean;
  summary?: string;
  keyPoints?: string[];
  actionItems?: string[];
  nextSteps?: string[];
  emailSent?: boolean;
  error?: string;
}

/**
 * Generates and sends meeting summary automatically
 */
export const generateAndSendMeetingSummary = async (
  meetingData: MeetingSummaryData
): Promise<SummaryResult> => {
  try {
    console.log('🤖 Starting automatic meeting summary generation...');

    // Step 1: Generate AI summary
    const aiSummary = await summarizeTranscript({
      transcript: meetingData.transcript,
      meetingType: meetingData.meetingType,
      clientName: extractClientName(meetingData.participants),
      advisorName: extractAdvisorName(meetingData.participants)
    });

    if (!aiSummary.success) {
      throw new Error(`AI summarization failed: ${aiSummary.error}`);
    }

    console.log('✅ AI summary generated successfully');

    // Step 2: Extract participant emails
    const clientEmail = extractClientEmail(meetingData.participants);
    const advisorEmail = extractAdvisorEmail(meetingData.participants);

    if (!clientEmail || !advisorEmail) {
      console.warn('⚠️ Missing participant emails, skipping email send');
      return {
        success: true,
        summary: aiSummary.summary,
        keyPoints: aiSummary.keyPoints,
        actionItems: aiSummary.actionItems,
        nextSteps: aiSummary.nextSteps,
        emailSent: false
      };
    }

    // Step 3: Send summary email
    const emailResult = await sendMortgageSummaryEmail({
      clientName: extractClientName(meetingData.participants),
      advisorName: extractAdvisorName(meetingData.participants),
      meetingDate: meetingData.startTime,
      summary: aiSummary.summary || '',
      keyPoints: aiSummary.keyPoints || [],
      actionItems: aiSummary.actionItems || [],
      nextSteps: aiSummary.nextSteps || [],
      meetingType: meetingData.meetingType,
      clientEmail,
      advisorEmail
    });

    if (!emailResult.success) {
      console.error('❌ Failed to send summary email:', emailResult.error);
      return {
        success: true,
        summary: aiSummary.summary,
        keyPoints: aiSummary.keyPoints,
        actionItems: aiSummary.actionItems,
        nextSteps: aiSummary.nextSteps,
        emailSent: false,
        error: `Summary generated but email failed: ${emailResult.error}`
      };
    }

    console.log('✅ Summary email sent successfully');

    return {
      success: true,
      summary: aiSummary.summary,
      keyPoints: aiSummary.keyPoints,
      actionItems: aiSummary.actionItems,
      nextSteps: aiSummary.nextSteps,
      emailSent: true
    };

  } catch (error) {
    console.error('❌ Error in automatic meeting summary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Extracts client name from participants
 */
const extractClientName = (participants: MeetingSummaryData['participants']): string => {
  const client = participants.find(p => p.role === 'client');
  return client?.name || 'Client';
};

/**
 * Extracts advisor name from participants
 */
const extractAdvisorName = (participants: MeetingSummaryData['participants']): string => {
  const advisor = participants.find(p => p.role === 'advisor');
  return advisor?.name || 'Mortgage Advisor';
};

/**
 * Extracts client email from participants
 */
const extractClientEmail = (participants: MeetingSummaryData['participants']): string | null => {
  const client = participants.find(p => p.role === 'client');
  return client?.email || null;
};

/**
 * Extracts advisor email from participants
 */
const extractAdvisorEmail = (participants: MeetingSummaryData['participants']): string | null => {
  const advisor = participants.find(p => p.role === 'advisor');
  return advisor?.email || null;
};

/**
 * Simulates transcript capture (replace with actual implementation)
 */
export const captureMeetingTranscript = async (meetingId: string): Promise<string> => {
  try {
    console.log(`🎤 Capturing real transcript for meeting: ${meetingId}`);
    
    // Get the transcript from the meeting room state
    // This will be populated by the MeetingTranscription component
    const db = await getDb();
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);
    
    const meeting = await meetingsCollection.findOne({ meetingId });
    
    console.log(`🔍 Meeting data found:`, {
      meetingId: meeting?.meetingId,
      hasTranscript: !!meeting?.transcript,
      transcriptLength: meeting?.transcript?.length || 0,
      transcriptPreview: meeting?.transcript?.substring(0, 100) || 'N/A'
    });
    
    if (meeting && meeting.transcript && meeting.transcript.trim() !== 'No transcript available for this meeting.') {
      console.log(`✅ Found real transcript for meeting: ${meetingId} (${meeting.transcript.length} characters)`);
      console.log(`📝 Transcript content: "${meeting.transcript}"`);
      return meeting.transcript;
    }
    
    // If no transcript found, return a minimal but real transcript
    console.log(`⚠️ No real transcript found for meeting: ${meetingId}, returning minimal transcript`);
    return 'Meeting was conducted but no audio transcript was captured. This may be due to microphone permissions or technical issues.';
  } catch (error) {
    console.error('❌ Error capturing meeting transcript:', error);
    return 'Meeting transcript unavailable due to technical error.';
  }
};

/**
 * Gets real meeting participants with their roles and emails from database
 */
export const getMeetingParticipants = async (meetingId: string): Promise<MeetingSummaryData['participants']> => {
  try {
    console.log(`🔍 Fetching real participants for meeting: ${meetingId}`);
    
    // Get meeting data from database
    const db = await getDb();
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);
    
    const meeting = await meetingsCollection.findOne({ meetingId });
    
    console.log(`📋 Meeting data:`, {
      meetingId: meeting?.meetingId,
      title: meeting?.title,
      hostId: meeting?.hostId,
      participants: meeting?.participants,
      participantCount: meeting?.participants?.length || 0
    });
    
    if (!meeting) {
      console.warn(`⚠️ Meeting ${meetingId} not found in database, using fallback data`);
      return getFallbackParticipants();
    }
    
    console.log(`📋 Found meeting: ${meeting.title} with ${meeting.participants?.length || 0} participants`);
    
    // Get real participant data with deduplication
    const participants: MeetingSummaryData['participants'] = [];
    const seenEmails = new Set<string>(); // Track emails to avoid duplicates
    
    // Add host (advisor) first
    if (meeting.hostId) {
      console.log(`👤 Looking up host data for: ${meeting.hostId}`);
      const hostUser = await getUserData(meeting.hostId);
      if (hostUser) {
        console.log(`✅ Found host data:`, hostUser);
        participants.push({
          userId: meeting.hostId,
          name: hostUser.name || 'Meeting Host',
          email: hostUser.email || '',
          role: 'advisor' as const
        });
        seenEmails.add(hostUser.email.toLowerCase());
      } else {
        console.warn(`⚠️ Host data not found for: ${meeting.hostId}`);
      }
    }
    
    // Add other participants (clients) with deduplication
    if (meeting.participants && Array.isArray(meeting.participants)) {
      for (const participant of meeting.participants) {
        // Skip if already added as host
        if (participant === meeting.hostId) continue;
        
        console.log(`👤 Processing participant: ${participant}`);
        
        let participantEmail = '';
        let participantName = '';
        
        // Check if participant is an email address or user ID
        if (participant.includes('@')) {
          // It's an email address - use it directly
          participantEmail = participant;
          participantName = participant.split('@')[0]; // Use email prefix as name
          console.log(`📧 Participant is email: ${participant}`);
        } else {
          // It's a user ID - look up user data
          console.log(`👤 Looking up participant data for: ${participant}`);
          const participantUser = await getUserData(participant);
          if (participantUser) {
            console.log(`✅ Found participant data:`, participantUser);
            participantEmail = participantUser.email;
            participantName = participantUser.name || 'Meeting Participant';
          } else {
            console.warn(`⚠️ Participant data not found for: ${participant}`);
            continue; // Skip this participant if no data found
          }
        }
        
        // Deduplicate based on email (case-insensitive)
        const emailLower = participantEmail.toLowerCase();
        if (seenEmails.has(emailLower)) {
          console.log(`🔄 Skipping duplicate participant with email: ${participantEmail}`);
          continue;
        }
        
        // Add participant if not duplicate
        participants.push({
          userId: participant.includes('@') ? `email_${participant}` : participant,
          name: participantName,
          email: participantEmail,
          role: 'client' as const
        });
        seenEmails.add(emailLower);
        console.log(`✅ Added participant: ${participantName} (${participantEmail})`);
      }
    }
    
    console.log(`✅ Found ${participants.length} unique participants with emails:`, participants);
    
    // If no real participants found, use fallback
    if (participants.length === 0) {
      console.warn(`⚠️ No real participants found, using fallback data`);
      return getFallbackParticipants();
    }
    
    return participants;
    
  } catch (error) {
    console.error('❌ Error getting meeting participants:', error);
    console.log('🔄 Using fallback participant data');
    return getFallbackParticipants();
  }
};

/**
 * Gets user data from database or fallback mapping
 */
const getUserData = async (userId: string): Promise<{ name: string; email: string } | null> => {
  try {
    const [email, name] = await Promise.all([
      getUserEmail(userId),
      getUserName(userId)
    ]);
    
    if (email && name) {
      return { name, email };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

/**
 * Fallback participant data when database lookup fails
 */
const getFallbackParticipants = (): MeetingSummaryData['participants'] => {
  console.log('🔄 Using fallback participant data');
  return [
    {
      userId: 'user_123',
      name: 'Mohamed Inthikhaff',
      email: 'mhdinthikaff@gmail.com',
      role: 'client' as const
    },
    {
      userId: 'user_456',
      name: 'WIS Mortgages',
      email: 'mohamed.inthikhaff@wismorgages.co.uk',
      role: 'advisor' as const
    }
  ];
};

/**
 * Determines meeting type based on meeting data
 */
export const determineMeetingType = (meetingData: any): MeetingSummaryData['meetingType'] => {
  // TODO: Implement logic to determine meeting type
  // For now, default to mortgage consultation
  return 'mortgage_consultation';
};



