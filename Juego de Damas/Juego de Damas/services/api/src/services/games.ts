import type { AiMoveRequest, AiMoveResponse, BoardState, GameSummary, GameTurnResult, MoveCommand, SavedGame } from "@damas/shared-types";
import { applyMove, createInitialBoardState, formatMove, resolveBoardState } from "@damas/shared-types";
import { getDb } from "../db";
import { getEnv } from "../lib/env";

function toGameSummary(game: SavedGame): GameSummary {
  return {
    gameId: game.gameId,
    status: game.status,
    difficulty: game.difficulty,
    moveCount: game.boardState.moveCount,
    playerMoveCount: game.playerMoveCount,
    aiMoveCount: game.aiMoveCount,
    updatedAt: game.updatedAt,
    winner: game.boardState.winner,
  };
}

async function saveGame(game: SavedGame) {
  await (await getDb()).collection<SavedGame>("games").updateOne({ gameId: game.gameId }, { $set: game }, { upsert: false });
}

function nextStatus(boardState: BoardState, humanColor: SavedGame["humanColor"]): SavedGame["status"] {
  if (boardState.winner === humanColor) {
    return "won";
  }

  if (boardState.winner && boardState.winner !== humanColor) {
    return "lost";
  }

  return "active";
}

export async function listGames(userId: string): Promise<GameSummary[]> {
  const docs = await (await getDb()).collection<SavedGame>("games").find({ userId }).sort({ updatedAt: -1 }).toArray();
  return docs.map(toGameSummary);
}

export async function createGame(userId: string): Promise<SavedGame> {
  const now = new Date().toISOString();
  const game: SavedGame = {
    gameId: crypto.randomUUID(),
    userId,
    boardState: createInitialBoardState(),
    status: "active",
    difficulty: "medium",
    startedAt: now,
    updatedAt: now,
    finishedAt: null,
    humanColor: "red",
    aiColor: "black",
    playerMoveCount: 0,
    aiMoveCount: 0,
    lastPlayerMove: null,
    lastAiMove: null,
    lastAiSummary: null,
  };

  await (await getDb()).collection<SavedGame>("games").insertOne(game);
  return game;
}

export async function getGame(gameId: string, userId: string): Promise<SavedGame> {
  const game = await (await getDb()).collection<SavedGame>("games").findOne({ gameId, userId });
  if (!game) {
    throw new Error("Partida no encontrada.");
  }

  return {
    ...game,
    boardState: resolveBoardState(game.boardState),
  };
}

export async function requestAiMove(boardState: BoardState) {
  const payload: AiMoveRequest = {
    boardState,
    currentPlayer: boardState.turn,
    depth: 3,
  };

  const response = await fetch(`${getEnv().aiServiceUrl}/ai/move`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("No se pudo consultar el microservicio de IA.");
  }

  return response.json() as Promise<AiMoveResponse>;
}

export async function playTurn(gameId: string, userId: string, playerMove: MoveCommand): Promise<GameTurnResult> {
  const current = await getGame(gameId, userId);

  if (current.status !== "active") {
    throw new Error("La partida ya termino.");
  }

  if (current.boardState.turn !== current.humanColor) {
    throw new Error("No es el turno del jugador.");
  }

  const humanApplied = applyMove(current.boardState, playerMove);
  let nextGame: SavedGame = {
    ...current,
    boardState: humanApplied.boardState,
    playerMoveCount: current.playerMoveCount + 1,
    updatedAt: new Date().toISOString(),
    lastPlayerMove: humanApplied.move,
    lastAiMove: null,
    lastAiSummary: null,
  };

  nextGame.status = nextStatus(nextGame.boardState, nextGame.humanColor);
  if (nextGame.status !== "active") {
    nextGame.finishedAt = new Date().toISOString();
    await saveGame(nextGame);
    return {
      game: nextGame,
      playerMove: humanApplied.move,
      aiMove: null,
      ai: null,
      message: `La partida termino tras la jugada del jugador (${formatMove(humanApplied.move)}).`,
    };
  }

  const ai = await requestAiMove(nextGame.boardState);
  if (!ai.recommendedMove) {
    nextGame.boardState = resolveBoardState({
      ...nextGame.boardState,
      winner: nextGame.humanColor,
    });
    nextGame.status = "won";
    nextGame.finishedAt = new Date().toISOString();
    nextGame.lastAiSummary = ai.summary;
    await saveGame(nextGame);
    return {
      game: nextGame,
      playerMove: humanApplied.move,
      aiMove: null,
      ai,
      message: "La IA no encontro movimientos legales. El jugador gana la partida.",
    };
  }

  const aiApplied = applyMove(nextGame.boardState, ai.recommendedMove);
  nextGame = {
    ...nextGame,
    boardState: aiApplied.boardState,
    aiMoveCount: nextGame.aiMoveCount + 1,
    updatedAt: new Date().toISOString(),
    lastAiMove: aiApplied.move,
    lastAiSummary: ai.summary,
  };
  nextGame.status = nextStatus(nextGame.boardState, nextGame.humanColor);
  if (nextGame.status !== "active") {
    nextGame.finishedAt = new Date().toISOString();
  }

  await saveGame(nextGame);

  return {
    game: nextGame,
    playerMove: humanApplied.move,
    aiMove: aiApplied.move,
    ai,
    message: `Turno resuelto. Jugador: ${formatMove(humanApplied.move)}. IA: ${formatMove(aiApplied.move)}.`,
  };
}
