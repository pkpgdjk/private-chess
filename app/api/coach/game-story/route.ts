import { NextResponse } from 'next/server';

import { requireCurrentUser } from '@/server/auth/currentUser';
import { toCoachErrorResponse } from '@/server/ai/errors';
import { analyzeGameServer } from '@/server/ai/providers';
import { gameStoryPayloadSchema, parseJsonPayload } from '@/server/validation/coach';

export async function POST(request: Request) {
  const unauthorized = await getUnauthorizedResponse();

  if (unauthorized) {
    return unauthorized;
  }

  const parsedPayload = parseJsonPayload(gameStoryPayloadSchema, await readJson(request));

  if (!parsedPayload.success) {
    return NextResponse.json({ error: 'Invalid coach game story payload' }, { status: 400 });
  }

  try {
    const result = await analyzeGameServer(parsedPayload.data);

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

async function getUnauthorizedResponse(): Promise<Response | null> {
  try {
    await requireCurrentUser();
    return null;
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    throw error;
  }
}
