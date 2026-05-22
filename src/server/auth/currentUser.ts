import { hashSessionToken, readSessionCookie } from '@/server/auth/session';
import {
  findValidByTokenHash,
  touch as touchSession,
} from '@/server/repositories/sessions';
import { findById } from '@/server/repositories/users';

export type CurrentUser = {
  id: string;
  username: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await readSessionCookie();

  if (!token) {
    return null;
  }

  const tokenHash = await hashSessionToken(token);
  const session = await findValidByTokenHash(tokenHash);

  if (!session) {
    return null;
  }

  const user = await findById(session.userId);

  if (!user) {
    return null;
  }

  await touchSession(session._id);

  return {
    id: user._id.toHexString(),
    username: user.username,
  };
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Response('Unauthorized', { status: 401 });
  }

  return user;
}
