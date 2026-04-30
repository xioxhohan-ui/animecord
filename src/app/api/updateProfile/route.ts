import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { validateUser } from '@/lib/api-utils';

export async function POST(request: Request) {
  const { error, user } = await validateUser(request);
  if (error) return error;

  try {
    const updates = await request.json();
    
    const allowed = ['displayName', 'avatar', 'banner', 'bio', 'status', 'activeFrame'];
    const filteredUpdates: any = {};
    
    allowed.forEach(key => {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    });

    const [updated] = await db.update(users)
      .set({
        ...filteredUpdates,
        lastActive: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    const { passwordHash, ...safeUser } = updated;
    return NextResponse.json({ user: safeUser });
  } catch (err: any) {
    console.error('updateProfile error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
