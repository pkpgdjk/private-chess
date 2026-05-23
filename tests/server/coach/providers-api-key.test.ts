import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { askFollowUpWithAnthropic } from '@/server/ai/anthropic';
import { askFollowUpWithOpenAI } from '@/server/ai/openai';

describe('server AI providers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the explicit user OpenAI key for provider requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_text: 'Look for checks.' }), {
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await askFollowUpWithOpenAI({
      apiKey: 'sk-user-openai',
      question: 'What should I do?',
      context: { fen: 'startpos', moveHistory: [], language: 'en' },
      model: 'gpt-mini',
      effort: 'low',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-user-openai',
        }),
      }),
    );
  });

  it('uses the explicit user Anthropic key for provider requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ content: [{ type: 'text', text: 'Develop pieces.' }] }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await askFollowUpWithAnthropic({
      apiKey: 'sk-user-anthropic',
      question: 'What should I do?',
      context: { fen: 'startpos', moveHistory: [], language: 'en' },
      model: 'haiku',
      effort: 'low',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-key': 'sk-user-anthropic',
        }),
      }),
    );
  });
});
