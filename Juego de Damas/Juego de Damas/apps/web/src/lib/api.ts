import type {
  AppUser,
  GameSummary,
  GameTurnResult,
  MarketplaceItem,
  MoveCommand,
  RankingEntry,
  SavedGame,
  StripeCheckoutResponse,
  UserInventory,
} from "@damas/shared-types";

const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, init?: RequestInit, token?: string | null) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(async () => ({ error: await response.text() }));
    throw new Error(body.error || "La solicitud fallo.");
  }

  return response.json() as Promise<T>;
}

export const api = {
  me(token: string) {
    return request<AppUser>("/api/auth/me", undefined, token);
  },
  listGames(token: string) {
    return request<GameSummary[]>("/api/games", undefined, token);
  },
  createGame(token: string) {
    return request<SavedGame>("/api/games", { method: "POST" }, token);
  },
  getGame(gameId: string, token: string) {
    return request<SavedGame>(`/api/games/${gameId}`, undefined, token);
  },
  playTurn(gameId: string, move: MoveCommand, token: string) {
    return request<GameTurnResult>(
      `/api/games/${gameId}/move`,
      {
        method: "POST",
        body: JSON.stringify({ move }),
      },
      token,
    );
  },
  getRanking() {
    return request<RankingEntry[]>("/api/ranking");
  },
  getMarketplaceItems() {
    return request<MarketplaceItem[]>("/api/marketplace/items");
  },
  createCheckout(itemId: string, token: string) {
    return request<StripeCheckoutResponse>(
      "/api/marketplace/purchases/checkout",
      {
        method: "POST",
        body: JSON.stringify({ itemId }),
      },
      token,
    );
  },
  confirmCheckout(paymentIntentId: string, token: string) {
    return request(
      "/api/marketplace/purchases/confirm",
      {
        method: "POST",
        body: JSON.stringify({ paymentIntentId }),
      },
      token,
    );
  },
  equipSkin(itemId: string, token: string) {
    return request<UserInventory>(
      "/api/marketplace/equip",
      {
        method: "POST",
        body: JSON.stringify({ itemId }),
      },
      token,
    );
  },
};
