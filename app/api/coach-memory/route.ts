import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

import { requireCurrentUser } from '@/server/auth/currentUser';
import { withDb } from '@/server/db/client';
import { coachMemoryRepository } from '@/server/repositories/coachMemory';

function unauthorizedResponse(error: unknown) {
  if (error instanceof Response) {
    return error;
  }

  throw error;
}

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const coachMemory = await withDb((db) =>
      coachMemoryRepository(db).list(new ObjectId(user.id)),
    );

    return NextResponse.json({ coachMemory });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}

export async function DELETE() {
  try {
    const user = await requireCurrentUser();
    const deletedCount = await withDb((db) =>
      coachMemoryRepository(db).clear(new ObjectId(user.id)),
    );

    return NextResponse.json({ ok: true, deletedCount });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}
