import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { verifyToken } from '@/lib/auth';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  // Verify auth
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !verifyToken(authHeader.split(' ')[1])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!filename) {
    return NextResponse.json({ error: 'Missing filename' }, { status: 400 });
  }

  try {
    const blob = await put(filename, request.body!, {
      access: 'public',
    });

    return NextResponse.json(blob);
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed', details: error.message }, { status: 500 });
  }
}
