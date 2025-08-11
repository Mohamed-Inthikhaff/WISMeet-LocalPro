'use server';

import { currentUser } from '@clerk/nextjs/server';
import { StreamClient } from '@stream-io/node-sdk';

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_SECRET_KEY;

// Simple token cache to prevent unnecessary regeneration
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export const tokenProvider = async () => {
  const user = await currentUser();

  if (!user) {
    console.error('Token provider: User is not authenticated');
    throw new Error('User is not authenticated');
  }
  
  if (!STREAM_API_KEY) {
    console.error('Token provider: Stream API key is missing');
    throw new Error('Stream API key is missing');
  }
  
  if (!STREAM_API_SECRET) {
    console.error('Token provider: Stream API secret is missing');
    throw new Error('Stream API secret is missing');
  }

  // Check if we have a valid cached token
  const cached = tokenCache.get(user.id);
  const now = Math.floor(Date.now() / 1000);
  
  if (cached && cached.expiresAt > now + 300) { // 5 minute buffer
    console.log('Token provider: Using cached token for user:', user.id);
    return cached.token;
  }

  try {
    const streamClient = new StreamClient(STREAM_API_KEY, STREAM_API_SECRET);

    const now = Math.floor(Date.now() / 1000);
    const expirationTime = now + 3600;
    const issuedAt = now - 5;

    // Create token with full permissions for all participants
    const token = streamClient.createToken(user.id, expirationTime, issuedAt);
    
    // Cache the token
    tokenCache.set(user.id, { token, expiresAt: expirationTime });
    
    console.log('Token provider: New token created for user:', user.id);
    return token;
  } catch (error) {
    console.error('Token provider: Error creating token:', error);
    throw new Error('Failed to create authentication token');
  }
};
