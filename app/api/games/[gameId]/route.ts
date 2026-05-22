import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

import { requireCurrentUser } from '@/server/auth/currentUser';
import { getDb } from '@/server/db/client';
import { gamesRepository } from '@/server/repositories/games';
import { savedGamePatchSchema } from '@/server/validation/games';

type RouteContext = {
  params: Promise<{ gameId: string }>;
};

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

async function getGameId(context: RouteContext): Promise<string> {
  const { gameId } = await context.params;
  return gameId;
}

function unauthorizedResponse(error: unknown) {
  if (error instanceof Response) {
    return error;
  }

  throw error;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireCurrentUser();
    const db = await getDb();
    const game = await gamesRepository(db).get(
      new ObjectId(user.id),
      await getGameId(context),
    );

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({ game });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireCurrentUser();
    const parsedPatch = savedGamePatchSchema.safeParse(await readJson(request));

    if (!parsedPatch.success) {
      return NextResponse.json(
        { error: 'Invalid saved game patch payload' },
        { status: 400 },
      );
    }

    const db = await getDb();
    const game = await gamesRepository(db).patch(
      new ObjectId(user.id),
      await getGameId(context),
      parsedPatch.data,
    );

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({ game });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireCurrentUser();
    const db = await getDb();
    const deleted = await gamesRepository(db).delete(
      new ObjectId(user.id),
      await getGameId(context),
    );

    if (!deleted) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}
