import { NextResponse } from 'next/server';
import { z } from 'zod';

import { verifyPassword } from '@/server/auth/password';
import {
  createSessionToken,
  hashSessionToken,
  setSessionCookie,
} from '@/server/auth/session';
import { createSession } from '@/server/repositories/sessions';
import { findByUsername, markLogin } from '@/server/repositories/users';

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

async function readLoginPayload(request: Request) {
  try {
    return loginSchema.safeParse(await request.json());
  } catch {
    return loginSchema.safeParse(undefined);
  }
}

export async function POST(request: Request) {
  const parsedPayload = await readLoginPayload(request);

  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: 'Invalid login payload' },
      { status: 400 },
    );
  }

  const { username, password } = parsedPayload.data;
  const user = await findByUsername(username);

  if (!user || user.disabled) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const passwordIsValid = await verifyPassword(password, user.passwordHash);

  if (!passwordIsValid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = createSessionToken();
  const tokenHash = await hashSessionToken(token);

  await createSession(user._id, tokenHash);
  await markLogin(user._id);
  await setSessionCookie(token);

  return NextResponse.json({
    user: {
      id: user._id.toHexString(),
      username: user.username,
    },
  });
}
