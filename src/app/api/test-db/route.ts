export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const start = Date.now();
    const result = await db.execute(sql`SELECT 1 as connected`);
    const duration = Date.now() - start;

    return NextResponse.json({ 
      status: 'ok', 
      database: 'connected',
      latency: `${duration}ms`,
      driver: 'neon-serverless',
      is_using_dummy: !process.env.POSTGRES_URL && !process.env.DATABASE_URL,
      env_check: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        POSTGRES_URL: !!process.env.POSTGRES_URL,
        BLOB_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
        NODE_ENV: process.env.NODE_ENV
      }
    });
  } catch (error: any) {
    console.error('Database connection test failed:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      env_check: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        POSTGRES_URL: !!process.env.POSTGRES_URL,
        NODE_ENV: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
}
