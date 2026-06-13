import type { BattleAction, PokemonCatalogResponse, RoomSnapshot } from "../types/models";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";
const wsBase =
  import.meta.env.VITE_WS_BASE_URL ??
  apiBase.replace("http://", "ws://").replace("https://", "wss://");

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(error.error ?? "La solicitud falló.");
  }

  return (await response.json()) as T;
}

export const api = {
  getPokemonCatalog(filters: {
    search?: string;
    type?: string;
    region?: string;
    generation?: string;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.type) params.set("type", filters.type);
    if (filters.region) params.set("region", filters.region);
    if (filters.generation) params.set("generation", filters.generation);
    if (filters.limit) params.set("limit", String(filters.limit));
    return request<PokemonCatalogResponse>(`/api/pokemon?${params.toString()}`);
  },
  createRoom(playerName: string) {
    return request<RoomSnapshot>("/api/rooms", {
      method: "POST",
      body: JSON.stringify({ playerName }),
    });
  },
  joinRoom(roomCode: string, playerName: string) {
    return request<RoomSnapshot>("/api/rooms/join", {
      method: "POST",
      body: JSON.stringify({ roomCode, playerName }),
    });
  },
  getRoom(code: string) {
    return request<RoomSnapshot>(`/api/rooms/${code}`);
  },
  markReady(code: string, playerId: string) {
    return request<RoomSnapshot>(`/api/rooms/${code}/ready`, {
      method: "POST",
      body: JSON.stringify({ playerId }),
    });
  },
  saveTeam(code: string, playerId: string, pokemonIds: number[]) {
    return request<RoomSnapshot>(`/api/rooms/${code}/team`, {
      method: "POST",
      body: JSON.stringify({ playerId, pokemonIds }),
    });
  },
  submitAction(roomCode: string, playerId: string, turn: number, action: BattleAction) {
    return request<RoomSnapshot>(`/api/battles/${roomCode}/action`, {
      method: "POST",
      body: JSON.stringify({ playerId, turn, action }),
    });
  },
  battleSnapshot(roomCode: string) {
    return request<RoomSnapshot>(`/api/battles/${roomCode}`);
  },
  roomSocket(roomCode: string) {
    return new WebSocket(`${wsBase}/ws/rooms/${roomCode}`);
  },
};
