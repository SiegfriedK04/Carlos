function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta configurar la variable ${name}.`);
  }

  return value;
}

export function getEnv() {
  return {
    apiPort: Number(process.env.API_PORT ?? 3001),
    clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
    mongoUri: requireEnv("MONGODB_URI"),
    dbName: requireEnv("DB_NAME"),
    aiServiceUrl: process.env.AI_SERVICE_URL ?? "http://localhost:3002",
    clerkPublishableKey: requireEnv("CLERK_PUBLISHABLE_KEY"),
    clerkSecretKey: requireEnv("CLERK_SECRET_KEY"),
    stripeSecretKey: requireEnv("STRIPE_SECRET_KEY"),
    stripePublishableKey: requireEnv("STRIPE_PUBLISHABLE_KEY"),
    stripeWebhookSecret: requireEnv("STRIPE_WEBHOOK_SECRET"),
    checkerboardSkinPriceId: process.env.STRIPE_CHECKERBOARD_SKIN_PRICE_ID?.trim() || null,
  };
}
