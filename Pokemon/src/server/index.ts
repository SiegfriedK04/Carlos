import { createBunWebSocket, serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { z } from "zod";
import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  bootstrapStorage,
  createRoom,
  ensureSeedReadiness,
  getPokemonCatalog,
  getRoomSnapshot,
  joinRoom,
  markReady,
  submitAction,
  updateTeamSelection,
} from "./services";
import { addSocket, broadcast, removeSocket } from "./store";
import type { BattleAction, RealtimeMessage } from "../types/models";

const app = new Hono();
const { upgradeWebSocket, websocket } = createBunWebSocket();
const serverPort = Number(process.env.SERVER_PORT ?? 3001);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";

await bootstrapStorage();

app.use(
  "/api/*",
  cors({
    origin: clientOrigin,
    allowHeaders: ["Content-Type"],
    allowMethods: ["GET", "POST"],
  }),
);

app.get("/health", async (context) => {
  const seed = await ensureSeedReadiness();
  return context.json({ ok: true, seed });
});

app.get("/api/pokemon", async (context) => {
  const search = context.req.query("search") ?? "";
  const type = context.req.query("type") ?? "";
  const region = context.req.query("region") ?? "";
  const generation = context.req.query("generation") ?? "";
  const limit = Number(context.req.query("limit") ?? 150);
  const snapshot = await getPokemonCatalog({
    search,
    type,
    region,
    generation,
    limit,
  });
  return context.json(snapshot);
});

const roomSchema = z.object({
  playerName: z.string().trim().min(2).max(20),
});

app.post("/api/rooms", async (context) => {
  const body = roomSchema.parse(await context.req.json());
  const snapshot = await createRoom(body.playerName);
  return context.json(snapshot);
});

const joinSchema = roomSchema.extend({
  roomCode: z.string().trim().toUpperCase().length(6),
});

app.post("/api/rooms/join", async (context) => {
  const body = joinSchema.parse(await context.req.json());
  const snapshot = await joinRoom(body.roomCode, body.playerName);
  broadcast(body.roomCode, { type: "player.joined", payload: snapshot });
  return context.json(snapshot);
});

const readySchema = z.object({
  playerId: z.string().uuid(),
});

const teamSchema = z.object({
  playerId: z.string().uuid(),
  pokemonIds: z.array(z.number().int().positive()).max(6),
});

app.post("/api/rooms/:code/team", async (context) => {
  const body = teamSchema.parse(await context.req.json());
  const code = context.req.param("code").toUpperCase();
  const snapshot = await updateTeamSelection(code, body.playerId, body.pokemonIds);
  broadcast(code, { type: "room.updated", payload: snapshot });
  return context.json(snapshot);
});

app.post("/api/rooms/:code/ready", async (context) => {
  const body = readySchema.parse(await context.req.json());
  const code = context.req.param("code").toUpperCase();
  const snapshot = await markReady(code, body.playerId);
  const event: RealtimeMessage = {
    type: snapshot.battle ? "battle.started" : "player.ready",
    payload: snapshot,
  };
  broadcast(code, event);
  return context.json(snapshot);
});

app.get("/api/rooms/:code", async (context) => {
  const snapshot = await getRoomSnapshot(context.req.param("code").toUpperCase());
  return context.json(snapshot);
});

app.get("/api/battles/:roomCode", async (context) => {
  const snapshot = await getRoomSnapshot(context.req.param("roomCode").toUpperCase());
  return context.json(snapshot);
});

const actionSchema = z.object({
  playerId: z.string().uuid(),
  turn: z.number().int().positive(),
  action: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("move"),
      moveId: z.number().int().positive(),
    }),
    z.object({
      type: z.literal("switch"),
      targetSlotId: z.string(),
    }),
  ]),
});

app.post("/api/battles/:roomCode/action", async (context) => {
  const body = actionSchema.parse(await context.req.json());
  const roomCode = context.req.param("roomCode").toUpperCase();
  const snapshot = await submitAction(roomCode, body.playerId, body.turn, body.action as BattleAction);
  const event: RealtimeMessage = {
    type:
      snapshot.battle?.status === "finished"
        ? "battle.ended"
        : snapshot.battle && snapshot.battle.pendingActions.length > 0
          ? "battle.updated"
          : "turn.resolved",
    payload: snapshot,
  };
  broadcast(roomCode, event);
  return context.json(snapshot);
});

app.get(
  "/ws/rooms/:code",
  upgradeWebSocket((context) => {
    const roomCode = (context.req.param("code") ?? "").toUpperCase();
    return {
      onOpen(_event, websocket) {
        addSocket(roomCode, websocket.raw as unknown as WebSocket);
      },
      onClose(_event, websocket) {
        removeSocket(roomCode, websocket.raw as unknown as WebSocket);
      },
      async onMessage(_event, websocket) {
        const snapshot = await getRoomSnapshot(roomCode);
        websocket.send(JSON.stringify({ type: "room.updated", payload: snapshot }));
      },
    };
  }),
);

app.use("/assets/*", serveStatic({ root: "./dist" }));

app.get("*", async (context) => {
  try {
    const htmlPath = resolve(process.cwd(), "dist", "index.html");
    const html = await readFile(htmlPath, "utf-8");
    return context.html(html);
  } catch {
    return context.html(
      `<html><body><h1>Pokemon Battle Rooms UTP</h1><p>Corre <code>bun run dev</code> para desarrollo o <code>bun run build</code> antes de iniciar el servidor.</p></body></html>`,
    );
  }
});

app.onError((error, context) => {
  const status = error instanceof z.ZodError ? 400 : 500;
  return context.json(
    {
      error: error.message,
    },
    status,
  );
});

export default {
  port: serverPort,
  fetch: app.fetch,
  websocket,
};
