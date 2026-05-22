import { MongoClient, type Db } from 'mongodb';

import { getEnv } from './env';

let clientPromise: Promise<MongoClient> | null = null;

export function getMongoClient(): Promise<MongoClient> {
  if (!clientPromise) {
    const env = getEnv();
    const client = new MongoClient(env.MONGODB_URI, {
      maxPoolSize: 5,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000,
    });
    let connectionPromise: Promise<MongoClient>;

    connectionPromise = client.connect().catch((error: unknown) => {
      if (clientPromise === connectionPromise) {
        clientPromise = null;
      }

      throw error;
    });
    clientPromise = connectionPromise;
  }

  return clientPromise;
}

export async function closeMongoClient(): Promise<void> {
  const promise = clientPromise;
  clientPromise = null;

  if (!promise) {
    return;
  }

  const client = await promise;
  await client.close();
}

export async function getDb(): Promise<Db> {
  const env = getEnv();
  const client = await getMongoClient();

  return client.db(env.MONGODB_DB);
}
