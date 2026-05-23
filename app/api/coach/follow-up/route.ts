import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

import { requireCurrentUser } from '@/server/auth/currentUser';
import { toCoachErrorResponse } from '@/server/ai/errors';
import { askFollowUpServer } from '@/server/ai/providers';
import { withDb } from '@/server/db/client';
import { settingsRepository } from '@/server/repositories/settings';
import { followUpPayloadSchema, parseJsonPayload } from '@/server/validation/coach';

export async function POST(request: Request) {
  let user;

  try {
    user = await requireCurrentUser();
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    throw error;
  }

  const parsedPayload = parseJsonPayload(followUpPayloadSchema, await readJson(request));

  if (!parsedPayload.success) {
    return NextResponse.json({ error: 'Invalid coach follow-up payload' }, { status: 400 });
  }

  try {
    const apiKey = await withDb((db) =>
      settingsRepository(db).getProviderApiKey(
        new ObjectId(user.id),
        parsedPayload.data.provider,
      ),
    );
    const result = await askFollowUpServer({
      ...parsedPayload.data,
      apiKey,
    });

    return NextResponse.json({ result });
  } catch (error) {
    const response = toCoachErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
