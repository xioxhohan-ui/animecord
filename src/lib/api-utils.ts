import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth';

export async function getAuthUser(request: Request) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token) return null;

  const decoded: any = verifyToken(token);
  if (!decoded) return null;

  try {
    const [user] = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
    return user || null;
  } catch (error) {
    return null;
  }
}

export async function validateUser(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null };
  }
  if (user.banned) {
    return { error: NextResponse.json({ error: 'Banned', status: 'banned' }, { status: 403 }), user: null };
  }
  return { error: null, user };
}
