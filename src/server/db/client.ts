import { MongoClient, type Db } from 'mongodb';

import { getEnv } from './env';

export function getMongoClient(): Promise<MongoClient> {
  const env = getEnv();
  const client = new MongoClient(env.MONGODB_URI, {
    maxPoolSize: 1,
    minPoolSize: 0,
    maxIdleTimeMS: 1000,
    serverSelectionTimeoutMS: 5000,
    serverMonitoringMode: 'poll',
  });

  return client.connect();
}

export async function closeMongoClient(): Promise<void> {
  return Promise.resolve();
}

export async function getDb(): Promise<Db> {
  const env = getEnv();
  const client = await getMongoClient();

  return client.db(env.MONGODB_DB);
}

export async function withDb<T>(
  operation: (db: Db) => Promise<T>,
): Promise<T> {
  const env = getEnv();
  const client = await getMongoClient();

  try {
    return await operation(client.db(env.MONGODB_DB));
  } finally {
    await client.close();
  }
}
