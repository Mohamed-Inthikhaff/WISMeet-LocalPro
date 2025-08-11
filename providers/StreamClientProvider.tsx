'use client';

import { StreamVideo, StreamVideoClient, StreamTheme } from '@stream-io/video-react-sdk';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState, ReactNode } from 'react';
import { tokenProvider } from '@/actions/stream.actions';
import Loader from '@/components/Loader';

const API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY;

const StreamVideoProvider = ({ children }: { children: ReactNode }) => {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoaded } = useUser();

  useEffect(() => {
    let isMounted = true;
    
    async function initClient() {
      if (!isLoaded || !user || !API_KEY) return;
      
      try {
        const c = new StreamVideoClient({
          apiKey: API_KEY,
          user: {
            id: user.id,
            name: user.firstName || user.username || user.id,
            image: user.imageUrl,
          },
          tokenProvider,
        });
        
        if (isMounted) {
          setClient(c);
          setError(null);
        }
      } catch (err) {
        console.error('StreamClientProvider: Error creating Stream client:', err);
        if (isMounted) {
          setError('Failed to initialize video client');
        }
      }
    }

    initClient();

    return () => {
      isMounted = false;
      if (client) {
        client.disconnectUser();
      }
    };
  }, [isLoaded, user?.id, API_KEY]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center text-white">
          <h2 className="text-xl font-bold mb-4">Video Client Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Please check your environment variables and try again.</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return <Loader />;
  }

  return (
    <StreamVideo client={client}>
      <StreamTheme>{children}</StreamTheme>
    </StreamVideo>
  );
};

export default StreamVideoProvider;
