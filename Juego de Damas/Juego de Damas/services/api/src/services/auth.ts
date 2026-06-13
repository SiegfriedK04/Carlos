import { createClerkClient } from "@clerk/backend";
import type { AppUser } from "@damas/shared-types";
import { getDb } from "../db";
import { getEnv } from "../lib/env";

function clerkClient() {
  const env = getEnv();
  return createClerkClient({
    secretKey: env.clerkSecretKey,
    publishableKey: env.clerkPublishableKey,
  });
}

export async function requireAppUser(token: string | null): Promise<AppUser> {
  if (!token) {
    throw new Error("Debes iniciar sesion para continuar.");
  }

  const env = getEnv();
  const authState = await clerkClient().authenticateRequest(
    new Request("http://localhost/internal/auth", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    {
      authorizedParties: [env.clientOrigin],
    },
  );

  if (!authState.isAuthenticated) {
    throw new Error("La sesion de Clerk no es valida.");
  }

  const auth = authState.toAuth();
  if (!auth.userId) {
    throw new Error("No se pudo resolver el usuario autenticado.");
  }

  const clerkUser = await clerkClient().users.getUser(auth.userId);
  const email =
    clerkUser.emailAddresses.find((entry) => entry.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new Error("La cuenta de Clerk no tiene correo principal.");
  }

  const db = await getDb();
  const users = db.collection<AppUser>("users");
  const now = new Date().toISOString();
  const displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
    clerkUser.username ||
    email.split("@")[0];

  const existing = await users.findOne({ clerkUserId: clerkUser.id });
  const nextUser: AppUser = {
    userId: existing?.userId ?? crypto.randomUUID(),
    clerkUserId: clerkUser.id,
    email: email.toLowerCase(),
    displayName,
    avatarUrl: clerkUser.imageUrl ?? null,
    equippedSkinId: existing?.equippedSkinId ?? null,
    unlockedSkinIds: existing?.unlockedSkinIds ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await users.updateOne(
    { clerkUserId: clerkUser.id },
    {
      $set: nextUser,
    },
    { upsert: true },
  );

  return nextUser;
}
