const ENCRYPTED_API_KEY_VERSION = 'v1';
const IV_BYTES = 12;

type ProviderApiKey = string | null | undefined;

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;

  if (!secret) {
    throw new Error('AUTH_SESSION_SECRET is required to encrypt API keys');
  }

  return secret;
}

async function getEncryptionKey() {
  const secretBytes = new TextEncoder().encode(getSessionSecret());
  const hash = await crypto.subtle.digest('SHA-256', secretBytes);

  return crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
}

function encodeBase64(bytes: Uint8Array) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function decodeBase64(value: string) {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(value, 'base64'));
  }

  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function encryptApiKey(apiKey: ProviderApiKey) {
  const trimmed = apiKey?.trim();

  if (!trimmed) {
    return null;
  }

  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await getEncryptionKey(),
    new TextEncoder().encode(trimmed),
  );

  return [
    ENCRYPTED_API_KEY_VERSION,
    encodeBase64(iv),
    encodeBase64(new Uint8Array(encrypted)),
  ].join(':');
}

export async function decryptApiKey(encryptedApiKey: ProviderApiKey) {
  if (!encryptedApiKey) {
    return null;
  }

  const [version, iv, encrypted] = encryptedApiKey.split(':');

  if (version !== ENCRYPTED_API_KEY_VERSION || !iv || !encrypted) {
    return null;
  }

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: decodeBase64(iv) },
      await getEncryptionKey(),
      decodeBase64(encrypted),
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}
