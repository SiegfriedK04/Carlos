import type { AppUser, PurchaseRecord, StripeCheckoutResponse } from "@damas/shared-types";
import { getDb } from "../db";
import { getStripeClient } from "../lib/stripe";
import { getMarketplaceItems } from "./marketplace";

export async function createMarketplaceCheckout(user: AppUser, itemId: string): Promise<StripeCheckoutResponse> {
  const item = (await getMarketplaceItems()).find((entry) => entry.itemId === itemId);
  if (!item) {
    throw new Error("Articulo no encontrado.");
  }

  const payments = (await getDb()).collection<PurchaseRecord>("payments");
  const paymentId = crypto.randomUUID();
  const now = new Date().toISOString();

  await payments.insertOne({
    paymentId,
    userId: user.userId,
    itemId: item.itemId,
    provider: "stripe",
    status: "pending",
    amountUsd: item.priceUsd,
    stripePaymentIntentId: null,
    createdAt: now,
    updatedAt: now,
  });

  const intent = await getStripeClient().paymentIntents.create({
    amount: Math.round(item.priceUsd * 100),
    currency: "usd",
    automatic_payment_methods: {
      enabled: true,
    },
    metadata: {
      paymentId,
      userId: user.userId,
      itemId: item.itemId,
    },
  });

  if (!intent.client_secret) {
    throw new Error("Stripe no devolvio client secret.");
  }

  await payments.updateOne(
    { paymentId },
    {
      $set: {
        stripePaymentIntentId: intent.id,
        updatedAt: new Date().toISOString(),
      },
    },
  );

  return {
    paymentId,
    clientSecret: intent.client_secret,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
    paymentIntentId: intent.id,
  };
}

export async function markPaymentCompleted(paymentIntentId: string) {
  const db = await getDb();
  const payments = db.collection<PurchaseRecord>("payments");
  const payment = await payments.findOne({ stripePaymentIntentId: paymentIntentId });
  if (!payment) {
    return;
  }

  await payments.updateOne(
    { paymentId: payment.paymentId },
    {
      $set: {
        status: "paid",
        updatedAt: new Date().toISOString(),
      },
    },
  );

  await db.collection<AppUser>("users").updateOne(
    { userId: payment.userId },
    {
      $addToSet: {
        unlockedSkinIds: payment.itemId,
      },
      $set: {
        equippedSkinId: payment.itemId,
        updatedAt: new Date().toISOString(),
      },
    },
  );
}

export async function markPaymentFailed(paymentIntentId: string, status: PurchaseRecord["status"]) {
  await (await getDb()).collection<PurchaseRecord>("payments").updateOne(
    { stripePaymentIntentId: paymentIntentId },
    {
      $set: {
        status,
        updatedAt: new Date().toISOString(),
      },
    },
  );
}

export async function equipSkin(userId: string, itemId: string) {
  const db = await getDb();
  const user = await db.collection<AppUser>("users").findOne({ userId });
  if (!user) {
    throw new Error("Usuario no encontrado.");
  }

  if (!user.unlockedSkinIds.includes(itemId)) {
    throw new Error("Ese skin todavia no fue desbloqueado.");
  }

  await db.collection<AppUser>("users").updateOne(
    { userId },
    {
      $set: {
        equippedSkinId: itemId,
        updatedAt: new Date().toISOString(),
      },
    },
  );

  return {
    equippedSkinId: itemId,
    unlockedSkinIds: user.unlockedSkinIds,
  };
}

export async function reconcilePaymentIntent(paymentIntentId: string) {
  const intent = await getStripeClient().paymentIntents.retrieve(paymentIntentId);

  if (intent.status === "succeeded") {
    await markPaymentCompleted(paymentIntentId);
    return { ok: true, status: intent.status };
  }

  if (intent.status === "canceled") {
    await markPaymentFailed(paymentIntentId, "canceled");
    return { ok: false, status: intent.status };
  }

  if (intent.status === "requires_payment_method") {
    await markPaymentFailed(paymentIntentId, "failed");
    return { ok: false, status: intent.status };
  }

  return { ok: false, status: intent.status };
}
