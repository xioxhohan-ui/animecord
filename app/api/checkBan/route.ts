import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded: any = verifyToken(token);
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [user] = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
    if (!user || user.banned) {
      return NextResponse.json({ status: 'banned', error: 'Banned' }, { status: 403 });
    }
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
