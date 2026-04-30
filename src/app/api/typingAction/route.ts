import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { validateUser } from '@/lib/api-utils';
import { triggerRealtime } from '@/lib/pusher';

// Note: In a real serverless env, "remote typing" state would need a cache like Redis.
// For now, we'll just trigger the event for Pusher to broadcast.

export async function POST(request: Request) {
  const { error, user } = await validateUser(request);
  if (error) return error;

  try {
    const { channelId } = await request.json();
    if (!channelId) return NextResponse.json({ error: 'Missing channelId' }, { status: 400 });

    await triggerRealtime(`channel-${channelId}`, 'user-typing', {
      userId: user.id,
      userName: user.displayName || user.username,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  // Ephemeral typing state is usually handled purely via Pusher client-side.
  // This GET would normally return from a cache.
  return NextResponse.json([]);
}
