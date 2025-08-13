/**
 * User Management System
 * Handles storing and retrieving user data including email addresses
 */

import { getDb, COLLECTIONS } from './mongodb';
import { currentUser } from '@clerk/nextjs/server';

export interface UserData {
  userId: string;
  email: string;
  name: string;
  role?: 'client' | 'advisor' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Stores user data in database when they register or sign in
 */
export const storeUserData = async (userData: {
  userId: string;
  email: string;
  name: string;
  role?: 'client' | 'advisor' | 'admin';
}) => {
  try {
    const db = await getDb();
    const usersCollection = db.collection('users');
    
    const now = new Date();
    
    // Upsert user data (create if doesn't exist, update if exists)
    await usersCollection.updateOne(
      { userId: userData.userId },
      {
        $set: {
          ...userData,
          updatedAt: now
        },
        $setOnInsert: {
          createdAt: now
        }
      },
      { upsert: true }
    );
    
    console.log(`✅ Stored user data for: ${userData.email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error storing user data:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Gets user data from database by userId
 */
export const getUserData = async (userId: string): Promise<UserData | null> => {
  try {
    const db = await getDb();
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ userId });
    
    if (user) {
      console.log(`✅ Found user data for: ${user.email}`);
      return user as unknown as UserData;
    } else {
      console.log(`⚠️ No user data found for userId: ${userId}`);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting user data:', error);
    return null;
  }
};

/**
 * Gets multiple users by their userIds
 */
export const getUsersData = async (userIds: string[]): Promise<UserData[]> => {
  try {
    const db = await getDb();
    const usersCollection = db.collection('users');
    
    const users = await usersCollection
      .find({ userId: { $in: userIds } })
      .toArray();
    
    console.log(`✅ Found ${users.length} users out of ${userIds.length} requested`);
    return users as unknown as UserData[];
  } catch (error) {
    console.error('❌ Error getting users data:', error);
    return [];
  }
};

/**
 * Syncs current user data from Clerk to database
 */
export const syncCurrentUser = async () => {
  try {
    const user = await currentUser();
    
    if (!user) {
      console.log('⚠️ No authenticated user found');
      return { success: false, error: 'No authenticated user' };
    }
    
    const userData = {
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      name: user.fullName || user.firstName || user.username || user.id,
      role: 'client' as const // Default role
    };
    
    return await storeUserData(userData);
  } catch (error) {
    console.error('❌ Error syncing current user:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Gets user email by userId (with fallback to hardcoded mapping)
 */
export const getUserEmail = async (userId: string): Promise<string | null> => {
  try {
    // First try to get from database
    const userData = await getUserData(userId);
    if (userData?.email) {
      return userData.email;
    }
    
    // Fallback to hardcoded mapping for existing users
    const fallbackMapping: Record<string, string> = {
      'user_30UvuQl3AxXMrVmTMuwXryqb9sO': 'mohamed.inthikhaff@wismortgages.co.uk',
      'user_30UzCEBdvTqa7ehrzBmoft0cLku': 'mhdinthikaff@gmail.com'
    };
    
    const fallbackEmail = fallbackMapping[userId];
    if (fallbackEmail) {
      console.log(`📧 Using fallback email for ${userId}: ${fallbackEmail}`);
      return fallbackEmail;
    }
    
    console.log(`⚠️ No email found for userId: ${userId}`);
    return null;
  } catch (error) {
    console.error('❌ Error getting user email:', error);
    return null;
  }
};

/**
 * Gets user name by userId (with fallback to hardcoded mapping)
 */
export const getUserName = async (userId: string): Promise<string | null> => {
  try {
    // First try to get from database
    const userData = await getUserData(userId);
    if (userData?.name) {
      return userData.name;
    }
    
    // Fallback to hardcoded mapping for existing users
    const fallbackMapping: Record<string, string> = {
      'user_30UvuQl3AxXMrVmTMuwXryqb9sO': 'Mohamed Inthikhaff | WIS Mortgages',
      'user_30UzCEBdvTqa7ehrzBmoft0cLku': 'Mohamed Inthikhaff'
    };
    
    const fallbackName = fallbackMapping[userId];
    if (fallbackName) {
      console.log(`👤 Using fallback name for ${userId}: ${fallbackName}`);
      return fallbackName;
    }
    
    console.log(`⚠️ No name found for userId: ${userId}`);
    return null;
  } catch (error) {
    console.error('❌ Error getting user name:', error);
    return null;
  }
}; 