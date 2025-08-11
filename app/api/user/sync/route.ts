import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { syncCurrentUser } from '@/lib/user-management';

/**
 * POST /api/user/sync
 * Syncs current user data from Clerk to database
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Syncing user data for:', userId);
    
    const result = await syncCurrentUser();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'User data synced successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to sync user data', details: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error syncing user data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/sync
 * Check if user data is synced
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: 'User sync endpoint is working',
      userId
    });

  } catch (error) {
    console.error('Error checking user sync:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 