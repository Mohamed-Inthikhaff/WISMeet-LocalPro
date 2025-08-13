'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useCall,
  useCallStateHooks,
  CallControls,
  CallParticipantsList,
  CallStatsButton,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
} from '@stream-io/video-react-sdk';
import { useUser } from '@clerk/nextjs';
import { createSocket } from '@/lib/socket-client';
import { Users, LayoutList, X, ChevronLeft, Video, VideoOff, Mic, MicOff, MessageSquare } from 'lucide-react';
import { MediaBusProvider } from './MediaBusProvider';
import { USE_CUSTOM_GRID, ENABLE_STABLE_SCREENSHARE } from '@/constants/featureFlags';
import ProParticipantsGrid from './ProParticipantsGrid';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import Loader from './Loader';
import EndCallButton from './EndCallButton';
import MeetingChat from './MeetingChat';
import MeetingTranscription from './MeetingTranscription';

import { cn } from '@/lib/utils';
import { useChat } from '@/hooks/useChat';
import { audioMonitor } from '@/lib/audio-monitor';
import { createAutomaticSummaryTriggers, AutomaticSummaryTriggers } from '@/lib/automatic-summary-triggers';

type CallLayoutType = 'grid' | 'speaker-left' | 'speaker-right';

const MeetingRoom = () => {
  const searchParams = useSearchParams();
  const isPersonalRoom = !!searchParams.get('personal');
  const router = useRouter();
  const { user } = useUser();

  // NUCLEAR SOLUTION: Use only stable refs for all logic state
  const layoutRef = useRef<CallLayoutType>('speaker-left');
  const showParticipantsRef = useRef(false);
  const showChatRef = useRef(false);
  const socketRef = useRef<any>(null);
  const meetingTranscriptRef = useRef('');
  const mountedRef = useRef(true);
  const meetingIdRef = useRef('');
  const readyForRoomSocketRef = useRef(false);
  const summaryTriggersRef = useRef<AutomaticSummaryTriggers | null>(null);
  const isMonitoringRef = useRef(false);
  const lastParticipantCountRef = useRef(0);
  const lastScreenShareStateRef = useRef(false);
  const lastCallingStateRef = useRef<CallingState | null>(null);

  // UI state only - no logic dependencies
  const [layout, setLayout] = useState<CallLayoutType>('speaker-left');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [meetingTranscript, setMeetingTranscript] = useState('');
  const [participantCount, setParticipantCount] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callingState, setCallingState] = useState<CallingState | null>(null);

  // NUCLEAR: Only use the call object directly, no hooks
  const call = useCall();

  // NUCLEAR: Global error handler for Stream SDK errors
  useEffect(() => {
    if (!call) return;

    const handleStreamError = (error: any) => {
      console.error('🚨 Stream SDK Error:', error);
      
      // If it's a "Cannot leave call that has already been left" error, navigate away
      if (error?.message?.includes('Cannot leave call that has already been left') ||
          error?.message?.includes('already been left')) {
        console.log('🚨 Detected "already left" error, navigating away...');
        router.push('/');
      }
    };

    // Add error handler to call object
    const anyCall = call as any;
    anyCall?.on?.('error', handleStreamError);
    anyCall?.on?.('callEnded', () => {
      console.log('📞 Call ended event received, navigating away...');
      router.push('/');
    });

    return () => {
      anyCall?.off?.('error', handleStreamError);
      anyCall?.off?.('callEnded', () => {});
    };
  }, [call, router]);

  // NUCLEAR: Manual state sync using direct call access
  useEffect(() => {
    if (!call || !mountedRef.current) return;

    const updateState = () => {
      if (!mountedRef.current) return;

      try {
        // Update calling state
        const currentCallingState = call.state.callingState;
        if (currentCallingState !== lastCallingStateRef.current) {
          lastCallingStateRef.current = currentCallingState;
          setCallingState(currentCallingState);
          
          console.log('📞 Call state changed:', currentCallingState);
          
          // NUCLEAR: Handle call end detection for automatic summary
          if (currentCallingState === CallingState.LEFT || 
              currentCallingState === 'unknown' || 
              currentCallingState === 'offline') {
            console.log('📞 Call ended/invalid detected, triggering automatic summary...');
          
          // Trigger automatic summary when call ends
          fetch('/api/mortgage-assistant/auto-summary', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              meetingId: call.id,
              startTime: call.state.createdAt,
              endTime: new Date().toISOString(),
              triggerType: 'call_ended'
            })
          }).then(response => {
            if (response.ok) {
              console.log('✅ Automatic summary generated when call ended');
            } else {
              console.warn('⚠️ Automatic summary generation failed when call ended');
            }
          }).catch(error => {
            console.error('❌ Error generating automatic summary when call ended:', error);
          });
          
          // Navigate away when call ends
          setTimeout(() => {
            console.log('🏠 Navigating away due to call end...');
            router.push('/');
          }, 2000); // Give time for summary to be generated
        }
      }

      // Update participant count
      const currentParticipantCount = call.state.participants.length;
      if (currentParticipantCount !== lastParticipantCountRef.current) {
        lastParticipantCountRef.current = currentParticipantCount;
        setParticipantCount(currentParticipantCount);
        

      }

      // Update screen sharing state
      const currentScreenShareState = call.state.participants.some(p => 
        p.publishedTracks.includes('screenshare' as any)
      );
      if (currentScreenShareState !== lastScreenShareStateRef.current) {
        lastScreenShareStateRef.current = currentScreenShareState;
        setIsScreenSharing(currentScreenShareState);
      }

      // Update meeting ID
      meetingIdRef.current = call.id;
      readyForRoomSocketRef.current = currentCallingState === CallingState.JOINED && Boolean(call.id);
      } catch (error) {
        console.warn('⚠️ Error updating call state:', error);
        // If we can't even access call state, the call is broken
        setTimeout(() => {
          console.log('🏠 Navigating away due to broken call state...');
          router.push('/');
        }, 1000);
      }
    };

    // Initial update
    updateState();

    // Set up interval for state updates (bypasses all hooks)
    const interval = setInterval(updateState, 1000);

    // BULLETPROOF: Additional check for call end detection
    const callEndCheckInterval = setInterval(() => {
      if (!mountedRef.current || !call) return;
      
      // Check if call is in a broken state
      try {
        const callState = call.state.callingState;
        const participantCount = call.state.participants.length;
        
        console.log('🔍 BULLETPROOF: Checking call state:', callState, 'participants:', participantCount);
        
        // If call state is left or no participants, force navigation
        if (callState === 'left' || 
            (callState === 'joined' && participantCount === 0) ||
            callState === 'unknown' ||
            callState === 'offline') {
          console.log('🚨 BULLETPROOF: Detected broken call state, navigating away...');
          router.push('/');
        }
        
        // Additional check: if call state is left, navigate away
        if (callState === 'left') {
          console.log('🚨 BULLETPROOF: Detected left call state, navigating away...');
          router.push('/');
        }
        
        // Check for SFU errors or disconnected state
        if (callState === 'unknown' || callState === 'offline') {
          console.log('🚨 BULLETPROOF: Detected disconnected call state, navigating away...');
          router.push('/');
        }

      } catch (error) {
        console.warn('⚠️ Error checking call state:', error);
        // If we can't even check the call state, the call is probably broken
        console.log('🚨 BULLETPROOF: Call state check failed, navigating away...');
        router.push('/');
      }
    }, 2000); // Check every 2 seconds (reduced from 3)

    return () => {
      clearInterval(interval);
      clearInterval(callEndCheckInterval);
    };
  }, [call?.id]); // Only depend on call ID changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // NUCLEAR: Global window error handler for Stream SDK errors
  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      const errorMessage = event.error?.message || event.message || '';
      
      // Check if it's a Stream SDK "already left" error
      if (errorMessage.includes('Cannot leave call that has already been left') ||
          errorMessage.includes('already been left')) {
        console.log('🚨 Window error handler: Detected "already left" error, navigating away...');
        event.preventDefault(); // Prevent the error from showing in console
        router.push('/');
      }
    };

    window.addEventListener('error', handleWindowError);
    
    return () => {
      window.removeEventListener('error', handleWindowError);
    };
  }, [router]);

  // NUCLEAR: Socket management with stable dependencies
  useEffect(() => {
    if (!user || !readyForRoomSocketRef.current || !mountedRef.current) return;

    // Clean up existing socket
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const s = createSocket();
    socketRef.current = s;

    // Store socket globally for EndCallButton access
    (window as any).meetingSocket = s;

    const handleConnect = () => {
      if (!mountedRef.current) return;
      console.log('MeetingRoom: Socket connected');
      console.log('🔌 Socket ID:', s.id);
      console.log('🔌 Meeting ID:', meetingIdRef.current);
      console.log('🔌 User ID:', user.id);
      console.log('🔌 User Name:', user.fullName || user.emailAddresses[0].emailAddress);

      s.emit('join_meeting', {
        meetingId: meetingIdRef.current,
        userId: user.id,
        userName: user.fullName || user.emailAddresses[0].emailAddress
      });
      console.log('🔌 Emitted join_meeting for meeting:', meetingIdRef.current);
      
      // Test socket connection by emitting a test event
      setTimeout(() => {
        if (s.connected) {
          console.log('🔌 Socket connection test: Sending test event...');
          s.emit('test_connection', { meetingId: meetingIdRef.current });
        }
      }, 1000);
    };

    const handleConnectError = (err: any) => {
      if (!mountedRef.current) return;
      console.error('MeetingRoom: Socket connect_error', err);
    };

    const handleDisconnect = (reason: string) => {
      if (!mountedRef.current) return;
      console.log('MeetingRoom: Socket disconnected', reason);
    };

    // NUCLEAR: Handle force end meeting from host
    const handleForceEndMeeting = (data: any) => {
      if (!mountedRef.current) return;
      console.log('🚨 Received force end meeting signal:', data);
      console.log('🚨 Current meeting ID:', meetingIdRef.current);
      console.log('🚨 Socket connected:', s?.connected);
      console.log('🚨 Call object exists:', !!call);
      console.log('🚨 Call ID:', call?.id);
      console.log('🚨 Call state:', call?.state?.callingState);
      
      if (data.meetingId === meetingIdRef.current) {
        console.log('🚨 Host ended the meeting, leaving immediately...');
        
        // Trigger automatic summary before leaving
        fetch('/api/mortgage-assistant/auto-summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            meetingId: call?.id || '',
            startTime: call?.state.createdAt || new Date().toISOString(),
            endTime: new Date().toISOString(),
            triggerType: 'host_ended_call'
            // ❌ REMOVED: participants array - let server fetch real participant data
            // The server-side getMeetingParticipants() will fetch real emails from database
          })
        }).catch(error => {
          console.error('❌ Error generating summary on force end:', error);
        });

        // BULLETPROOF: Check call state before attempting to leave
        if (call) {
          try {
            const currentState = call.state.callingState;
            console.log('🔍 Current call state before leaving:', currentState);
            
            // Only try to leave if not already left and call is in a valid state
            if (currentState !== CallingState.LEFT && 
                (currentState as any) !== 'left' && 
                (currentState as any) !== 'unknown' && 
                (currentState as any) !== 'offline') {
              // PARTICIPANTS should only call leave(), not endCall()
              console.log('🔄 Participant leaving call due to host end signal...');
              call.leave().catch(leaveError => {
                console.error('❌ Error leaving call:', leaveError);
                // If leave fails, just navigate away anyway
                console.log('🏠 Navigating away despite leave error...');
                router.push('/');
              });
            } else {
              console.log('✅ Call already left/ended/invalid, no need to leave');
            }
          } catch (error) {
            console.error('❌ Error checking call state:', error);
            // If we can't even check the call state, just navigate away
            console.log('🏠 Navigating away due to call state check error...');
            router.push('/');
          }
        }

        // Navigate away immediately
        setTimeout(() => {
          console.log('🏠 Navigating away due to force end signal...');
          router.push('/');
        }, 1000);
      }
    };

    s.on('connect', handleConnect);
    s.on('connect_error', handleConnectError);
    s.on('disconnect', handleDisconnect);
    s.on('force_end_meeting', handleForceEndMeeting);
    s.on('test_connection_response', (data: any) => {
      console.log('🔌 Test connection response received:', data);
    });

    s.connect();

    return () => {
      if (s) {
        s.off('connect', handleConnect);
        s.off('connect_error', handleConnectError);
        s.off('disconnect', handleDisconnect);
        s.off('force_end_meeting', handleForceEndMeeting);
        s.removeAllListeners();
        s.disconnect();
      }
      socketRef.current = null;
      (window as any).meetingSocket = null;
    };
  }, [user?.id]); // Only depend on user ID

  // NUCLEAR: Participant sync with manual event listeners
  useEffect(() => {
    if (!socketRef.current || !call || !mountedRef.current) return;

    const handleParticipantJoined = (participant: any) => {
      if (!mountedRef.current) return;
      console.log('Participant joined via Stream:', participant.userId);

      try {
        socketRef.current?.emit('participant_status_update', {
          meetingId: call.id,
          userId: participant.userId,
          status: 'joined',
          userName: participant.name || participant.userId
        });
        
        // Store participant in database
        fetch('/api/meetings/participants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            meetingId: call.id,
            participantId: participant.userId,
            action: 'add'
          })
        }).catch(error => {
          console.error('❌ Error storing participant join:', error);
        });
      } catch (error) {
        console.error('Error syncing participant join:', error);
      }
    };

    const handleParticipantLeft = (participant: any) => {
      if (!mountedRef.current) return;
      console.log('Participant left via Stream:', participant.userId);

      try {
        socketRef.current?.emit('participant_status_update', {
          meetingId: call.id,
          userId: participant.userId,
          status: 'left'
        });
        
        // Remove participant from database
        fetch('/api/meetings/participants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            meetingId: call.id,
            participantId: participant.userId,
            action: 'remove'
          })
        }).catch(error => {
          console.error('❌ Error storing participant leave:', error);
        });

      } catch (error) {
        console.error('Error syncing participant leave:', error);
      }
    };

    call.on('participantJoined', handleParticipantJoined);
    call.on('participantLeft', handleParticipantLeft);

    return () => {
      call.off('participantJoined', handleParticipantJoined);
      call.off('participantLeft', handleParticipantLeft);
    };
  }, [call?.id]); // Only depend on call ID

  // NUCLEAR: Automatic Summary Monitoring
  useEffect(() => {
    if (!call || !mountedRef.current) return;

    const localParticipant = call.state.localParticipant;
    if (!localParticipant) return;

    const isHost = localParticipant.userId === call.state.createdBy?.id;

    // Only create new triggers if meeting ID changed
    if (!summaryTriggersRef.current || summaryTriggersRef.current.getMeetingId() !== call.id) {
      if (summaryTriggersRef.current) {
        summaryTriggersRef.current.stopMonitoring();
      }

      summaryTriggersRef.current = createAutomaticSummaryTriggers({
        meetingId: call.id,
        call,
        localParticipant,
        isHost
      });
    }

    // Start/stop monitoring based on call state
    if (callingState === CallingState.JOINED && !isMonitoringRef.current) {
      summaryTriggersRef.current?.startMonitoring();
      isMonitoringRef.current = true;
    } else if (callingState !== CallingState.JOINED && isMonitoringRef.current) {
      summaryTriggersRef.current?.stopMonitoring();
      isMonitoringRef.current = false;
    }

    return () => {
      if (summaryTriggersRef.current) {
        summaryTriggersRef.current.stopMonitoring();
        isMonitoringRef.current = false;
      }
    };
  }, [call?.id, callingState]); // Minimal stable dependencies

  // NUCLEAR: Audio monitor setup
  useEffect(() => {
    audioMonitor.setInCall(callingState === CallingState.JOINED);
  }, [callingState]);

  // NUCLEAR: Page unload detection for automatic summary
  useEffect(() => {
    if (!call || !mountedRef.current) return;

    const handleBeforeUnload = () => {
      console.log('🔄 Page closing, triggering automatic summary...');
      
      // Use sendBeacon for reliable delivery during page unload
      const data = JSON.stringify({
        meetingId: call.id,
        startTime: call.state.createdAt,
        endTime: new Date().toISOString(),
        triggerType: 'page_closed'
      });

      navigator.sendBeacon('/api/mortgage-assistant/auto-summary', data);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('👁️ Page hidden, triggering automatic summary...');
        
        fetch('/api/mortgage-assistant/auto-summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            meetingId: call.id,
            startTime: call.state.createdAt,
            endTime: new Date().toISOString(),
            triggerType: 'page_closed'
          })
        }).catch(error => {
          console.error('❌ Error generating automatic summary on page hide:', error);
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [call?.id]);

  // NUCLEAR: UI state sync - only update when needed
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    showParticipantsRef.current = showParticipants;
  }, [showParticipants]);

  useEffect(() => {
    showChatRef.current = showChat;
  }, [showChat]);

  useEffect(() => {
    meetingTranscriptRef.current = meetingTranscript;
  }, [meetingTranscript]);

  // NUCLEAR: Stable callback functions
  const handleLayoutChange = useCallback((newLayout: CallLayoutType) => {
    setLayout(newLayout);
  }, []);

  const handleParticipantsToggle = useCallback(() => {
    setShowParticipants(prev => !prev);
  }, []);

  const handleChatToggle = useCallback(() => {
    setShowChat(prev => !prev);
  }, []);

  const handleTranscriptUpdate = useCallback((transcript: string) => {
    setMeetingTranscript(transcript);
    
    // Store transcript in database
    if (call?.id && transcript) {
      fetch('/api/meetings/transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId: call.id,
          transcript: transcript
        })
      }).catch(error => {
        console.error('❌ Error storing transcript:', error);
      });
    }
  }, [call?.id]);

  // Loading state
  if (callingState !== CallingState.JOINED) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Loader />
        </motion.div>
      </div>
    );
  }

  // NUCLEAR: Layout component - no complex logic
  const CallLayout = () => {
    if (isScreenSharing) {
      return USE_CUSTOM_GRID ? <ProParticipantsGrid /> : (
        <div className="h-full w-full relative">
          <div className="h-full w-full">
            <PaginatedGridLayout />
          </div>
          <div className="absolute top-4 right-4 z-20">
            <div className="w-80 h-60 bg-gray-900 rounded-lg border-2 border-gray-600 overflow-hidden shadow-2xl">
              <div className="h-full w-full">
                <SpeakerLayout participantsBarPosition="right" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (USE_CUSTOM_GRID) return <ProParticipantsGrid />;

    switch (layout) {
      case 'grid':
        return (
          <div className="h-full w-full">
            <PaginatedGridLayout />
          </div>
        );
      case 'speaker-right':
      case 'speaker-left':
        return (
          <div className="h-full w-full">
            <SpeakerLayout
              participantsBarPosition={layout === 'speaker-right' ? 'left' : 'right'}
            />
          </div>
        );
      default:
        return (
          <div className="h-full w-full">
            <SpeakerLayout participantsBarPosition="right" />
          </div>
        );
    }
  };

  return (
    <MediaBusProvider>
      <div className="relative flex h-screen flex-col bg-gradient-to-br from-gray-900 to-gray-800">

        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 right-0 h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[120px]" />
          <div className="absolute -bottom-1/2 left-0 h-[500px] w-[500px] rounded-full bg-purple-500/20 blur-[120px]" />
        </div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative flex flex-1 overflow-hidden"
          style={{ willChange: 'auto' }}
        >
          <div className="relative flex flex-1 items-center justify-center p-4">
            <div className="relative h-full w-full max-w-[1080px]">
              <CallLayout />
            </div>
          </div>

          {/* Participants List */}
          <AnimatePresence>
            {showParticipants && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 20 }}
                className="fixed right-0 top-0 bottom-0 z-50 w-full border-l border-gray-800 bg-gray-900/95 md:relative md:w-80 md:backdrop-blur-xl"
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b border-gray-800 p-4">
                    <h2 className="text-lg font-semibold text-white">Participants ({participantCount})</h2>
                    <button
                      onClick={() => setShowParticipants(false)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <CallParticipantsList
                    onClose={() => setShowParticipants(false)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile Participants Toggle */}
          <AnimatePresence>
            {!showParticipants && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={handleParticipantsToggle}
                className="fixed right-4 top-1/2 z-40 -translate-y-1/2 rounded-l-xl bg-gray-800/90 p-2 text-white hover:bg-gray-700 md:hidden"
              >
                <ChevronLeft className="h-6 w-6" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Chat Component */}
          <MeetingChat
            meetingId={call?.id || ''}
            isOpen={showChat}
            onClose={() => setShowChat(false)}
          />
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="meeting-controls relative flex items-center justify-center gap-2 bg-gray-900/90 p-4 md:gap-4"
        >
          <CallControls
            onLeave={() => router.push('/')}
          />

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-white transition-colors hover:bg-gray-700 md:px-4">
              <LayoutList className="h-5 w-5" />
              <span className="hidden text-sm md:inline">Layout</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="border-gray-700 bg-gray-800">
              {['Grid', 'Speaker-Left', 'Speaker-Right'].map((item) => (
                <DropdownMenuItem
                  key={item}
                  onClick={() => handleLayoutChange(item.toLowerCase() as CallLayoutType)}
                  className="text-white hover:bg-gray-700"
                >
                  {item}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <CallStatsButton />

          <button
            onClick={handleParticipantsToggle}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 transition-colors md:px-4",
              showParticipants
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-800 text-white hover:bg-gray-700"
            )}
          >
            <Users className="h-5 w-5" />
            <span className="hidden text-sm md:inline">Participants ({participantCount})</span>
          </button>

          <button
            onClick={handleChatToggle}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 transition-colors md:px-4",
              showChat
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-800 text-white hover:bg-gray-700"
            )}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="hidden text-sm md:inline">Chat</span>
          </button>

          {!isPersonalRoom && <EndCallButton />}
        </motion.div>

        {/* Real-time transcription service */}
        <MeetingTranscription
          meetingId={call?.id || ''}
          isActive={callingState === CallingState.JOINED}
          onTranscriptUpdate={handleTranscriptUpdate}
        />

      </div>
    </MediaBusProvider>
  );
};

export default MeetingRoom;
