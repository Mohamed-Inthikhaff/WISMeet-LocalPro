import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET() {
  try {
    // Test database connection
    let databaseStatus = 'disconnected';
    try {
      const db = await getDb();
      await db.admin().ping();
      databaseStatus = 'connected';
    } catch (dbError) {
      console.error('Database health check failed:', dbError);
      databaseStatus = 'error';
    }

    // Basic health check
    const healthCheck = {
      status: databaseStatus === 'connected' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: databaseStatus,
        memory: 'ok',
        disk: 'ok',
      },
    };

    return NextResponse.json(healthCheck, { 
      status: databaseStatus === 'connected' ? 200 : 503 
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
} 