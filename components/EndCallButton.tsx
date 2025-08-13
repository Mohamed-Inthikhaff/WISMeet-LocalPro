'use client';

import { useCall, useCallStateHooks, CallingState } from '@stream-io/video-react-sdk';
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
      
      console.log('🚨 HOST: Starting bulletproof end call for everyone process...');
      
      // Step 1: Get all current participants for summary
      const allParticipants = call.state.participants.map(p => ({
        userId: p.userId,
        name: p.name || p.userId
        // ❌ REMOVED: email field - let server fetch real emails from database
      }));
      
      console.log('📋 Current participants:', allParticipants);
      
      // Step 2: Store meeting transcript
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
      
      // Step 3: Trigger automatic summary generation with all participants
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
          // ❌ REMOVED: participants array - let server fetch real participant data
          // The server-side getMeetingParticipants() will fetch real emails from database
        })
      });

      if (summaryResponse.ok) {
        const summaryResult = await summaryResponse.json();
        console.log('✅ Automatic summary generated:', summaryResult.message);
        
        if (summaryResult.emailSent) {
          console.log('📧 Summary email sent to participants');
        } else {
          console.warn('⚠️ Summary email was not sent');
        }
      } else {
        console.warn('⚠️ Automatic summary generation failed, but continuing with call end');
      }

      // Step 4: BULLETPROOF - Use Stream SDK's endCall method
      console.log('📞 BULLETPROOF: Ending call for everyone using Stream SDK...');
      
      try {
        // Check if call is already ended
        if ((call.state.callingState as any) === 'left') {
          console.log('⚠️ Call is already ended, navigating away...');
          router.push('/');
          return;
        }

        // Use Stream SDK endCall (this should end for everyone)
        console.log('🔄 Attempting call.endCall()...');
        await call.endCall();
        console.log('✅ Stream SDK endCall completed successfully');
        
        // Give Stream SDK time to process the end call
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Double-check if call ended
        if ((call.state.callingState as any) === 'left') {
          console.log('✅ Call successfully ended, navigating away...');
        } else {
          console.warn('⚠️ Call may not have ended properly, trying leave...');
          try {
            await call.leave();
            console.log('✅ Call leave completed');
          } catch (leaveError) {
            console.warn('⚠️ Call leave failed:', leaveError);
          }
        }
        
      } catch (endCallError) {
        console.warn('⚠️ Stream SDK endCall failed, trying alternative methods:', endCallError);
        
        // Method 2: Try to leave the call
        try {
          console.log('🔄 Attempting call.leave()...');
          await call.leave();
          console.log('✅ Call leave completed');
        } catch (leaveError) {
          console.warn('⚠️ Call leave also failed:', leaveError);
        }
      }
      
      // Step 5: Force navigation for all participants via socket (backup method)
      console.log('🌐 Broadcasting end call to all participants via socket...');
      
      try {
        // Send a socket message to force all participants to leave
        const socket = (window as any).meetingSocket;
        if (socket && socket.connected) {
          socket.emit('force_end_meeting', {
            meetingId: call.id,
            reason: 'host_ended_call'
          });
          console.log('✅ Socket broadcast sent');
        } else {
          console.warn('⚠️ Socket not available or not connected');
        }
      } catch (socketError) {
        console.warn('⚠️ Socket broadcast failed:', socketError);
      }
      
      // Step 6: Navigate away
      console.log('🏠 Navigating away from meeting...');
      router.push('/');
      
    } catch (error) {
      console.error('❌ Error during call end process:', error);
      
      // Still try to end the call even if summary fails
      try {
        console.log('🔄 Emergency call end attempt...');
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
      className="bg-red-500 hover:bg-red-600"
      disabled={isProcessing}
    >
      {isProcessing ? 'Processing Summary...' : 'End call for everyone'}
    </Button>
  );
};

export default EndCallButton;
