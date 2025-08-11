'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

/**
 * Component that automatically syncs user data to database when user signs in
 */
const UserDataSync = () => {
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // Sync user data to database
      const syncUserData = async () => {
        try {
          console.log('🔄 Syncing user data for:', user.id);
          
          const response = await fetch('/api/user/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (response.ok) {
            console.log('✅ User data synced successfully');
          } else {
            console.warn('⚠️ Failed to sync user data');
          }
        } catch (error) {
          console.error('❌ Error syncing user data:', error);
        }
      };

      // Sync user data
      syncUserData();
    }
  }, [isLoaded, isSignedIn, user]);

  // This component doesn't render anything
  return null;
};

export default UserDataSync; 