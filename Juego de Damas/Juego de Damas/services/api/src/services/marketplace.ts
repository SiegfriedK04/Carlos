import type { MarketplaceItem } from "@damas/shared-types";
import { getDb } from "../db";

const starterItems: MarketplaceItem[] = [
  {
    itemId: "skin_checkerboard",
    slug: "checkerboard-classic",
    name: "Checkerboard Classic",
    description: "Piezas con acabado marfil y negro para un estilo tradicional.",
    previewColor: "#c47f38",
    priceUsd: 1,
    stripePriceId: process.env.STRIPE_CHECKERBOARD_SKIN_PRICE_ID?.trim() || null,
  },
  {
    itemId: "skin_royal_garnet",
    slug: "royal-garnet",
    name: "Royal Garnet",
    description: "Fichas granate y grafito con un contraste elegante para partidas competitivas.",
    previewColor: "#9f3b52",
    priceUsd: 1.5,
    stripePriceId: process.env.STRIPE_ROYAL_GARNET_SKIN_PRICE_ID?.trim() || null,
  },
  {
    itemId: "skin_forest_gold",
    slug: "forest-gold",
    name: "Forest Gold",
    description: "Tonos verde bosque y dorado suave para una mesa con estilo clasico renovado.",
    previewColor: "#6d8b48",
    priceUsd: 1.75,
    stripePriceId: process.env.STRIPE_FOREST_GOLD_SKIN_PRICE_ID?.trim() || null,
  },
];

export async function ensureMarketplaceSeed() {
  const items = (await getDb()).collection<MarketplaceItem>("marketplaceItems");

  for (const item of starterItems) {
    await items.updateOne({ slug: item.slug }, { $set: item }, { upsert: true });
  }
}

export async function getMarketplaceItems() {
  return (await getDb()).collection<MarketplaceItem>("marketplaceItems").find().toArray();
}
