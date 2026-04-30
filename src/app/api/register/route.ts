import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, signToken } from '@/lib/auth';
import { nanoid } from 'nanoid';

export async function POST(request: Request) {
  try {
    const { username, password, displayName, deviceId } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing username or password' }, { status: 400 });
    }

    // Check if username taken
    const [existing] = await db.select().from(users).where(eq(users.username, username.toLowerCase())).limit(1);
    if (existing) {
      return NextResponse.json({ error: 'Username taken' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const userId = nanoid();

    const [newUser] = await db.insert(users).values({
      id: userId,
      username: username.toLowerCase(),
      passwordHash: hashedPassword,
      displayName: displayName || username,
      role: 'USER',
      avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${username}&backgroundColor=b6e3f4`,
      banner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop',
      bio: 'New to AnimeCord!',
      deviceId: deviceId || null,
      coins: 10,
    }).returning();

    const token = signToken({ id: newUser.id, username: newUser.username, role: newUser.role });

    const { passwordHash, ...safeUser } = newUser;
    return NextResponse.json({ token, user: safeUser });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
