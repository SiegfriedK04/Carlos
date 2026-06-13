import { createClerkClient } from "@clerk/backend";
import type { AppUser, AuthSessionResponse } from "@damas/shared-types";
import { getDb } from "../db";
import { getEnv } from "../lib/env";

interface UserRecord extends AppUser {
  passwordHash?: string | null;
}

interface AuthSessionRecord {
  sessionId: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

const LOCAL_SESSION_PREFIX = "damas_local_";
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/;

function hasClerkCredentials() {
  const env = getEnv();
  return Boolean(env.clerkSecretKey && env.clerkPublishableKey);
}

function clerkClient() {
  const env = getEnv();
  if (!env.clerkSecretKey || !env.clerkPublishableKey) {
    throw new Error("Clerk no esta configurado en este entorno.");
  }

  return createClerkClient({
    secretKey: env.clerkSecretKey,
    publishableKey: env.clerkPublishableKey,
  });
}

function usersCollection() {
  return getDb().then((db) => db.collection<UserRecord>("users"));
}

function sessionsCollection() {
  return getDb().then((db) => db.collection<AuthSessionRecord>("authSessions"));
}

function sanitizeUser(user: UserRecord): AppUser {
  const { passwordHash: _passwordHash, ...appUser } = user;
  return appUser;
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validatePassword(password: string) {
  if (!PASSWORD_RULE.test(password)) {
    throw new Error("La contrasena debe tener 8+ caracteres, mayuscula, minuscula, numero y simbolo.");
  }
}

async function createSession(user: AppUser): Promise<AuthSessionResponse> {
  const sessionToken = `${LOCAL_SESSION_PREFIX}${crypto.randomUUID()}${crypto.randomUUID().replaceAll("-", "")}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7).toISOString();

  await (await sessionsCollection()).insertOne({
    sessionId: crypto.randomUUID(),
    userId: user.userId,
    tokenHash: await hashToken(sessionToken),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt,
  });

  return {
    sessionToken,
    user,
  };
}

async function findUserByLocalSession(token: string) {
  if (!token.startsWith(LOCAL_SESSION_PREFIX)) {
    return null;
  }

  const now = new Date().toISOString();
  const session = await (await sessionsCollection()).findOne({
    tokenHash: await hashToken(token),
    expiresAt: { $gt: now },
  });

  if (!session) {
    return null;
  }

  const user = await (await usersCollection()).findOne({ userId: session.userId });
  return user ? sanitizeUser(user) : null;
}

async function upsertClerkUser(token: string): Promise<AppUser | null> {
  if (!hasClerkCredentials()) {
    return null;
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
    return null;
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

  const users = await usersCollection();
  const now = new Date().toISOString();
  const displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
    clerkUser.username ||
    email.split("@")[0];
  const normalizedEmail = normalizeEmail(email);

  const existing = await users.findOne({
    $or: [{ clerkUserId: clerkUser.id }, { email: normalizedEmail }],
  });
  const nextUser: UserRecord = {
    userId: existing?.userId ?? crypto.randomUUID(),
    clerkUserId: clerkUser.id,
    email: normalizedEmail,
    displayName,
    avatarUrl: clerkUser.imageUrl ?? existing?.avatarUrl ?? null,
    equippedSkinId: existing?.equippedSkinId ?? null,
    unlockedSkinIds: existing?.unlockedSkinIds ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    passwordHash: existing?.passwordHash ?? null,
  };

  await users.updateOne(
    existing ? { userId: existing.userId } : { clerkUserId: clerkUser.id },
    {
      $set: nextUser,
    },
    { upsert: true },
  );

  return sanitizeUser(nextUser);
}

export async function registerLocalUser(input: {
  email: string;
  displayName: string;
  password: string;
}): Promise<AuthSessionResponse> {
  const users = await usersCollection();
  const email = normalizeEmail(input.email);
  const displayName = input.displayName.trim();

  if (!displayName) {
    throw new Error("Debes indicar un nombre para mostrar.");
  }

  validatePassword(input.password);

  const existing = await users.findOne({ email });
  if (existing?.passwordHash) {
    throw new Error("Ya existe una cuenta local con ese correo.");
  }

  const now = new Date().toISOString();
  const passwordHash = await Bun.password.hash(input.password);
  const nextUser: UserRecord = {
    userId: existing?.userId ?? crypto.randomUUID(),
    clerkUserId: existing?.clerkUserId ?? null,
    email,
    displayName,
    avatarUrl: existing?.avatarUrl ?? null,
    equippedSkinId: existing?.equippedSkinId ?? null,
    unlockedSkinIds: existing?.unlockedSkinIds ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    passwordHash,
  };

  await users.updateOne(
    existing ? { userId: existing.userId } : { email },
    {
      $set: nextUser,
    },
    { upsert: true },
  );

  return createSession(sanitizeUser(nextUser));
}

export async function loginLocalUser(input: {
  email: string;
  password: string;
}): Promise<AuthSessionResponse> {
  const user = await (await usersCollection()).findOne({ email: normalizeEmail(input.email) });
  if (!user?.passwordHash) {
    throw new Error("No existe una cuenta local registrada con ese correo.");
  }

  const valid = await Bun.password.verify(input.password, user.passwordHash);
  if (!valid) {
    throw new Error("La contrasena no coincide.");
  }

  return createSession(sanitizeUser(user));
}

export async function revokeSession(token: string | null) {
  if (!token?.startsWith(LOCAL_SESSION_PREFIX)) {
    return { ok: true };
  }

  await (await sessionsCollection()).deleteOne({ tokenHash: await hashToken(token) });
  return { ok: true };
}

export async function requireAppUser(token: string | null): Promise<AppUser> {
  if (!token) {
    throw new Error("Debes iniciar sesion para continuar.");
  }

  const localUser = await findUserByLocalSession(token);
  if (localUser) {
    return localUser;
  }

  const clerkUser = await upsertClerkUser(token);
  if (clerkUser) {
    return clerkUser;
  }

  throw new Error("La sesion no es valida.");
}
