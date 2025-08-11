'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { StreamCall } from '@stream-io/video-react-sdk';
import { useParams } from 'next/navigation';
import { Loader } from 'lucide-react';

import { useGetCallById } from '@/hooks/useGetCallById';
import Alert from '@/components/Alert';
import MeetingSetup from '@/components/MeetingSetup';
import MeetingRoom from '@/components/MeetingRoom';
import ErrorBoundary from '@/components/ErrorBoundary';


const MeetingPage = () => {
  const { id } = useParams();
  const { isLoaded, user } = useUser();
  const { call, isCallLoading, error } = useGetCallById(id);
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('MeetingPage: State update', {
      isLoaded,
      isCallLoading,
      hasCall: !!call,
      callId: call?.id,
      isSetupComplete,
      hasError: !!error
    });
  }, [isLoaded, isCallLoading, call, isSetupComplete, error]);

  if (!isLoaded || isCallLoading) return <Loader />;

  if (error) return (
    <Alert title={`Error: ${error}`} />
  );

  if (!call) return (
    <p className="text-center text-3xl font-bold text-white">
      Call Not Found
    </p>
  );

  // get more info about custom call type:  https://getstream.io/video/docs/react/guides/configuring-call-types/
  const notAllowed = call.type === 'invited' && (!user || !call.state.members.find((m) => m.user.id === user.id));

  if (notAllowed) return <Alert title="You are not allowed to join this meeting" />;

  return (
    <main className="h-screen w-full">
      <ErrorBoundary
        meetingId={call?.id}
        userId={user?.id}
        onError={(error, errorInfo) => {
          console.error('Meeting error:', error, errorInfo);
          // Error is already captured by ErrorBoundary component
        }}
      >
      <StreamCall call={call}>
        {!isSetupComplete ? (
            <ErrorBoundary meetingId={call?.id} userId={user?.id}>
          <MeetingSetup setIsSetupComplete={(value) => {
            console.log('MeetingPage: Setup complete callback', { value });
            setIsSetupComplete(value);
          }} />
            </ErrorBoundary>
        ) : (
            <ErrorBoundary meetingId={call?.id} userId={user?.id}>
          <MeetingRoom />
            </ErrorBoundary>
        )}
      </StreamCall>
      </ErrorBoundary>
    </main>
  );
};

export default MeetingPage;
