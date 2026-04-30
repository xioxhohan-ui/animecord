import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { servers, members } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  try {
    const [server] = await db.select({
      id: servers.id,
      name: servers.name,
      avatar: servers.avatar,
      banner: servers.banner,
      memberCount: sql<number>`(SELECT count(*) FROM ${members} WHERE ${members.serverId} = ${servers.id})`.mapWith(Number)
    })
    .from(servers)
    .where(eq(servers.inviteCode, code))
    .limit(1);

    if (!server) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });

    return NextResponse.json(server);
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
