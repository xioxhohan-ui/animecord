import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { validateUser } from '@/lib/api-utils';

export async function GET(request: Request) {
  const { error } = await validateUser(request);
  if (error) return error;

  try {
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatar: users.avatar,
      role: users.role,
      status: users.status,
      lastActive: users.lastActive,
      activeFrame: users.activeFrame,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.lastActive));

    const thirtySecondsAgo = Date.now() - 30000;
    const usersWithStatus = allUsers.map(u => ({
      ...u,
      isOnline: u.lastActive ? u.lastActive.getTime() > thirtySecondsAgo : false,
    }));

    return NextResponse.json(usersWithStatus);
  } catch (err: any) {
    console.error('getUsers error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
