import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { validateUser } from '@/lib/api-utils';

export async function GET(request: Request) {
  const { error } = await validateUser(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get('channelId');

  if (!channelId) {
    return NextResponse.json({ error: 'Missing channelId' }, { status: 400 });
  }

  try {
    const data = await db.select({
      id: messages.id,
      channelId: messages.channelId,
      senderId: messages.senderId,
      content: messages.content,
      attachments: messages.attachments,
      reactions: messages.reactions,
      timestamp: messages.timestamp,
      senderName: users.displayName,
      senderAvatar: users.avatar,
      senderFrame: users.activeFrame,
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.channelId, channelId))
    .orderBy(desc(messages.timestamp))
    .limit(50);

    return NextResponse.json(data.reverse());
  } catch (err: any) {
    console.error('getMessages error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
