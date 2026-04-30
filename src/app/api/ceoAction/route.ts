import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, messages, moderationLogs, bannedUsers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { validateUser } from '@/lib/api-utils';
import { nanoid } from 'nanoid';

export async function POST(request: Request) {
  const { error, user: admin } = await validateUser(request);
  if (error) return error;

  if (!['CEO', 'ADMIN'].includes(admin.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action, payload } = await request.json();

    if (action === 'ban') {
      const { userId, reason } = payload;
      const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      if (target.role === 'CEO') return NextResponse.json({ error: 'Cannot ban CEO' }, { status: 400 });

      // Update user
      await db.update(users).set({ banned: true }).where(eq(users.id, userId));

      // Add to banned_users table
      await db.insert(bannedUsers).values({
        id: nanoid(),
        userId: target.id,
        username: target.username,
        reason: reason || 'No reason provided',
      });

      // Purge messages
      await db.delete(messages).where(eq(messages.senderId, userId));

      // Log action
      await db.insert(moderationLogs).values({
        id: nanoid(),
        actionType: 'USER_BAN',
        targetId: userId,
        performedBy: admin.id,
        reason: reason || 'No reason provided',
      });

      return NextResponse.json({ success: true, message: 'User permanently banned' });
    }

    if (action === 'promote_admin') {
      const { userId } = payload;
      
      await db.update(users)
        .set({ role: 'ADMIN', coins: 30 })
        .where(eq(users.id, userId));

      await db.insert(moderationLogs).values({
        id: nanoid(),
        actionType: 'ADMIN_PROMOTION',
        targetId: userId,
        performedBy: admin.id,
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'adjust_balance') {
      const { userId, amount } = payload;
      await db.update(users).set({ coins: Number(amount) }).where(eq(users.id, userId));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('ceoAction error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
