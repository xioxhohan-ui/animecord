import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const result = await db.execute(sql`SELECT 1`);
    return NextResponse.json({ 
      status: 'ok', 
      database: 'connected',
      env: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        POSTGRES_URL: !!process.env.POSTGRES_URL,
        NODE_ENV: process.env.NODE_ENV
      }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      status: 'error', 
      message: error.message,
      env: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        POSTGRES_URL: !!process.env.POSTGRES_URL,
        NODE_ENV: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
}
