import { beforeEach, describe, expect, it, vi } from 'vitest';

const findByUsernameMock = vi.hoisted(() => vi.fn());
const markLoginMock = vi.hoisted(() => vi.fn());
const createSessionMock = vi.hoisted(() => vi.fn());
const verifyPasswordMock = vi.hoisted(() => vi.fn());
const createSessionTokenMock = vi.hoisted(() => vi.fn());
const hashSessionTokenMock = vi.hoisted(() => vi.fn());
const setSessionCookieMock = vi.hoisted(() => vi.fn());

vi.mock('@/server/repositories/users', () => ({
  findByUsername: findByUsernameMock,
  markLogin: markLoginMock,
}));

vi.mock('@/server/repositories/sessions', () => ({
  createSession: createSessionMock,
}));

vi.mock('@/server/auth/password', () => ({
  verifyPassword: verifyPasswordMock,
}));

vi.mock('@/server/auth/session', () => ({
  createSessionToken: createSessionTokenMock,
  hashSessionToken: hashSessionTokenMock,
  setSessionCookie: setSessionCookieMock,
}));

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    findByUsernameMock.mockResolvedValue({
      _id: { toHexString: () => 'user-id' },
      username: 'capablanca',
      passwordHash: 'stored-password-hash',
      disabled: false,
    });
    verifyPasswordMock.mockResolvedValue(true);
    createSessionTokenMock.mockReturnValue('raw-session-token');
    hashSessionTokenMock.mockResolvedValue('hashed-session-token');
    createSessionMock.mockResolvedValue(undefined);
    markLoginMock.mockResolvedValue(undefined);
    setSessionCookieMock.mockResolvedValue(undefined);
  });

  it('accepts username/password JSON and creates a session cookie', async () => {
    const { POST } = await import('../../../app/api/auth/login/route');

    const response = await POST(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'capablanca',
          password: 'correct horse battery staple',
        }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      user: {
        id: 'user-id',
        username: 'capablanca',
      },
    });
    expect(response.status).toBe(200);
    expect(findByUsernameMock).toHaveBeenCalledWith('capablanca');
    expect(verifyPasswordMock).toHaveBeenCalledWith(
      'correct horse battery staple',
      'stored-password-hash',
    );
    expect(createSessionMock).toHaveBeenCalledWith(
      { toHexString: expect.any(Function) },
      'hashed-session-token',
    );
    expect(markLoginMock).toHaveBeenCalledWith({
      toHexString: expect.any(Function),
    });
    expect(setSessionCookieMock).toHaveBeenCalledWith('raw-session-token');
  });

  it('rejects payloads without username and password', async () => {
    const { POST } = await import('../../../app/api/auth/login/route');

    const response = await POST(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'capablanca' }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: 'Invalid login payload',
    });
    expect(response.status).toBe(400);
    expect(findByUsernameMock).not.toHaveBeenCalled();
  });
});
