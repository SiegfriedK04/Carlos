import { expect, test } from "bun:test";
import { applyMove, resolveBoardState, searchBestMoveAStar, type BoardState } from "../src";

function boardFrom(pieces: BoardState["pieces"], turn: BoardState["turn"]): BoardState {
  return resolveBoardState({
    size: 8,
    turn,
    pieces,
    forcedCapture: false,
    winner: null,
    moveCount: 0,
    legalMoves: [],
    selectedPieceId: null,
    mustContinueCapture: false,
  });
}

test("obliga una captura cuando existe", () => {
  const board = boardFrom([
    { pieceId: "red-1", color: "red", rank: "man", row: 5, col: 0 },
    { pieceId: "black-1", color: "black", rank: "man", row: 4, col: 1 },
  ], "red");

  expect(board.legalMoves).toHaveLength(1);
  expect(board.legalMoves[0]?.captures).toEqual([{ row: 4, col: 1 }]);
});

test("corona una ficha roja al llegar a la ultima fila", () => {
  const board = boardFrom([
    { pieceId: "red-1", color: "red", rank: "man", row: 1, col: 2 },
    { pieceId: "black-1", color: "black", rank: "man", row: 0, col: 7 },
  ], "red");

  const move = board.legalMoves.find((candidate) => candidate.to.row === 0 && candidate.to.col === 1);
  expect(move).toBeDefined();

  const result = applyMove(board, move!);
  const promoted = result.boardState.pieces.find((piece) => piece.pieceId === "red-1");
  expect(promoted?.rank).toBe("king");
});

test("A* prioriza una captura ganadora inmediata", () => {
  const board = boardFrom([
    { pieceId: "red-1", color: "red", rank: "man", row: 5, col: 0 },
    { pieceId: "black-1", color: "black", rank: "man", row: 4, col: 1 },
  ], "red");

  const result = searchBestMoveAStar(board, "red", 100);

  expect(result.recommendedMove).not.toBeNull();
  expect(result.recommendedMove?.captures).toEqual([{ row: 4, col: 1 }]);
});
