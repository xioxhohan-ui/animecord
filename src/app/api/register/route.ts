import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';
import { hashPassword, signToken } from '@/lib/auth';
import { nanoid } from 'nanoid';

export async function POST(request: Request) {
  try {
    const { username, password, displayName, deviceId } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Check if username exists
    const [existingUser] = await db.select().from(users).where(eq(users.username, username.toLowerCase())).limit(1);
    if (existingUser) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const userId = nanoid();

    const newUser = {
      id: userId,
      username: username.toLowerCase(),
      passwordHash: hashedPassword,
      displayName: displayName || username,
      role: 'USER',
      avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${username}&backgroundColor=b6e3f4`,
      deviceId,
      coins: 100,
    };

    await db.insert(users).values(newUser);

    const token = signToken({ id: userId, username: username.toLowerCase(), role: 'USER' });

    const { passwordHash, ...safeUser } = newUser;
    return NextResponse.json({ token, user: safeUser });
  } catch (error: any) {
    console.error('Registration error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
