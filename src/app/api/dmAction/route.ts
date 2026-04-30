import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dms, users } from '@/lib/db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { validateUser } from '@/lib/api-utils';
import { nanoid } from 'nanoid';
import { triggerRealtime } from '@/lib/pusher';

export async function POST(request: Request) {
  const { error, user } = await validateUser(request);
  if (error) return error;

  try {
    const { action, payload } = await request.json();

    if (action === 'send') {
      const { toUserId, content } = payload;
      const dmKey = [user.id, toUserId].sort().join('::');

      const newMessage = {
        id: nanoid(),
        dmKey,
        senderId: user.id,
        receiverId: toUserId,
        content,
        timestamp: new Date(),
        read: false,
      };

      const [saved] = await db.insert(dms).values(newMessage).returning();

      // Trigger real-time event for receiver
      await triggerRealtime(`user-${toUserId}`, 'new-dm', {
        ...saved,
        senderName: user.displayName,
        senderAvatar: user.avatar,
      });

      return NextResponse.json(saved);
    }

    if (action === 'mark_read') {
      const { fromUserId } = payload;
      const dmKey = [user.id, fromUserId].sort().join('::');

      await db.update(dms)
        .set({ read: true })
        .where(and(eq(dms.dmKey, dmKey), eq(dms.receiverId, user.id)));

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('dmAction POST error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { error, user } = await validateUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'get_messages') {
      const otherUserId = searchParams.get('otherUserId');
      if (!otherUserId) return NextResponse.json({ error: 'Missing otherUserId' }, { status: 400 });

      const dmKey = [user.id, otherUserId].sort().join('::');
      const messages = await db.select().from(dms)
        .where(eq(dms.dmKey, dmKey))
        .orderBy(desc(dms.timestamp))
        .limit(50);

      return NextResponse.json(messages.reverse());
    }

    if (action === 'get_conversations') {
      // This is a bit complex in Drizzle/SQL to get unique conversations with last message.
      // We'll fetch recent messages where the user is involved and group them in JS for simplicity,
      // or use a more advanced SQL query if needed.
      
      const recentDms = await db.select({
        id: dms.id,
        dmKey: dms.dmKey,
        senderId: dms.senderId,
        receiverId: dms.receiverId,
        content: dms.content,
        timestamp: dms.timestamp,
        read: dms.read,
      })
      .from(dms)
      .where(or(eq(dms.senderId, user.id), eq(dms.receiverId, user.id)))
      .orderBy(desc(dms.timestamp));

      const convsMap = new Map();
      for (const m of recentDms) {
        const otherId = m.senderId === user.id ? m.receiverId : m.senderId;
        if (convsMap.has(otherId)) {
          if (!m.read && m.receiverId === user.id) {
            convsMap.get(otherId).unread++;
          }
          continue;
        }

        const [otherUser] = await db.select().from(users).where(eq(users.id, otherId!)).limit(1);
        if (!otherUser) continue;

        convsMap.set(otherId, {
          userId: otherId,
          displayName: otherUser.displayName,
          username: otherUser.username,
          avatar: otherUser.avatar,
          lastMessage: m.content,
          timestamp: m.timestamp,
          unread: (!m.read && m.receiverId === user.id) ? 1 : 0
        });
      }

      return NextResponse.json(Array.from(convsMap.values()));
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('dmAction GET error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
