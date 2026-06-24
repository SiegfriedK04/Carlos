import Stripe from "stripe";
import { getEnv } from "./env";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(getEnv().stripeSecretKey);
  }

  return stripeClient;
}
