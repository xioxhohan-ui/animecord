import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, moderationLogs } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { validateUser } from '@/lib/api-utils';
import { nanoid } from 'nanoid';

const FRAMES = [
  { id: 'f1', name: 'Zhongli Geo', filename: 'zhongli.PNG' },
  { id: 'f2', name: 'Raiden Electro', filename: 'raiden.PNG' },
  { id: 'f3', name: 'Venti Anemo', filename: 'venti.PNG' },
  { id: 'f4', name: 'Nahida Dendro', filename: 'nahida.PNG' },
  { id: 'f5', name: 'Furina Hydro', filename: 'furina.PNG' },
  { id: 'f6', name: 'Xiao Mask', filename: 'xiao.PNG' },
  { id: 'f7', name: 'Hutao Ghost', filename: 'hutao.PNG' },
  { id: 'f8', name: 'Klee Boom', filename: 'klee.PNG' },
  { id: 'f9', name: 'Ganyu Cryo', filename: 'ganyu.PNG' },
  { id: 'f10', name: 'Ayaka Cryo', filename: 'ayaka.PNG' },
];

export async function POST(request: Request) {
  const { error, user } = await validateUser(request);
  if (error) return error;

  try {
    const { action, payload } = await request.json();

    if (action === 'claim') {
      const { frameId } = payload;
      const targetFrame = FRAMES.find(f => f.id === frameId);
      if (!targetFrame) return NextResponse.json({ error: 'Frame not found' }, { status: 404 });

      // Use JSONB append logic
      await db.update(users)
        .set({
          ownedFrames: sql`COALESCE(owned_frames, '[]'::jsonb) || jsonb_build_array(${frameId})`
        })
        .where(eq(users.id, user.id));

      return NextResponse.json({ success: true });
    }

    if (action === 'equip') {
      const { frameId } = payload;
      
      // Verification if owned (unless CEO)
      if (user.role !== 'CEO' && frameId) {
        const owned = (user.ownedFrames as string[]) || [];
        if (!owned.includes(frameId)) {
          return NextResponse.json({ error: 'Frame not owned' }, { status: 403 });
        }
      }

      const [updated] = await db.update(users)
        .set({ activeFrame: frameId || null })
        .where(eq(users.id, user.id))
        .returning();

      return NextResponse.json({ user: updated });
    }

    if (action === 'gift') {
      if (!['CEO', 'ADMIN'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      
      const { toUserId, frameId } = payload;
      
      await db.update(users)
        .set({
          ownedFrames: sql`COALESCE(owned_frames, '[]'::jsonb) || jsonb_build_array(${frameId})`
        })
        .where(eq(users.id, toUserId));

      await db.insert(moderationLogs).values({
        id: nanoid(),
        actionType: 'FRAME_GIFT',
        targetId: toUserId,
        performedBy: user.id,
        reason: `Gifted frame ${frameId}`,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('frameAction error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(FRAMES);
}
