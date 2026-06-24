import { MongoClient } from "mongodb";
import { getEnv } from "../lib/env";

let clientPromise: Promise<MongoClient> | null = null;

export async function getDb() {
  if (!clientPromise) {
    clientPromise = new MongoClient(getEnv().mongoUri).connect();
  }

  const client = await clientPromise;
  return client.db(getEnv().dbName);
}

export async function ensureIndexes() {
  const db = await getDb();
  await Promise.all([
    db.collection("users").createIndex(
      { clerkUserId: 1 },
      { unique: true, partialFilterExpression: { clerkUserId: { $type: "string" } } },
    ),
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("games").createIndex({ userId: 1, updatedAt: -1 }),
    db.collection("games").createIndex({ status: 1, playerMoveCount: 1, finishedAt: 1 }),
    db.collection("payments").createIndex({ userId: 1, createdAt: -1 }),
    db.collection("payments").createIndex({ stripePaymentIntentId: 1 }, { unique: true, sparse: true }),
    db.collection("marketplaceItems").createIndex({ slug: 1 }, { unique: true }),
    db.collection("authSessions").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("authSessions").createIndex({ expiresAt: 1 }),
  ]);
}
