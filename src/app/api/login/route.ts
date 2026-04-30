import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password, deviceId } = await request.json();

    const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase())).limit(1);

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.banned) {
      return NextResponse.json({ error: 'Your account has been permanently banned' }, { status: 403 });
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Update last active
    await db.update(users).set({ 
      lastActive: new Date(),
      deviceId: deviceId || user.deviceId
    }).where(eq(users.id, user.id));

    const token = signToken({ id: user.id, username: user.username, role: user.role });

    const { passwordHash, ...safeUser } = user;
    return NextResponse.json({ token, user: safeUser });
  } catch (error: any) {
    console.error('Login error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
