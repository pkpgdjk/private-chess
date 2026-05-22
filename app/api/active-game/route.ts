import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

import { requireCurrentUser } from '@/server/auth/currentUser';
import { getDb } from '@/server/db/client';
import { activeGamesRepository } from '@/server/repositories/activeGames';
import { activeGameSchema } from '@/server/validation/games';

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

function unauthorizedResponse(error: unknown) {
  if (error instanceof Response) {
    return error;
  }

  throw error;
}

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const db = await getDb();
    const activeGame = await activeGamesRepository(db).get(
      new ObjectId(user.id),
    );

    return NextResponse.json({ activeGame });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireCurrentUser();
    const parsedActiveGame = activeGameSchema.safeParse(await readJson(request));

    if (!parsedActiveGame.success) {
      return NextResponse.json(
        { error: 'Invalid active game payload' },
        { status: 400 },
      );
    }

    const db = await getDb();
    const activeGame = await activeGamesRepository(db).put(
      new ObjectId(user.id),
      parsedActiveGame.data,
    );

    return NextResponse.json({ activeGame });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}

export async function DELETE() {
  try {
    const user = await requireCurrentUser();
    const db = await getDb();
    await activeGamesRepository(db).delete(new ObjectId(user.id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}
