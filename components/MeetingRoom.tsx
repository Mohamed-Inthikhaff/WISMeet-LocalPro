'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  CallControls,
  CallParticipantsList,
  CallStatsButton,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from '@stream-io/video-react-sdk';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, LayoutList, X, ChevronLeft, Video, VideoOff, Mic, MicOff, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import { createSocket } from '@/lib/socket-client';
import { MediaBusProvider } from './MediaBusProvider';
import { USE_CUSTOM_GRID } from '@/constants/featureFlags';
import ParticipantsGrid from './ParticipantsGrid';

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
  const [layout, setLayout] = useState<CallLayoutType>('speaker-left');
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const [meetingTranscript, setMeetingTranscript] = useState('');
  const { useCallCallingState, useLocalParticipant } = useCallStateHooks();
  const callingState = useCallCallingState();
  const localParticipant = useLocalParticipant();
  const call = useCall();
  
  const meetingId = call?.id || '';
  const readyForRoomSocket = callingState === CallingState.JOINED && Boolean(meetingId);
  
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
  
  // Check if any participant is screen sharing - use Stream's official selector if available
  const isScreenSharing = useMemo(() => {
    if (!call?.state.participants) return false;
    
    return call.state.participants.some(participant => {
      // Use Stream's publishedTracks to check for screen sharing
      const publishedTracks = participant.publishedTracks || [];
      return publishedTracks.includes('screen' as any);
    });
  }, [call?.state.participants]);
  
  // Debug log for screen sharing detection
  useEffect(() => {
    if (isScreenSharing) {
      console.log('Screen sharing detected! Switching to PiP layout');
    }
  }, [isScreenSharing]);

  // Get participants from call state
  const participants = useMemo(() => call?.state.participants || [], [call?.state.participants]);

  // Get accurate participant count - Stream SDK already includes local participant
  const participantCount = participants.length;

  // Debug logging for participant status (reduced frequency)
  useEffect(() => {
    // Only log when participant count actually changes
    const currentCount = participantCount;
    
    console.log('MeetingRoom: Participant status update', {
      participantCount: currentCount,
      participants: participants.map(p => ({ id: p.userId, name: p.name })),
      localParticipant: localParticipant ? { id: localParticipant.userId, name: localParticipant.name } : null,
      isLocalParticipantIncluded: participants.some(p => p.userId === localParticipant?.userId)
    });
  }, [participantCount, participants, localParticipant]);

  // Lightweight audio diagnostics (temporary - remove after verification)
  useEffect(() => {
    if (callingState !== CallingState.JOINED || !localParticipant) return;

    const interval = setInterval(() => {
      // Log audio track status and MediaBus state
      try {
        const audioTrack = call?.microphone.getTrack?.();
        if (audioTrack) {
          console.log('🎤 Audio diagnostics:', {
            trackState: audioTrack.readyState,
            trackId: audioTrack.id,
            enabled: audioTrack.enabled,
            muted: audioTrack.muted,
            timestamp: new Date().toISOString()
          });
        } else {
          console.log('🎤 Audio diagnostics: No audio track available');
        }
      } catch (error) {
        console.warn('Failed to get audio diagnostics:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [callingState, localParticipant, call]);

  // Gate socket by readiness - only connect when call is joined and meetingId exists
  useEffect(() => {
    if (!user || !readyForRoomSocket) return;

    const s = createSocket();

    const handleConnect = () => {
      console.log('MeetingRoom: Socket connected');
      
      // Join the meeting room for participant sync
      s.emit('join_meeting', {
        meetingId,
        userId: user.id,
        userName: user.fullName || user.emailAddresses[0].emailAddress
      });
    };

    const handleConnectError = (err: any) => {
      console.error('MeetingRoom: Socket connect_error', err);
    };

    const handleDisconnect = (reason: string) => {
      console.log('MeetingRoom: Socket disconnected', reason);
    };

    // Register event handlers
    s.on('connect', handleConnect);
    s.on('connect_error', handleConnectError);
    s.on('disconnect', handleDisconnect);

    // Connect manually when ready
    s.connect();
    setSocket(s);

    // Cleanup function
    return () => {
      s.off('connect', handleConnect);
      s.off('connect_error', handleConnectError);
      s.off('disconnect', handleDisconnect);
      s.removeAllListeners();
      s.disconnect();
      setSocket(null);
    };
  }, [user, readyForRoomSocket, meetingId]);

  // Sync participant status changes with socket system
  useEffect(() => {
    if (!socket || !call) return;

    const handleParticipantJoined = (participant: any) => {
      console.log('Participant joined via Stream:', participant.userId);
      try {
        // Notify socket system about participant join
        socket.emit('participant_status_update', {
          meetingId: call.id,
          userId: participant.userId,
          status: 'joined',
          userName: participant.name || participant.userId
        });
      } catch (error) {
        console.error('Error syncing participant join:', error);
      }
    };

    const handleParticipantLeft = (participant: any) => {
      console.log('Participant left via Stream:', participant.userId);
      try {
        // Notify socket system about participant leave
        socket.emit('participant_status_update', {
          meetingId: call.id,
          userId: participant.userId,
          status: 'left'
        });

        // Check if meeting should end (only local participant remaining)
        const remainingParticipants = call.state.participants.filter(p => p.userId !== participant.userId);
        if (remainingParticipants.length === 0 && localParticipant) {
          console.log('🤖 All participants left, triggering automatic summary...');
          
          // Trigger automatic summary generation
          fetch('/api/mortgage-assistant/auto-summary', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              meetingId: call.id,
              startTime: call.state.createdAt,
              endTime: new Date().toISOString()
            })
          }).then(response => {
            if (response.ok) {
              console.log('✅ Automatic summary generated when meeting ended');
            } else {
              console.warn('⚠️ Automatic summary generation failed');
            }
          }).catch(error => {
            console.error('❌ Error generating automatic summary:', error);
          });
        }
      } catch (error) {
        console.error('Error syncing participant leave:', error);
      }
    };

    // Listen for participant changes
    call.on('participantJoined', handleParticipantJoined);
    call.on('participantLeft', handleParticipantLeft);

    return () => {
      call.off('participantJoined', handleParticipantJoined);
      call.off('participantLeft', handleParticipantLeft);
    };
  }, [socket, call, localParticipant]);

  // Comprehensive Automatic Summary Monitoring - Fixed to prevent repeated setup
  const summaryTriggersRef = useRef<AutomaticSummaryTriggers | null>(null);
  const isMonitoringRef = useRef(false);

  useEffect(() => {
    if (!call || !localParticipant) return;

    const isHost = localParticipant.userId === call.state.createdBy?.id;
    
    // Only create new triggers if we don't have them or if the meeting ID changed
    if (!summaryTriggersRef.current || summaryTriggersRef.current.getMeetingId() !== call.id) {
      console.log('🎯 Setting up comprehensive automatic summary monitoring...', {
        isHost,
        meetingId: call.id,
        localParticipantId: localParticipant.userId
      });

      // Clean up previous triggers if they exist
      if (summaryTriggersRef.current) {
        summaryTriggersRef.current.stopMonitoring();
      }

      // Create new automatic summary triggers
      summaryTriggersRef.current = createAutomaticSummaryTriggers({
        meetingId: call.id,
        call,
        localParticipant,
        isHost
      });
    }

    // Start monitoring only when call is joined and not already monitoring
    if (callingState === CallingState.JOINED && !isMonitoringRef.current) {
      console.log('🎯 Starting automatic summary monitoring...');
      summaryTriggersRef.current?.startMonitoring();
      isMonitoringRef.current = true;
    } else if (callingState !== CallingState.JOINED && isMonitoringRef.current) {
      console.log('🛑 Stopping automatic summary monitoring due to call state change...');
      summaryTriggersRef.current?.stopMonitoring();
      isMonitoringRef.current = false;
    }

    // Cleanup on unmount
    return () => {
      if (summaryTriggersRef.current) {
        console.log('🛑 Cleaning up automatic summary monitoring...');
        summaryTriggersRef.current.stopMonitoring();
        isMonitoringRef.current = false;
      }
    };
  }, [call, localParticipant, callingState]);

  // Set audio monitor into call-mode when joining
  useEffect(() => {
    audioMonitor.setInCall(callingState === CallingState.JOINED);
  }, [callingState]);

  // Stream SDK handles track management automatically


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

  const CallLayout = () => {
    // If screen sharing is active, use picture-in-picture layout
    if (isScreenSharing) {
      return USE_CUSTOM_GRID ? <ParticipantsGrid /> : (
        <div className="h-full w-full relative">
          {/* Main screen share area - takes full space */}
          <div className="h-full w-full">
            <PaginatedGridLayout />
          </div>
          
          {/* Picture-in-picture video overlay - small, draggable */}
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

    // Use custom grid if enabled, otherwise use existing layouts
    if (USE_CUSTOM_GRID) return <ParticipantsGrid />;
    
    // Normal layout when not screen sharing
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
          <div className="absolute -top-1/2 right-0 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[120px]" />
          <div className="absolute -bottom-1/2 left-0 h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[120px]" />
        </div>



        {/* Main Content */}
        <div className="relative flex flex-1 overflow-hidden">
          {/* Video Layout */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative flex flex-1 items-center justify-center p-4"
            style={{ 
              willChange: 'auto', // Prevent unnecessary GPU acceleration
              transform: 'translateZ(0)' // Force hardware acceleration
            }}
          >
            <div className="relative h-full w-full max-w-[1440px]">
              <CallLayout />
            </div>
          </motion.div>

        {/* Participants List */}
        <AnimatePresence>
          {showParticipants && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full border-l border-gray-800 bg-gray-900/95 backdrop-blur-xl md:relative md:w-80"
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
              onClick={() => setShowParticipants(true)}
              className="fixed right-4 top-1/2 z-40 -translate-y-1/2 rounded-l-xl bg-gray-800/90 p-2 text-white backdrop-blur-sm hover:bg-gray-700 md:hidden"
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
      </div>

      {/* Controls */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative flex flex-wrap items-center justify-center gap-2 bg-gray-900/90 p-4 backdrop-blur-sm md:gap-4"
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
                onClick={() => setLayout(item.toLowerCase() as CallLayoutType)}
                className="text-white hover:bg-gray-700"
              >
                {item}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <CallStatsButton />

        <button
          onClick={() => setShowParticipants((prev) => !prev)}
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
          onClick={() => setShowChat((prev) => !prev)}
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
        onTranscriptUpdate={setMeetingTranscript}
      />

      </div>
    </MediaBusProvider>
  );
};

export default MeetingRoom;
