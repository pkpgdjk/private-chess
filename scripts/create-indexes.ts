import { closeMongoClient, getDb } from '../src/server/db/client';
import { getCollectionName, getIndexSpecs } from '../src/server/db/indexes';

function printHelp() {
  console.log(`Usage: npm run db:indexes

Creates MongoDB indexes for the configured database.

Environment:
  MONGODB_URI  MongoDB connection string
  MONGODB_DB   Database name, defaults to private_chess`);
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp();
    return;
  }

  const db = await getDb();

  for (const index of getIndexSpecs()) {
    const collectionName = getCollectionName(index.collection);
    const createdName = await db
      .collection(collectionName)
      .createIndex(index.keys, index.options);

    console.log(`created ${collectionName}.${createdName}`);
  }
}

async function run() {
  try {
    await main();
  } catch (error: unknown) {
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

void run();
