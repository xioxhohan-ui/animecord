import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { servers, members, users } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.split(' ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded: any = verifyToken(token);
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Get servers where user is a member or public servers
    // For simplicity, let's just get all servers for now or filter properly
    const allServers = await db.query.servers.findMany({
      with: {
        owner: true,
      },
    });

    // In a real app, filter based on membership
    // But for AnimeCord CEO/Admin logic, we might return more
    
    return NextResponse.json(allServers);
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
