import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getUnifiedUser, saveUnifiedUser } from '@/lib/db/unified';
import { comparePassword, signToken, hashPassword } from '@/lib/auth';
import { nanoid } from 'nanoid';

export async function POST(request: Request) {
  try {
    const { username, password, deviceId } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing username or password' }, { status: 400 });
    }

    // Use the Unified Interface (Postgres with Blob Fallback)
    const result = await getUnifiedUser(username);
    let user = result?.user;

    // Auto-seed CEO if no users exist anywhere and trying to login as ceo
    if (!user && username.toLowerCase() === 'ceo') {
      const hashedPassword = await hashPassword('ceo123');
      user = {
        id: nanoid(),
        username: 'ceo',
        passwordHash: hashedPassword,
        displayName: 'CEO',
        role: 'CEO',
        avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=ceo',
        coins: 1000
      };
      await saveUnifiedUser(user);
    }

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
    console.error('Login error details:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
