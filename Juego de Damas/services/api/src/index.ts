import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { ensureIndexes, getDb } from "./db";
import { getEnv } from "./lib/env";
import { getStripeClient } from "./lib/stripe";
import { loginLocalUser, registerLocalUser, requireAppUser, revokeSession } from "./services/auth";
import { createGame, getGame, listGames, playTurn } from "./services/games";
import { ensureMarketplaceSeed, getMarketplaceItems } from "./services/marketplace";
import { createMarketplaceCheckout, equipSkin, markPaymentCompleted, markPaymentFailed, reconcilePaymentIntent } from "./services/payments";

const app = new Hono();
const env = getEnv();

await ensureIndexes();
await ensureMarketplaceSeed();

app.onError((error, context) => {
  const status = /no encontrada|invalido|deb|turno|termino|usuario|articulo|skin/i.test(error.message) ? 400 : 500;
  return context.json({ error: error.message }, status);
});

function bearerToken(header: string | undefined | null) {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim() || null;
}

app.use(
  "/api/*",
  cors({
    origin: env.clientOrigin,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST"],
  }),
);

app.get("/health", (context) => context.json({ ok: true, service: "api" }));

app.post("/api/auth/register", async (context) => {
  const body = z.object({
    email: z.email(),
    displayName: z.string().min(2).max(40),
    password: z.string().min(8).max(72),
  }).parse(await context.req.json());
  return context.json(await registerLocalUser(body), 201);
});

app.post("/api/auth/login", async (context) => {
  const body = z.object({
    email: z.email(),
    password: z.string().min(8).max(72),
  }).parse(await context.req.json());
  return context.json(await loginLocalUser(body));
});

app.post("/api/auth/logout", async (context) => {
  const token = bearerToken(context.req.header("Authorization"));
  return context.json(await revokeSession(token));
});

app.get("/api/auth/me", async (context) => {
  const user = await requireAppUser(bearerToken(context.req.header("Authorization")));
  return context.json(user);
});

app.get("/api/games", async (context) => {
  const user = await requireAppUser(bearerToken(context.req.header("Authorization")));
  return context.json(await listGames(user.userId));
});

app.post("/api/games", async (context) => {
  const user = await requireAppUser(bearerToken(context.req.header("Authorization")));
  return context.json(await createGame(user.userId));
});

app.get("/api/games/:id", async (context) => {
  const user = await requireAppUser(bearerToken(context.req.header("Authorization")));
  return context.json(await getGame(context.req.param("id"), user.userId));
});

app.post("/api/games/:id/move", async (context) => {
  const user = await requireAppUser(bearerToken(context.req.header("Authorization")));
  const body = z.object({
    move: z.object({
      pieceId: z.string().min(1),
      from: z.object({ row: z.number().int(), col: z.number().int() }),
      to: z.object({ row: z.number().int(), col: z.number().int() }),
      path: z.array(z.object({ row: z.number().int(), col: z.number().int() })).min(1),
      captures: z.array(z.object({ row: z.number().int(), col: z.number().int() })),
    }),
  }).parse(await context.req.json());
  return context.json(await playTurn(context.req.param("id"), user.userId, body.move));
});

app.get("/api/ranking", async (context) => {
  const db = await getDb();
  const ranking = await db.collection("games").aggregate([
    { $match: { status: "won" } },
    { $sort: { playerMoveCount: 1, finishedAt: 1 } },
    {
      $group: {
        _id: "$userId",
        bestWinMoveCount: { $first: "$playerMoveCount" },
        achievedAt: { $first: "$finishedAt" },
        wins: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "userId",
        as: "user",
      },
    },
    { $unwind: "$user" },
    { $sort: { bestWinMoveCount: 1, achievedAt: 1, "user.displayName": 1 } },
    { $limit: 25 },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        displayName: "$user.displayName",
        avatarUrl: "$user.avatarUrl",
        bestWinMoveCount: 1,
        wins: 1,
        achievedAt: 1,
      },
    },
  ]).toArray();
  return context.json(ranking);
});

app.get("/api/marketplace/items", async (context) => {
  return context.json(await getMarketplaceItems());
});

const checkoutSchema = z.object({
  itemId: z.string().min(1),
});

app.post("/api/marketplace/purchases/checkout", async (context) => {
  const user = await requireAppUser(bearerToken(context.req.header("Authorization")));
  const body = checkoutSchema.parse(await context.req.json());
  return context.json(await createMarketplaceCheckout(user, body.itemId));
});

const confirmSchema = z.object({
  paymentIntentId: z.string().min(1),
});

app.post("/api/marketplace/purchases/confirm", async (context) => {
  await requireAppUser(bearerToken(context.req.header("Authorization")));
  const body = confirmSchema.parse(await context.req.json());
  return context.json(await reconcilePaymentIntent(body.paymentIntentId));
});

app.post("/api/marketplace/equip", async (context) => {
  const user = await requireAppUser(bearerToken(context.req.header("Authorization")));
  const body = z.object({ itemId: z.string().min(1) }).parse(await context.req.json());
  return context.json(await equipSkin(user.userId, body.itemId));
});

app.post("/api/stripe/webhook", async (context) => {
  const signature = context.req.header("stripe-signature");
  if (!signature) {
    return context.json({ error: "Falta stripe-signature." }, 400);
  }

  const payload = await context.req.text();
  const event = await getStripeClient().webhooks.constructEventAsync(payload, signature, env.stripeWebhookSecret);

  if (event.type === "payment_intent.succeeded") {
    await markPaymentCompleted(event.data.object.id);
  }

  if (event.type === "payment_intent.payment_failed") {
    await markPaymentFailed(event.data.object.id, "failed");
  }

  if (event.type === "payment_intent.canceled") {
    await markPaymentFailed(event.data.object.id, "canceled");
  }

  return context.json({ received: true });
});

export default {
  port: env.apiPort,
  fetch: app.fetch,
};
