import { Hono } from "hono";
import { z } from "zod";
import type { AiMoveRequest } from "@damas/shared-types";
import { resolveBoardState, searchBestMoveAStar } from "@damas/shared-types";

const app = new Hono();
const port = Number(process.env.AI_PORT ?? 3002);

const requestSchema = z.object({
  boardState: z.object({
    size: z.number().int().positive(),
    turn: z.enum(["red", "black"]),
    pieces: z.array(
      z.object({
        pieceId: z.string(),
        color: z.enum(["red", "black"]),
        rank: z.enum(["man", "king"]),
        row: z.number().int(),
        col: z.number().int(),
      }),
    ),
    forcedCapture: z.boolean(),
    winner: z.enum(["red", "black"]).nullable(),
    moveCount: z.number().int(),
    legalMoves: z.array(
      z.object({
        pieceId: z.string(),
        from: z.object({ row: z.number().int(), col: z.number().int() }),
        to: z.object({ row: z.number().int(), col: z.number().int() }),
        path: z.array(z.object({ row: z.number().int(), col: z.number().int() })),
        captures: z.array(z.object({ row: z.number().int(), col: z.number().int() })),
      }),
    ),
    selectedPieceId: z.string().nullable(),
    mustContinueCapture: z.boolean(),
  }),
  currentPlayer: z.enum(["red", "black"]),
  depth: z.number().int().min(1).max(5),
});

app.get("/health", (context) => context.json({ ok: true, service: "ai" }));

app.post("/ai/move", async (context) => {
  const payload = requestSchema.parse(await context.req.json()) as AiMoveRequest;
  const boardState = resolveBoardState({
    ...payload.boardState,
    turn: payload.currentPlayer,
  });
  return context.json(searchBestMoveAStar(boardState, payload.currentPlayer, payload.depth));
});

export default {
  port,
  fetch: app.fetch,
};
