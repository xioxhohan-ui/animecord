import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, users } from '@/lib/db/schema';
import { eq, and, gt, sql } from 'drizzle-orm';
import { validateUser } from '@/lib/api-utils';
import { nanoid } from 'nanoid';
import { triggerRealtime } from '@/lib/pusher';

export async function POST(request: Request) {
  const { error, user } = await validateUser(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { action, payload } = body;

    // Handle Delete
    if (action === 'delete') {
      const { messageId } = payload;
      const [msg] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
      if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      
      if (msg.senderId !== user.id && !['CEO', 'ADMIN'].includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      await db.delete(messages).where(eq(messages.id, messageId));
      await triggerRealtime(`channel-${msg.channelId}`, 'message-deleted', { messageId });
      
      return NextResponse.json({ success: true });
    }

    // Handle React
    if (action === 'react') {
      const { messageId, emoji } = payload;
      const [msg] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
      if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const reactions = (msg.reactions as Record<string, string[]>) || {};
      if (!reactions[emoji]) reactions[emoji] = [];

      const uIdx = reactions[emoji].indexOf(user.id);
      if (uIdx !== -1) reactions[emoji].splice(uIdx, 1);
      else reactions[emoji].push(user.id);

      const [updated] = await db.update(messages)
        .set({ reactions })
        .where(eq(messages.id, messageId))
        .returning();

      await triggerRealtime(`channel-${msg.channelId}`, 'message-updated', updated);
      return NextResponse.json(updated);
    }

    // Default: Send Message
    const { channelId, content, attachments } = body;
    if (!channelId || !content?.trim()) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Rate limiting / Spam protection
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const recentMessages = await db.select()
      .from(messages)
      .where(and(eq(messages.senderId, user.id), gt(messages.timestamp, fiveSecondsAgo)));

    if (recentMessages.length >= 10) {
      await db.update(users)
        .set({ riskScore: sql`${users.riskScore} + 20` })
        .where(eq(users.id, user.id));
      return NextResponse.json({ error: 'Slow down! Too many messages.' }, { status: 429 });
    }

    const newMessage = {
      id: nanoid(),
      channelId,
      senderId: user.id,
      content: content.trim(),
      attachments: attachments || null,
      reactions: {},
      timestamp: new Date(),
    };

    const [savedMsg] = await db.insert(messages).values(newMessage).returning();
    
    // Add sender info for frontend
    const msgWithSender = {
      ...savedMsg,
      senderName: user.displayName,
      senderAvatar: user.avatar,
      senderFrame: user.activeFrame
    };

    await triggerRealtime(`channel-${channelId}`, 'new-message', msgWithSender);

    return NextResponse.json(msgWithSender, { status: 201 });
  } catch (err: any) {
    console.error('sendMessage error:', err);
    return NextResponse.json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}
