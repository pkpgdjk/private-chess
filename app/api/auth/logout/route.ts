import { NextResponse } from 'next/server';

import {
  clearSessionCookie,
  hashSessionToken,
  readSessionCookie,
} from '@/server/auth/session';
import { deleteByTokenHash } from '@/server/repositories/sessions';

export async function POST() {
  const token = await readSessionCookie();

  if (token) {
    await deleteByTokenHash(await hashSessionToken(token));
  }

  await clearSessionCookie();

  return NextResponse.json({ ok: true });
}
