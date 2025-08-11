'use client';

/* eslint-disable camelcase */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import HomeCard from './HomeCard';
import MeetingModal from './MeetingModal';
import ScheduleMeetingModal from './ScheduleMeetingModal';
import { Call, useStreamVideoClient } from '@stream-io/video-react-sdk';
import { useUser } from '@clerk/nextjs';
import Loader from './Loader';
import { Textarea } from './ui/textarea';
import ReactDatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useToast } from './ui/use-toast';
import { Input } from './ui/input';
import { getMeetingLink, sanitizeCallId } from '@/lib/utils';
import { logOnce } from '@/lib/logger';

interface MeetingData {
  title: string;
  guests: string[];
  date: Date;
  time: Date;
  timezone: string;
  notificationTime: number;
  description: string;
}

const initialValues = {
  dateTime: new Date(),
  description: '',
  link: '',
};

const MeetingTypeList = () => {
  const router = useRouter();
  const [meetingState, setMeetingState] = useState<
    'isScheduleMeeting' | 'isJoiningMeeting' | 'isInstantMeeting' | undefined
  >(undefined);
  const [values, setValues] = useState(initialValues);
  const [callDetail, setCallDetail] = useState<Call>();
  const [isCreating, setIsCreating] = useState(false);
  const client = useStreamVideoClient();
  const { user } = useUser();
  const { toast } = useToast();

  const createMeeting = async (meetingData?: MeetingData) => {
    if (!client || !user) {
      toast({
        title: 'Error',
        description: 'Please sign in to create a meeting',
        variant: 'destructive'
      });
      return;
    }

    setIsCreating(true);

    try {
      logOnce('createMeeting-start', 'createMeeting: Starting meeting creation...', {
        meetingState,
        meetingData,
        userId: user.id
      });

      // Create the call with a unique ID
      const callId = meetingData?.title 
        ? sanitizeCallId(meetingData.title) 
        : `instant-${Date.now()}`;
      logOnce(`createMeeting-call-${callId}`, 'createMeeting: Creating call with ID:', callId);
      
      // Don't await client.call() - use the pattern from requirements
      const call = client.call('default', callId);
      
      // Ensure the call is properly initialized with getOrCreate
      await call.getOrCreate();

      try {
        await fetch('/api/chat/meetings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meetingId: call.id,
            title: meetingData?.title || `Instant Meeting ${new Date().toLocaleString()}`,
            participants: [] // server will add the host; others will be added on join
          })
        });
      } catch (e) {
        console.warn('POST /api/chat/meetings upsert failed (non-fatal):', e);
      }

      logOnce(`createMeeting-success-${call.id}`, 'createMeeting: Meeting created successfully, call ID:', call.id);
      logOnce(`createMeeting-details-${call.id}`, 'createMeeting: Call details:', { 
        type: call.type, 
        state: call.state 
      });

      // Save scheduled meeting to our database if it's a scheduled meeting
      if (meetingData && meetingData.date && meetingData.time) {
        try {
          const startTime = new Date(
            meetingData.date.getFullYear(), 
            meetingData.date.getMonth(), 
            meetingData.date.getDate(),
            meetingData.time.getHours(), 
            meetingData.time.getMinutes()
          );

          const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

          const response = await fetch('/api/meetings/scheduled', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              meetingId: call.id,
              title: meetingData.title,
              description: meetingData.description,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              participants: meetingData.guests
            }),
          });

          if (response.ok) {
            console.log('Scheduled meeting saved to database');
            
            // Send invitation emails to guests
            if (meetingData.guests && meetingData.guests.length > 0) {
              try {
                const invitationResponse = await fetch('/api/meetings/send-invitations', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    meetingId: call.id,
                    title: meetingData.title,
                    description: meetingData.description,
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                    guestEmails: meetingData.guests,
                    hostName: user.fullName || user.emailAddresses[0].emailAddress
                  }),
                });

                if (invitationResponse.ok) {
                  const invitationResult = await invitationResponse.json();
                  console.log('Invitation emails sent:', invitationResult);
                  
                  // Show success message with email statistics
                  if (invitationResult.statistics) {
                    const { successful, failed, total } = invitationResult.statistics;
                    if (successful > 0) {
                      toast({
                        title: 'Meeting Scheduled & Invitations Sent',
                        description: `Meeting created successfully! ${successful}/${total} invitation emails sent successfully.${failed > 0 ? ` ${failed} failed.` : ''}`,
                      });
                    } else {
                      toast({
                        title: 'Meeting Scheduled',
                        description: 'Meeting created successfully, but invitation emails failed to send. Please check your email configuration.',
                        variant: 'destructive'
                      });
                    }
                  }
                } else {
                  console.error('Failed to send invitation emails');
                  toast({
                    title: 'Meeting Scheduled',
                    description: 'Meeting created successfully, but invitation emails failed to send. Please check your email configuration.',
                    variant: 'destructive'
                  });
                }
              } catch (emailError) {
                console.error('Error sending invitation emails:', emailError);
                toast({
                  title: 'Meeting Scheduled',
                  description: 'Meeting created successfully, but invitation emails failed to send. Please check your email configuration.',
                  variant: 'destructive'
                });
              }
            }
          } else {
            console.error('Failed to save scheduled meeting to database');
          }
        } catch (error) {
          console.error('Error saving scheduled meeting:', error);
        }
      }

      setCallDetail(call);
      
      if (meetingState === 'isInstantMeeting') {
        logOnce(`redirect-${call.id}`, 'createMeeting: Redirecting to meeting room:', `/meeting/${call.id}`);
        router.push(`/meeting/${call.id}`);
      } else {
        // For scheduled meetings, show success message and close modal
        toast({
          title: 'Success',
          description: 'Meeting scheduled successfully! Invitation emails have been sent to your guests.',
        });
        setMeetingState(undefined);
      }

    } catch (error) {
      console.error('Error creating meeting:', error);
      console.error('Error details:', {
        client: !!client,
        user: !!user,
        userId: user?.id,
        meetingState,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorKeys: error instanceof Error ? Object.keys(error) : []
      });
      toast({ 
        title: 'Error',
        description: 'Failed to create meeting. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinMeeting = () => {
    if (!values.link) {
      toast({
        title: 'Error',
        description: 'Please enter a meeting link',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Robust join link parsing
      let meetingId = values.link.trim();
      
      // If it's a valid URL, extract the last path segment
      if (meetingId.startsWith('http://') || meetingId.startsWith('https://')) {
        try {
          const url = new URL(meetingId);
          const pathSegments = url.pathname.split('/').filter(Boolean);
          meetingId = pathSegments[pathSegments.length - 1] || meetingId;
        } catch (urlError) {
          console.warn('Invalid URL format, treating as raw ID');
        }
      } else {
        // Remove any trailing slashes and treat as raw ID
        meetingId = meetingId.replace(/\/+$/, '');
      }
      
      if (!meetingId) {
        throw new Error('Invalid meeting link');
      }
      
      router.push(`/meeting/${meetingId}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Invalid meeting link. Please check and try again.',
        variant: 'destructive'
      });
    }
  };

  const handleCopyMeetingLink = async () => {
    if (!callDetail) return;
    
    const meetingLink = getMeetingLink(callDetail.id);
    
    try {
      await navigator.clipboard.writeText(meetingLink);
      toast({ 
        title: 'Success',
        description: 'Meeting link copied to clipboard'
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      
      // Fallback: show the link in a toast
      toast({
        title: 'Meeting Link',
        description: `Copy this link: ${meetingLink}`,
        duration: 10000
      });
    }
  };

  if (!client || !user) return <Loader />;

  const meetingLink = callDetail ? getMeetingLink(callDetail.id) : '';

  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      <HomeCard
        img="/icons/add-meeting.svg"
        title="Start Instant Meeting"
        description="Launch a professional HD video conference instantly with advanced collaboration tools and secure encryption."
        handleClick={() => setMeetingState('isInstantMeeting')}
        features={[
          "HD Video & Audio",
          "Screen Sharing",
          "Live Captions",
          "Recording"
        ]}
        stats={[
          { label: 'Quality', value: 'HD' },
          { label: 'Latency', value: '50ms' }
        ]}
        badge="Recommended"
      />
      <HomeCard
        img="/icons/join-meeting.svg"
        title="Join Meeting"
        description="Connect to an existing meeting seamlessly with one click. No downloads required, just pure browser-based HD quality."
        className="bg-gradient-to-br from-blue-600/5 to-blue-700/5"
        handleClick={() => setMeetingState('isJoiningMeeting')}
        features={[
          "Quick Join",
          "Guest Access",
          "Meeting Preview",
          "Chat Support"
        ]}
        stats={[
          { label: 'Active', value: '1.2k' },
          { label: 'Success', value: '99%' }
        ]}
      />
      <HomeCard
        img="/icons/schedule.svg"
        title="Schedule Meeting"
        description="Plan ahead with smart scheduling, calendar integration, automated reminders, and recurring meeting support."
        className="bg-gradient-to-br from-purple-600/5 to-purple-700/5"
        handleClick={() => setMeetingState('isScheduleMeeting')}
        features={[
          "Calendar Sync",
          "Reminders",
          "Recurring",
          "Time Zones"
        ]}
        stats={[
          { label: 'Today', value: '89' },
          { label: 'Week', value: '412' }
        ]}
        badge="Pro"
      />
      <HomeCard
        img="/icons/recordings.svg"
        title="Meeting Library"
        description="Access your secure cloud recordings with automatic transcription, analytics, and easy sharing options."
        className="bg-gradient-to-br from-amber-600/5 to-amber-700/5"
        handleClick={() => router.push('/recordings')}
        features={[
          "Cloud Storage",
          "Transcripts",
          "Analytics",
          "Sharing"
        ]}
        stats={[
          { label: 'Stored', value: '156' },
          { label: 'Hours', value: '380' }
        ]}
      />

      {!callDetail ? (
        <ScheduleMeetingModal
          isOpen={meetingState === 'isScheduleMeeting'}
          onClose={() => setMeetingState(undefined)}
          onSchedule={createMeeting}
        />
      ) : (
        <MeetingModal
          isOpen={meetingState === 'isScheduleMeeting'}
          onClose={() => {
            setMeetingState(undefined);
            setCallDetail(undefined);
            setValues(initialValues);
          }}
          title="Meeting Scheduled!"
          description="Your meeting has been scheduled successfully"
          handleClick={handleCopyMeetingLink}
          image="/icons/checked.svg"
          buttonIcon="/icons/copy.svg"
          buttonText="Copy Meeting Link"
        />
      )}

      <MeetingModal
        isOpen={meetingState === 'isJoiningMeeting'}
        onClose={() => {
          setMeetingState(undefined);
          setValues(initialValues);
        }}
        title="Join Meeting"
        description="Enter the meeting link to join"
        buttonText="Join Meeting"
        handleClick={handleJoinMeeting}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">
            Meeting Link
          </label>
          <Input
            placeholder="Paste meeting link here..."
            value={values.link}
            onChange={(e) => setValues({ ...values, link: e.target.value })}
            className="bg-gray-800/50 border-gray-700 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </MeetingModal>

      <MeetingModal
        isOpen={meetingState === 'isInstantMeeting'}
        onClose={() => setMeetingState(undefined)}
        title="Start Instant Meeting"
        description="Create a new meeting and join immediately"
        buttonText={isCreating ? 'Creating Meeting...' : 'Start Meeting'}
        handleClick={createMeeting}
      />
    </section>
  );
};

export default MeetingTypeList;
