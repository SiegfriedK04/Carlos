import { MongoClient } from "mongodb";

const mongoUri = process.env.MONGODB_URI ?? "mongodb://localhost:27017/pokemon-battle-rooms";
const dbName = process.env.DB_NAME ?? "pokemon-battle-rooms";

declare global {
  // eslint-disable-next-line no-var
  var __pokemonMongoClient: MongoClient | undefined;
}

const client = globalThis.__pokemonMongoClient ?? new MongoClient(mongoUri);

if (!globalThis.__pokemonMongoClient) {
  globalThis.__pokemonMongoClient = client;
}

export async function getDb() {
  await client.connect();
  return client.db(dbName);
}

export async function closeDb() {
  await client.close();
}
