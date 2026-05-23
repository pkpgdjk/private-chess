import { stdin as input, stdout as output } from 'node:process';
import type { Readable, Writable } from 'node:stream';
import { pathToFileURL } from 'node:url';

import { loadLocalEnv } from './load-env';
import { hashPassword } from '../src/server/auth/password';
import { closeMongoClient } from '../src/server/db/client';
import {
  createUser,
  disable as disableUser,
  findByUsername,
  setPassword,
} from '../src/server/repositories/users';

loadLocalEnv();

type Command = 'create' | 'reset-password' | 'disable';

type PasswordPromptInput = Readable & {
  isTTY?: boolean;
  setRawMode?: (mode: boolean) => unknown;
};

type PasswordPromptOptions = {
  input?: PasswordPromptInput;
  output?: Writable;
};

function printHelp() {
  console.log(`Usage:
  npm run user:create -- <username>
  npm run user:reset-password -- <username>
  npm run user:disable -- <username>

Environment:
  MONGODB_URI           MongoDB connection string
  MONGODB_DB            Database name, defaults to private_chess
  AUTH_SESSION_SECRET   Secret used by auth helpers`);
}

function readCommand(value: string | undefined): Command | null {
  if (
    value === 'create' ||
    value === 'reset-password' ||
    value === 'disable'
  ) {
    return value;
  }

  return null;
}

function readUsername(value: string | undefined): string {
  const username = value?.trim();

  if (!username) {
    throw new Error('Username is required');
  }

  return username;
}

export function promptPassword(
  prompt: string,
  options: PasswordPromptOptions = {},
): Promise<string> {
  const promptInput = options.input ?? input;
  const promptOutput = options.output ?? output;
  const canUseRawMode =
    Boolean(promptInput.isTTY) && typeof promptInput.setRawMode === 'function';

  return new Promise((resolve, reject) => {
    let password = '';
    let settled = false;

    const cleanup = () => {
      promptInput.off('data', onData);

      if (canUseRawMode) {
        promptInput.setRawMode?.(false);
      }

      promptInput.pause();
    };

    const settle = (
      callback: (value: string) => void,
      value: string,
    ) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      promptOutput.write('\n');
      callback(value);
    };

    const onData = (chunk: Buffer | string) => {
      const value = chunk.toString('utf8');

      for (const character of value) {
        if (character === '\u0003') {
          settle(() => reject(new Error('Password prompt cancelled')), '');
          return;
        }

        if (character === '\r' || character === '\n') {
          settle(resolve, password);
          return;
        }

        if (character === '\u007f' || character === '\b') {
          password = password.slice(0, -1);
          continue;
        }

        password += character;
      }
    };

    promptOutput.write(prompt);

    if (canUseRawMode) {
      promptInput.setRawMode?.(true);
    }

    promptInput.on('data', onData);
    promptInput.resume();
  });
}

async function create(username: string): Promise<void> {
  const existingUser = await findByUsername(username);

  if (existingUser) {
    throw new Error(`User "${username}" already exists`);
  }

  const password = await promptPassword('Password: ');
  const passwordHash = await hashPassword(password);
  const user = await createUser(username, passwordHash);

  console.log(`created user ${user.username}`);
}

async function resetPassword(username: string): Promise<void> {
  const user = await findByUsername(username);

  if (!user) {
    throw new Error(`User "${username}" was not found`);
  }

  const password = await promptPassword('New password: ');
  const passwordHash = await hashPassword(password);
  await setPassword(user._id, passwordHash);

  console.log(`reset password for ${user.username}`);
}

async function disable(username: string): Promise<void> {
  const user = await findByUsername(username);

  if (!user) {
    throw new Error(`User "${username}" was not found`);
  }

  await disableUser(user._id);

  console.log(`disabled user ${user.username}`);
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp();
    return;
  }

  const command = readCommand(process.argv[2]);

  if (!command) {
    printHelp();
    throw new Error('Unknown command');
  }

  const username = readUsername(process.argv[3]);

  if (command === 'create') {
    await create(username);
    return;
  }

  if (command === 'reset-password') {
    await resetPassword(username);
    return;
  }

  await disable(username);
}

async function run() {
  try {
    await main();
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === 'Password prompt cancelled'
    ) {
      console.error(error.message);
      process.exitCode = 130;
      return;
    }

    console.error(error);
    process.exitCode = 1;
  } finally {
    try {
      await closeMongoClient();
    } catch (error: unknown) {
      console.error(error);
      process.exitCode = 1;
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void run();
}
