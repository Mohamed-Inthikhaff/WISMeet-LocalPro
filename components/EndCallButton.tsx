'use client';

import { useCall, useCallStateHooks } from '@stream-io/video-react-sdk';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { transcriptContext } from '@/lib/transcript-context';

const EndCallButton = () => {
  const call = useCall();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!call)
    throw new Error(
      'useStreamCall must be used within a StreamCall component.',
    );

  // https://getstream.io/video/docs/react/guides/call-and-participant-state/#participant-state-3
  const { useLocalParticipant } = useCallStateHooks();
  const localParticipant = useLocalParticipant();

  const isMeetingOwner =
    localParticipant &&
    call.state.createdBy &&
    localParticipant.userId === call.state.createdBy.id;

  if (!isMeetingOwner) return null;

  const endCall = async () => {
    try {
      setIsProcessing(true);
      
      // Step 1: Store meeting transcript
      console.log('📝 Storing meeting transcript...');
      
      // Get transcript from the context (populated by MeetingTranscription component)
      const realTranscript = transcriptContext.getTranscript(call.id);
      
      const transcriptResponse = await fetch('/api/meetings/transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId: call.id,
          transcript: realTranscript || 'No transcript available for this meeting.'
        })
      });

      if (!transcriptResponse.ok) {
        console.warn('⚠️ Failed to store transcript, but continuing with summary');
      } else {
        console.log('✅ Transcript stored successfully');
      }
      
      // Step 2: Trigger automatic summary generation
      console.log('🤖 Triggering automatic meeting summary...');
      
      const summaryResponse = await fetch('/api/mortgage-assistant/auto-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId: call.id,
          startTime: call.state.createdAt,
          endTime: new Date().toISOString(),
          triggerType: 'manual_end'
        })
      });

      if (summaryResponse.ok) {
        const summaryResult = await summaryResponse.json();
        console.log('✅ Automatic summary generated:', summaryResult.message);
        
        if (summaryResult.emailSent) {
          console.log('📧 Summary email sent to participants');
        }
      } else {
        console.warn('⚠️ Automatic summary generation failed, but continuing with call end');
      }

      // Step 2: End the call
      await call.endCall();
      
      // Step 3: Navigate away
      router.push('/');
      
    } catch (error) {
      console.error('❌ Error during call end process:', error);
      
      // Still end the call even if summary fails
      try {
        await call.endCall();
        router.push('/');
      } catch (endCallError) {
        console.error('❌ Failed to end call:', endCallError);
        router.push('/');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button 
      onClick={endCall} 
      className="bg-red-500"
      disabled={isProcessing}
    >
      {isProcessing ? 'Processing Summary...' : 'End call for everyone'}
    </Button>
  );
};

export default EndCallButton;
