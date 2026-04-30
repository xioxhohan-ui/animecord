import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { servers, members, channels, users } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { validateUser } from '@/lib/api-utils';
import { nanoid } from 'nanoid';

export async function POST(request: Request) {
  const { error, user } = await validateUser(request);
  if (error) return error;

  try {
    const { action, payload } = await request.json();

    if (action === 'create') {
      const serverId = nanoid();
      const inviteCode = nanoid(8);
      
      const [newServer] = await db.insert(servers).values({
        id: serverId,
        name: payload.name,
        ownerId: user.id,
        inviteCode,
      }).returning();

      // Create general channel
      await db.insert(channels).values({
        id: nanoid(),
        serverId,
        name: 'general',
      });

      // Add owner as member
      await db.insert(members).values({
        id: nanoid(),
        serverId,
        userId: user.id,
        role: 'owner',
      });

      return NextResponse.json(newServer);
    }

    if (action === 'join') {
      let server;
      if (payload.inviteCode) {
        [server] = await db.select().from(servers).where(eq(servers.inviteCode, payload.inviteCode)).limit(1);
      } else if (payload.serverId) {
        [server] = await db.select().from(servers).where(eq(servers.id, payload.serverId)).limit(1);
      }

      if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 });

      // Check if already a member
      const [existingMember] = await db.select().from(members)
        .where(and(eq(members.serverId, server.id), eq(members.userId, user.id)))
        .limit(1);

      if (existingMember) return NextResponse.json({ error: 'Already a member' }, { status: 400 });

      await db.insert(members).values({
        id: nanoid(),
        serverId: server.id,
        userId: user.id,
        role: 'member',
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'leave') {
      await db.delete(members).where(and(eq(members.serverId, payload.serverId), eq(members.userId, user.id)));
      return NextResponse.json({ success: true });
    }

    if (action === 'edit') {
      const [server] = await db.select().from(servers).where(eq(servers.id, payload.serverId)).limit(1);
      if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      if (server.ownerId !== user.id && user.role !== 'CEO') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const [updated] = await db.update(servers)
        .set({
          name: payload.name,
          avatar: payload.avatar,
          banner: payload.banner,
          description: payload.description,
        })
        .where(eq(servers.id, payload.serverId))
        .returning();

      return NextResponse.json(updated);
    }

    if (action === 'delete') {
      const [server] = await db.select().from(servers).where(eq(servers.id, payload.serverId)).limit(1);
      if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      if (server.ownerId !== user.id && user.role !== 'CEO') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      await db.delete(servers).where(eq(servers.id, payload.serverId));
      return NextResponse.json({ success: true });
    }

    if (action === 'create_invite') {
      const [server] = await db.select().from(servers).where(eq(servers.id, payload.serverId)).limit(1);
      if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      if (server.ownerId !== user.id && user.role !== 'CEO') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const inviteCode = nanoid(8);
      await db.update(servers).set({ inviteCode }).where(eq(servers.id, payload.serverId));
      
      return NextResponse.json({ inviteCode });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('serverAction error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
