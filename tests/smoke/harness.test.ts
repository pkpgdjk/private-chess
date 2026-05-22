import { describe, expect, it } from 'vitest';

describe('test harness', () => {
  it('loads default environment variables', () => {
    expect(process.env.MONGODB_URI).toBeTruthy();
    expect(process.env.MONGODB_DB).toBeTruthy();
    expect(process.env.AUTH_SESSION_SECRET?.length).toBeGreaterThanOrEqual(32);
  });
});
