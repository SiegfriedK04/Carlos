import type { BoardState, MoveCommand, PieceState } from "@damas/shared-types";
import { pieceSkinTone } from "@damas/shared-types";

interface CheckersBoardProps {
  boardState: BoardState;
  selectedPieceId: string | null;
  selectedMove: MoveCommand | null;
  equippedSkinId: string | null;
  disabled?: boolean;
  onPieceSelect?: (piece: PieceState) => void;
  onMovePreview?: (move: MoveCommand) => void;
  onMoveCommit?: (move: MoveCommand) => void;
}

function keyFor(row: number, col: number) {
  return `${row}:${col}`;
}

export function CheckersBoard({
  boardState,
  selectedPieceId,
  selectedMove,
  equippedSkinId,
  disabled,
  onPieceSelect,
  onMovePreview,
  onMoveCommit,
}: CheckersBoardProps) {
  const movesByOrigin = new Map<string, MoveCommand[]>();
  const pathSquares = new Set(selectedMove?.path.map((position) => keyFor(position.row, position.col)) ?? []);

  for (const move of boardState.legalMoves) {
    const key = keyFor(move.from.row, move.from.col);
    const bucket = movesByOrigin.get(key) ?? [];
    bucket.push(move);
    movesByOrigin.set(key, bucket);
  }

  return (
    <div className="board-shell">
      <div className="board-grid" role="grid" aria-label="Tablero de damas">
        {Array.from({ length: boardState.size }).map((_, row) =>
          Array.from({ length: boardState.size }).map((__, col) => {
            const piece = boardState.pieces.find((entry) => entry.row === row && entry.col === col) ?? null;
            const originMoves = movesByOrigin.get(keyFor(row, col)) ?? [];
            const pieceSelected = piece?.pieceId === selectedPieceId;
            const landingSelected = pathSquares.has(keyFor(row, col));
            const selectableTarget = selectedPieceId
              ? boardState.legalMoves.some((candidate) => candidate.pieceId === selectedPieceId && candidate.to.row === row && candidate.to.col === col)
              : false;

            return (
              <button
                key={`${row}-${col}`}
                type="button"
                className={[
                  "board-square",
                  (row + col) % 2 === 1 ? "dark" : "light",
                  pieceSelected ? "selected" : "",
                  landingSelected ? "target" : "",
                ].filter(Boolean).join(" ")}
                disabled={disabled || !(piece || originMoves.length > 0 || selectableTarget)}
                onClick={() => {
                  if (piece && onPieceSelect) {
                    onPieceSelect(piece);
                    return;
                  }

                  if (selectedPieceId) {
                    const move = boardState.legalMoves.find(
                      (candidate) => candidate.pieceId === selectedPieceId && candidate.to.row === row && candidate.to.col === col,
                    );
                    if (move) {
                      onMovePreview?.(move);
                      onMoveCommit?.(move);
                    }
                  }
                }}
              >
                {piece ? (
                  <span
                    className={`piece ${piece.color} ${piece.rank}`}
                    style={{ background: pieceSkinTone(piece.rank, piece.color, equippedSkinId) }}
                    title={`${piece.color} ${piece.rank}`}
                  >
                    {piece.rank === "king" ? "K" : ""}
                  </span>
                ) : null}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
