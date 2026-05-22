import { cookies } from 'next/headers';

import { getEnv } from '@/server/db/env';

export const sessionCookieName = 'private_chess_session';
export const sessionDurationMs = 30 * 24 * 60 * 60 * 1000;

const sessionTokenByteLength = 32;

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return globalThis
    .btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function textEncode(value: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(value);

  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

export function createSessionToken(): string {
  const bytes = new Uint8Array(sessionTokenByteLength);
  globalThis.crypto.getRandomValues(bytes);

  return base64UrlEncode(bytes);
}

export async function hashSessionToken(token: string): Promise<string> {
  const env = getEnv();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    textEncode(env.AUTH_SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    textEncode(token),
  );

  return base64UrlEncode(new Uint8Array(signature));
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(Date.now() + sessionDurationMs),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(sessionCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  });
}

export async function readSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();

  return cookieStore.get(sessionCookieName)?.value;
}
