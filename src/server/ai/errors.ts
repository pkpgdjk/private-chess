export type CoachProviderErrorCode = 'missing_config' | 'rate_limited' | 'upstream';

export class CoachProviderError extends Error {
  readonly code: CoachProviderErrorCode;

  constructor(code: CoachProviderErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'CoachProviderError';
    this.code = code;
  }
}

export function toCoachErrorResponse(error: unknown): {
  status: number;
  body: { error: string };
} {
  if (error instanceof CoachProviderError) {
    if (error.code === 'missing_config') {
      return {
        status: 503,
        body: { error: 'AI coach is not configured' },
      };
    }

    if (error.code === 'rate_limited') {
      return {
        status: 429,
        body: { error: 'AI coach provider is rate limited' },
      };
    }

    return {
      status: 502,
      body: { error: 'AI coach provider request failed' },
    };
  }

  return {
    status: 500,
    body: { error: 'AI coach request failed' },
  };
}
