import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

import { requireCurrentUser } from '@/server/auth/currentUser';
import { getDb } from '@/server/db/client';
import { settingsRepository } from '@/server/repositories/settings';
import { settingsPatchSchema } from '@/server/validation/settings';

async function readSettingsPatch(request: Request) {
  try {
    return settingsPatchSchema.safeParse(await request.json());
  } catch {
    return settingsPatchSchema.safeParse(undefined);
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
    const settings = await settingsRepository(db).getForUser(
      new ObjectId(user.id),
    );

    return NextResponse.json({ settings });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireCurrentUser();
    const parsedPatch = await readSettingsPatch(request);

    if (!parsedPatch.success) {
      return NextResponse.json(
        { error: 'Invalid settings payload' },
        { status: 400 },
      );
    }

    const db = await getDb();
    const settings = await settingsRepository(db).patchForUser(
      new ObjectId(user.id),
      parsedPatch.data,
    );

    return NextResponse.json({ settings });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}
