import { useEffect, useState } from 'react';
import { Call, useStreamVideoClient } from '@stream-io/video-react-sdk';

export const useGetCallById = (id: string | string[]) => {
  const [call, setCall] = useState<Call>();
  const [isCallLoading, setIsCallLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const client = useStreamVideoClient();

  useEffect(() => {
    if (!client) return;
    
    const loadCall = async () => {
      try {
        setIsCallLoading(true);
        setError(null);
        
        // https://getstream.io/video/docs/react/guides/querying-calls/#filters
        console.log('useGetCallById: Searching for call with ID:', id);
        const { calls } = await client.queryCalls({ filter_conditions: { id } });
        console.log('useGetCallById: Found calls:', calls.length);

        if (calls.length > 0) {
          const foundCall = calls[0];
          console.log('useGetCallById: Call found:', foundCall.id);

          setCall(foundCall);
          setRetryCount(0); // Reset retry count on success
        } else {
          console.log('useGetCallById: No call found with ID:', id);
          
          // Retry logic for newly created calls
          if (retryCount < 3) {
            console.log(`useGetCallById: Retrying... (${retryCount + 1}/3)`);
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, 1000 * (retryCount + 1)); // Exponential backoff
            return;
          }
          
          setError('Call not found');
        }

        setIsCallLoading(false);
      } catch (error) {
        console.error('Error loading call:', error);
        setError('Failed to load call');
        setIsCallLoading(false);
      }
    };

    loadCall();
  }, [client, id, retryCount]);

  return { call, isCallLoading, error };
};
