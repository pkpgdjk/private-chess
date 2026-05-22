import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

import { requireCurrentUser } from '@/server/auth/currentUser';
import { getDb } from '@/server/db/client';
import {
  coachMemoryRepository,
  type CoachMemoryEntry,
} from '@/server/repositories/coachMemory';
import { gamesRepository } from '@/server/repositories/games';
import { savedGameSchema } from '@/server/validation/games';

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
    const games = await gamesRepository(db).list(new ObjectId(user.id));

    return NextResponse.json({ games });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const parsedGame = savedGameSchema.safeParse(await readJson(request));

    if (!parsedGame.success) {
      return NextResponse.json(
        { error: 'Invalid saved game payload' },
        { status: 400 },
      );
    }

    const userId = new ObjectId(user.id);
    const db = await getDb();
    const savedGame = await gamesRepository(db).save(userId, parsedGame.data);
    const { game } = savedGame;
    let coachMemory: CoachMemoryEntry[] = [];

    if (savedGame.created) {
      try {
        coachMemory = await coachMemoryRepository(db).recordGame(
          userId,
          game.moveHistory,
          game.playerColor,
        );
      } catch (error) {
        console.warn('Failed to record coach memory for saved game', error);
      }
    }

    return NextResponse.json({ game, coachMemory }, { status: 201 });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}
