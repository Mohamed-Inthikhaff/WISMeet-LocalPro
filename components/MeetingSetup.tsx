'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  DeviceSettings,
  useCall,
  useCallStateHooks,
  VideoPreview,
  CallingState,
} from '@stream-io/video-react-sdk';
import { motion } from 'framer-motion';
import Alert from './Alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Mic, MicOff, Video, VideoOff, Users, Settings, Volume2, Monitor, ChevronUp, ChevronDown, Info, AlertCircle, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

const MeetingSetup = ({
  setIsSetupComplete,
}: {
  setIsSetupComplete: (value: boolean) => void;
}) => {
  const { useCallEndedAt, useCallStartsAt } = useCallStateHooks();
  const callStartsAt = useCallStartsAt();
  const callEndedAt = useCallEndedAt();
  const callTimeNotArrived = callStartsAt && new Date(callStartsAt) > new Date();
  const callHasEnded = !!callEndedAt;
  const [participantName, setParticipantName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [noiseCancellationEnabled, setNoiseCancellationEnabled] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [micDropdownOpen, setMicDropdownOpen] = useState(false);
  const [cameraDropdownOpen, setCameraDropdownOpen] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);

  const call = useCall();
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  if (!call) {
    throw new Error(
      'useStreamCall must be used within a StreamCall component.',
    );
  }

  // Setup completion effect
  useEffect(() => {
    // Only transition when the SDK actually reports joined
    if (callingState === CallingState.JOINED) {
      setIsSetupComplete(true);
    }
  }, [callingState, setIsSetupComplete]);

  // Use Stream SDK to toggle camera; no direct getUserMedia
  const toggleCamera = async () => {
    try {
      setError(null);
      await call.camera.toggle();
      setIsCameraEnabled((prev) => !prev);
      setLastAction(`Camera turned ${isCameraEnabled ? 'off' : 'on'}`);
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
    } catch (err: any) {
      console.error('Error toggling camera:', err);
      setError(
        err instanceof Error
          ? `Camera error: ${err.message}. Please try again.`
          : 'Failed to toggle camera. Please check permissions and try again.'
      );
    }
  };

  // Use Stream SDK to toggle microphone
  const toggleMicrophone = async () => {
    try {
      if (isMicEnabled) {
        await call.microphone.disable();
      } else {
        await call.microphone.enable();
      }
      setIsMicEnabled((prev) => !prev);
      setLastAction(isMicEnabled ? 'Microphone muted' : 'Microphone unmuted');
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
    } catch (err) {
      console.error('Error toggling microphone:', err);
      setError('Failed to toggle microphone. Please check permissions and try again.');
    }
  };

  const handleJoinMutedToggle = async (checked: boolean) => {
    try {
      if (checked) {
        setIsCameraEnabled(false);
        setIsMicEnabled(false);
      } else {
        setIsMicEnabled(true);
        setIsCameraEnabled(true);
      }
    } catch {
      setError('Failed to update device settings.');
    }
  };

  // Simplified join: ensure devices are properly set
  const handleJoinMeeting = async () => {
    if (isJoining || hasJoined) return;
    if (!participantName.trim()) {
      setError('Please enter your name to join the meeting.');
      return;
    }

    try {
      setIsJoining(true);
      setError(null);

      console.log('Joining meeting with Stream SDK...');
      
      if (!call) {
        throw new Error('Call not available');
      }
      
      // Join the call - Stream SDK handles device permissions automatically
      await call.join({
        data: {
          custom: {
            participantName: participantName.trim(),
          },
        },
      });

      console.log('Successfully joined meeting');
      setHasJoined(true);
      
    } catch (err) {
      console.error('Error joining meeting:', err);
      setError('Failed to join the meeting. Please try again.');
      setIsJoining(false);
    }
  };

  return (
    <TooltipProvider>
    <div className="relative min-h-screen w-full bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:p-8">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 right-0 h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="absolute -bottom-1/2 left-0 h-[500px] w-[500px] rounded-full bg-purple-500/20 blur-[120px]" />
      </div>

        {/* Visual Feedback Toast */}
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800/95 px-4 py-2 text-white shadow-lg backdrop-blur-sm border border-gray-700"
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium">{lastAction}</span>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative mx-auto max-w-5xl"
        >
          <Card className="overflow-hidden border-gray-800/50 bg-gray-900/50 backdrop-blur-xl">
            <div className="p-6 md:p-8">
              <div className="mb-8 text-center">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mb-6"
                >
                  <h1 className="mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
                    Ready to Join?
                  </h1>
                  <p className="text-gray-400">
                    Set up your audio and video before joining the meeting
                  </p>
                </motion.div>

                <div className="mx-auto mb-4 flex max-w-md items-center justify-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
                  <Users className="h-4 w-4" />
                  <span>Meeting ID: {call.id}</span>
                </div>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                {/* Left Column - Video Preview */}
                <div className="flex flex-col gap-6">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="relative flex items-center justify-center overflow-hidden rounded-2xl border-2 border-gray-700/50 bg-black min-h-[300px]"
                  >
                    <VideoPreview />

                    {/* Enhanced Status Indicators - Always Visible */}
                    <div className="absolute left-4 top-4 flex items-center gap-3 z-10">
                      {/* Camera Status */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.div 
                            className="flex items-center gap-2 rounded-lg bg-gray-900/90 px-3 py-1.5 text-sm backdrop-blur-sm cursor-pointer"
                            animate={{ 
                              backgroundColor: isCameraEnabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              borderColor: isCameraEnabled ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
                            }}
                            transition={{ duration: 0.3 }}
                            style={{ border: '1px solid transparent' }}
                          >
                        <motion.div 
                          className={`h-2 w-2 rounded-full ${isCameraEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                          animate={{ 
                            scale: isCameraEnabled ? 1 : 0.8,
                            opacity: isCameraEnabled ? 1 : 0.7
                          }}
                          transition={{ duration: 0.5, repeat: isCameraEnabled ? Infinity : 0, repeatDelay: 2 }}
                        />
                            <span className="text-white font-medium">
                              Camera {isCameraEnabled ? 'On' : 'Off'}
                            </span>
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 text-white border-gray-700">
                          <p>Camera is {isCameraEnabled ? 'enabled' : 'disabled'}</p>
                          <p className="text-xs text-gray-400 mt-1">Click to toggle camera</p>
                        </TooltipContent>
                      </Tooltip>
                      
                      {/* Microphone Status */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.div 
                            className="flex items-center gap-2 rounded-lg bg-gray-900/90 px-3 py-1.5 text-sm backdrop-blur-sm cursor-pointer"
                            animate={{ 
                              backgroundColor: isMicEnabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              borderColor: isMicEnabled ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
                            }}
                            transition={{ duration: 0.3 }}
                            style={{ border: '1px solid transparent' }}
                          >
                        <motion.div 
                          className={`h-2 w-2 rounded-full ${isMicEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                          animate={{ 
                            scale: isMicEnabled ? 1 : 0.8,
                            opacity: isMicEnabled ? 1 : 0.7
                          }}
                          transition={{ duration: 0.5, repeat: isMicEnabled ? Infinity : 0, repeatDelay: 2 }}
                        />
                            <span className="text-white font-medium">Mic {isMicEnabled ? 'On' : 'Off'}</span>
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 text-white border-gray-700">
                          <p>Microphone is {isMicEnabled ? 'enabled' : 'disabled'}</p>
                          <p className="text-xs text-gray-400 mt-1">Click to toggle microphone</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Enhanced Quick Controls with Dropdowns - Always Visible */}
                    <div 
                      className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-gray-900/90 p-3 backdrop-blur-sm z-50"
                      style={{ 
                        position: 'absolute',
                        bottom: '16px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        zIndex: 50,
                        pointerEvents: 'auto',
                        minWidth: '200px',
                        justifyContent: 'center'
                      }}
                      data-testid="controls-container"
                    >
                      {/* Enhanced Microphone Toggle with Dropdown */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenu open={micDropdownOpen} onOpenChange={setMicDropdownOpen} data-testid="mic-controls">
                              <DropdownMenuTrigger asChild>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className={`relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
                          isMicEnabled
                                      ? 'bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20'
                                      : 'bg-red-500/20 text-red-400 shadow-lg shadow-red-500/20'
                                  }`}
                                  title={isMicEnabled ? 'Microphone settings' : 'Microphone settings'}
                                >
                                  {/* Background glow effect */}
                                  <div className={`absolute inset-0 rounded-xl ${
                                    isMicEnabled ? 'bg-green-500/10' : 'bg-red-500/10'
                                  }`} />
                                  
                                  {/* Icon with animation */}
                                  <motion.div
                                    initial={false}
                                    animate={{ 
                                      scale: isMicEnabled ? 1 : 0.8,
                                      opacity: isMicEnabled ? 1 : 0.7
                                    }}
                                    transition={{ duration: 0.2 }}
                                    className="relative z-10"
                                  >
                                    {isMicEnabled ? (
                                      <Mic className="h-6 w-6" />
                                    ) : (
                                      <MicOff className="h-6 w-6" />
                                    )}
                                  </motion.div>
                                  
                                  {/* Status indicator */}
                                  <motion.div
                                    initial={false}
                                    animate={{ 
                                      scale: isMicEnabled ? 1 : 0,
                                      opacity: isMicEnabled ? 1 : 0
                                    }}
                                    transition={{ duration: 0.2 }}
                                    className={`absolute -top-1 -right-1 h-3 w-3 rounded-full ${
                                      isMicEnabled ? 'bg-green-500' : 'bg-red-500'
                                    }`}
                                  />
                                </motion.button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="border-gray-700 bg-gray-800/95 backdrop-blur-sm">
                                <DropdownMenuItem 
                                  onClick={toggleMicrophone}
                                  className="flex items-center gap-3 text-white hover:bg-gray-700"
                                >
                                  {isMicEnabled ? (
                                    <>
                                      <MicOff className="h-4 w-4 text-red-400" />
                                      <span>Mute Microphone</span>
                                    </>
                                  ) : (
                                    <>
                                      <Mic className="h-4 w-4 text-green-400" />
                                      <span>Unmute Microphone</span>
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-gray-700" />
                                <DropdownMenuItem 
                                  onClick={() => setShowSettings(true)}
                                  className="flex items-center gap-3 text-white hover:bg-gray-700"
                                >
                                  <Settings className="h-4 w-4 text-gray-400" />
                                  <span>Audio Settings</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TooltipTrigger>
                          <TooltipContent className="bg-gray-800 text-white border-gray-700">
                            <p>Click for microphone options</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {isMicEnabled ? 'Currently unmuted' : 'Currently muted'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Enhanced Camera Toggle with Dropdown */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenu open={cameraDropdownOpen} onOpenChange={setCameraDropdownOpen} data-testid="camera-controls">
                            <DropdownMenuTrigger asChild>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={`relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
                          isCameraEnabled
                                    ? 'bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20'
                                    : 'bg-red-500/20 text-red-400 shadow-lg shadow-red-500/20'
                                }`}
                                title={isCameraEnabled ? 'Camera settings' : 'Camera settings'}
                              >
                                {/* Background glow effect */}
                                <div className={`absolute inset-0 rounded-xl ${
                                  isCameraEnabled ? 'bg-green-500/10' : 'bg-red-500/10'
                                }`} />
                                
                                {/* Icon with animation */}
                                <motion.div
                                  initial={false}
                                  animate={{ 
                                    scale: isCameraEnabled ? 1 : 0.8,
                                    opacity: isCameraEnabled ? 1 : 0.7
                                  }}
                                  transition={{ duration: 0.2 }}
                                  className="relative z-10"
                                >
                                  {isCameraEnabled ? (
                                    <Video className="h-6 w-6" />
                                  ) : (
                                    <VideoOff className="h-6 w-6" />
                                  )}
                                </motion.div>
                                
                                {/* Status indicator */}
                                <motion.div
                                  initial={false}
                                  animate={{ 
                                    scale: isCameraEnabled ? 1 : 0,
                                    opacity: isCameraEnabled ? 1 : 0
                                  }}
                                  transition={{ duration: 0.2 }}
                                  className={`absolute -top-1 -right-1 h-3 w-3 rounded-full ${
                                    isCameraEnabled ? 'bg-green-500' : 'bg-red-500'
                                  }`}
                                />
                              </motion.button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="border-gray-700 bg-gray-800/95 backdrop-blur-sm">
                              <DropdownMenuItem 
                                onClick={toggleCamera}
                                className="flex items-center gap-3 text-white hover:bg-gray-700"
                              >
                                {isCameraEnabled ? (
                                  <>
                                    <VideoOff className="h-4 w-4 text-red-400" />
                                    <span>Turn Off Camera</span>
                                  </>
                                ) : (
                                  <>
                                    <Video className="h-4 w-4 text-green-400" />
                                    <span>Turn On Camera</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-700" />
                              <DropdownMenuItem 
                                onClick={() => setShowSettings(true)}
                                className="flex items-center gap-3 text-white hover:bg-gray-700"
                              >
                                <Settings className="h-4 w-4 text-gray-400" />
                                <span>Video Settings</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 text-white border-gray-700">
                          <p>Click for camera options</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {isCameraEnabled ? 'Currently on' : 'Currently off'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      
                      {/* Settings Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.button
                        onClick={() => setShowSettings(!showSettings)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gray-700/50 text-white transition-all duration-300 hover:bg-gray-600/50 shadow-lg"
                          >
                            <motion.div
                              animate={{ rotate: showSettings ? 180 : 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Settings className="h-6 w-6" />
                            </motion.div>
                          </motion.button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 text-white border-gray-700">
                          <p>Device settings</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {showSettings ? 'Hide settings' : 'Show settings'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-3"
                  >
                    <Label htmlFor="name" className="text-sm font-medium text-gray-300">
                      Display Name
                    </Label>
                    <div className="relative">
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your name"
                        value={participantName}
                        onChange={(e) => setParticipantName(e.target.value)}
                        className="border-gray-700/50 bg-gray-800/50 pl-10 text-white placeholder:text-gray-500"
                      />
                      <Users className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-400">This is how other participants will see you</p>
                  </motion.div>
                </div>

                {/* Right Column - Controls */}
                <div className="flex flex-col justify-between gap-6">
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="space-y-6"
                  >
                    {showSettings && (
                      <div className="rounded-xl border border-gray-700/50 bg-gray-800/30 p-4">
                        <div className="mb-4 flex items-center gap-3">
                          <Settings className="h-5 w-5 text-gray-400" />
                          <div>
                            <h3 className="font-medium text-white">Device Settings</h3>
                            <p className="text-sm text-gray-400">Configure your audio and video</p>
                          </div>
                        </div>
                        <DeviceSettings />
                      </div>
                    )}

                    {/* System Check */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-800/30 p-4">
                      <div className="flex items-center gap-3">
                          <motion.div
                            animate={{ 
                              scale: isMicEnabled ? 1 : 0.8,
                              opacity: isMicEnabled ? 1 : 0.6
                            }}
                            transition={{ duration: 0.2 }}
                          >
                            <Mic className={`h-5 w-5 ${isMicEnabled ? 'text-green-400' : 'text-red-400'}`} />
                          </motion.div>
                          <span className="text-sm text-gray-300">Microphone</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <motion.div
                            animate={{ 
                              scale: isMicEnabled ? 1 : 0,
                              opacity: isMicEnabled ? 1 : 0
                            }}
                            transition={{ duration: 0.2 }}
                            className={`h-2 w-2 rounded-full ${isMicEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                          />
                          <span className={`text-sm font-medium ${isMicEnabled ? 'text-green-400' : 'text-red-400'}`}>
                            {isMicEnabled ? 'Working' : 'Disabled'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-800/30 p-4">
                          <div className="flex items-center gap-3">
                          <motion.div
                            animate={{ 
                              scale: isCameraEnabled ? 1 : 0.8,
                              opacity: isCameraEnabled ? 1 : 0.6
                            }}
                            transition={{ duration: 0.2 }}
                          >
                            <Video className={`h-5 w-5 ${isCameraEnabled ? 'text-green-400' : 'text-red-400'}`} />
                          </motion.div>
                            <span className="text-sm text-gray-300">Camera</span>
                          </div>
                        <div className="flex items-center gap-2">
                          <motion.div
                            animate={{ 
                              scale: isCameraEnabled ? 1 : 0,
                              opacity: isCameraEnabled ? 1 : 0
                            }}
                            transition={{ duration: 0.2 }}
                            className={`h-2 w-2 rounded-full ${isCameraEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                          />
                          <span className={`text-sm font-medium ${isCameraEnabled ? 'text-green-400' : 'text-red-400'}`}>
                            {isCameraEnabled ? 'Working' : 'Disabled'}
                          </span>
                        </div>
                        </div>

                      <div className="flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-800/30 p-4">
                          <div className="flex items-center gap-3">
                          <Volume2 className="h-5 w-5 text-green-400" />
                            <span className="text-sm text-gray-300">Speaker</span>
                          </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span className="text-sm font-medium text-green-400">Working</span>
                        </div>
                      </div>
                    </div>

                    {/* Join Preferences */}
                    <div className="flex items-center gap-3 rounded-xl border border-gray-700/50 bg-gray-800/30 p-4">
                      <Users className="h-5 w-5 text-gray-400" />
                      <div className="flex-1">
                        <h3 className="mb-1 font-medium text-white">Join Preferences</h3>
                        <p className="text-sm text-gray-400">Choose how you want to join</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="mute-toggle"
                          checked={!isMicEnabled && !isCameraEnabled}
                          onCheckedChange={handleJoinMutedToggle}
                        />
                        <Label
                          htmlFor="mute-toggle"
                          className="cursor-pointer text-sm text-gray-300"
                        >
                          Join muted
                        </Label>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="space-y-3"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                    <Button
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-6 text-lg font-medium text-white transition-all hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600"
                      onClick={handleJoinMeeting}
                      disabled={!participantName || isJoining || hasJoined}
                    >
                      {isJoining ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Joining...
                        </div>
                      ) : hasJoined ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded-full bg-green-500" />
                          Joined
                        </div>
                      ) : (
                        'Join Meeting'
                      )}
                    </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 text-white border-gray-700">
                        <p>Join the meeting</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {isJoining ? 'Joining meeting...' : hasJoined ? 'Already joined' : participantName ? 'Ready to join' : 'Enter your name first'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                    {!participantName && (
                      <p className="text-center text-sm text-gray-400">
                        Please enter your name to join the meeting
                      </p>
                    )}
                  </motion.div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-red-500/20 bg-red-500/10 p-4"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">Setup Error</p>
                <p className="text-xs text-red-300 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default MeetingSetup;
