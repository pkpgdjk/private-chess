import { hashSessionToken, readSessionCookie } from '@/server/auth/session';
import { collections } from '@/server/db/collections';
import { withDb } from '@/server/db/client';
import type { SessionDocument } from '@/server/repositories/sessions';
import type { UserDocument } from '@/server/repositories/users';

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

  return withDb(async (db) => {
    const sessions = db.collection<SessionDocument>(collections.sessions);
    const users = db.collection<UserDocument>(collections.users);
    const session = await sessions.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return null;
    }

    const user = await users.findOne({
      _id: session.userId,
      disabled: false,
    });

    if (!user) {
      return null;
    }

    return {
      id: user._id.toHexString(),
      username: user.username,
    };
  });
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Response('Unauthorized', { status: 401 });
  }

  return user;
}
