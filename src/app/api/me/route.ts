import { NextResponse } from 'next/server';
import { validateUser } from '@/lib/api-utils';

export async function GET(request: Request) {
  const { error, user } = await validateUser(request);
  if (error) return error;

  const { passwordHash, ...safeUser } = user;
  return NextResponse.json({ user: safeUser });
}
