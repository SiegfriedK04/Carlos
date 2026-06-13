import type { AiMoveResponse, BoardState, MoveCommand, PieceColor, PieceRank, PieceState, Position } from "./index";

const BOARD_SIZE = 8;
const PLAYER_DIRECTIONS: Record<PieceColor, Array<{ row: number; col: number }>> = {
  red: [
    { row: -1, col: -1 },
    { row: -1, col: 1 },
  ],
  black: [
    { row: 1, col: -1 },
    { row: 1, col: 1 },
  ],
};

const CAPTURE_DIRECTIONS = [
  { row: -1, col: -1 },
  { row: -1, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 1 },
];

export interface AppliedMoveResult {
  boardState: BoardState;
  move: MoveCommand;
  capturedCount: number;
  promoted: boolean;
}

export interface AStarSearchResult extends AiMoveResponse {}

function clonePosition(position: Position): Position {
  return { row: position.row, col: position.col };
}

function clonePiece(piece: PieceState): PieceState {
  return { ...piece };
}

export function isInsideBoard(row: number, col: number, size = BOARD_SIZE) {
  return row >= 0 && row < size && col >= 0 && col < size;
}

export function isPlayableSquare(row: number, col: number) {
  return (row + col) % 2 === 1;
}

export function getOpponentColor(color: PieceColor): PieceColor {
  return color === "red" ? "black" : "red";
}

export function createInitialBoardState(): BoardState {
  const pieces: PieceState[] = [];

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (isPlayableSquare(row, col)) {
        pieces.push({ pieceId: `black-${row}-${col}`, color: "black", rank: "man", row, col });
      }
    }
  }

  for (let row = 5; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (isPlayableSquare(row, col)) {
        pieces.push({ pieceId: `red-${row}-${col}`, color: "red", rank: "man", row, col });
      }
    }
  }

  return resolveBoardState({
    size: BOARD_SIZE,
    turn: "red",
    pieces,
    forcedCapture: false,
    winner: null,
    moveCount: 0,
    legalMoves: [],
    selectedPieceId: null,
    mustContinueCapture: false,
  });
}

export function findPieceAt(pieces: PieceState[], row: number, col: number) {
  return pieces.find((piece) => piece.row === row && piece.col === col) ?? null;
}

function toKey(position: Position) {
  return `${position.row}:${position.col}`;
}

function normalDirections(piece: PieceState) {
  return piece.rank === "king" ? CAPTURE_DIRECTIONS : PLAYER_DIRECTIONS[piece.color];
}

function promoteIfNeeded(piece: PieceState): boolean {
  if (piece.rank === "king") {
    return false;
  }

  if (piece.color === "red" && piece.row === 0) {
    piece.rank = "king";
    return true;
  }

  if (piece.color === "black" && piece.row === BOARD_SIZE - 1) {
    piece.rank = "king";
    return true;
  }

  return false;
}

function simulateMovePieces(pieces: PieceState[], move: MoveCommand) {
  const nextPieces = pieces.map(clonePiece);
  const piece = nextPieces.find((entry) => entry.pieceId === move.pieceId);
  if (!piece) {
    throw new Error("La ficha a mover no existe.");
  }

  piece.row = move.to.row;
  piece.col = move.to.col;

  for (const capture of move.captures) {
    const index = nextPieces.findIndex((entry) => entry.row === capture.row && entry.col === capture.col);
    if (index >= 0) {
      nextPieces.splice(index, 1);
    }
  }

  const promoted = promoteIfNeeded(piece);
  return { nextPieces, promoted };
}

function buildCaptureMoves(
  origin: PieceState,
  current: PieceState,
  pieces: PieceState[],
  path: Position[],
  captures: Position[],
): MoveCommand[] {
  const sequences: MoveCommand[] = [];

  for (const direction of CAPTURE_DIRECTIONS) {
    const enemyRow = current.row + direction.row;
    const enemyCol = current.col + direction.col;
    const landingRow = current.row + direction.row * 2;
    const landingCol = current.col + direction.col * 2;

    if (!isInsideBoard(landingRow, landingCol) || !isPlayableSquare(landingRow, landingCol)) {
      continue;
    }

    const middlePiece = findPieceAt(pieces, enemyRow, enemyCol);
    if (!middlePiece || middlePiece.color === current.color) {
      continue;
    }

    if (findPieceAt(pieces, landingRow, landingCol)) {
      continue;
    }

    const nextPieces = pieces
      .filter((piece) => piece.pieceId !== middlePiece.pieceId)
      .map((piece) => (piece.pieceId === current.pieceId ? { ...piece, row: landingRow, col: landingCol } : clonePiece(piece)));
    const nextCurrent = nextPieces.find((piece) => piece.pieceId === current.pieceId)!;
    const nextPath = [...path, { row: landingRow, col: landingCol }];
    const nextCaptures = [...captures, { row: enemyRow, col: enemyCol }];
    const promoted = promoteIfNeeded(nextCurrent);

    // In this project variant the turn ends when a man is promoted during a capture sequence.
    const extended = promoted
      ? []
      : buildCaptureMoves(origin, nextCurrent, nextPieces, nextPath, nextCaptures);

    if (extended.length > 0) {
      sequences.push(...extended);
      continue;
    }

    sequences.push({
      pieceId: origin.pieceId,
      from: { row: origin.row, col: origin.col },
      to: { row: landingRow, col: landingCol },
      path: nextPath.map(clonePosition),
      captures: nextCaptures.map(clonePosition),
    });
  }

  return sequences;
}

function getSimpleMoves(piece: PieceState, pieces: PieceState[]): MoveCommand[] {
  const moves: MoveCommand[] = [];

  for (const direction of normalDirections(piece)) {
    const nextRow = piece.row + direction.row;
    const nextCol = piece.col + direction.col;

    if (!isInsideBoard(nextRow, nextCol) || !isPlayableSquare(nextRow, nextCol)) {
      continue;
    }

    if (findPieceAt(pieces, nextRow, nextCol)) {
      continue;
    }

    moves.push({
      pieceId: piece.pieceId,
      from: { row: piece.row, col: piece.col },
      to: { row: nextRow, col: nextCol },
      path: [{ row: nextRow, col: nextCol }],
      captures: [],
    });
  }

  return moves;
}

function getCaptureMoves(piece: PieceState, pieces: PieceState[]) {
  return buildCaptureMoves(piece, clonePiece(piece), pieces.map(clonePiece), [], []);
}

export function generateLegalMoves(boardState: BoardState, color = boardState.turn): MoveCommand[] {
  const pieces = boardState.pieces.map(clonePiece);
  const ownPieces = pieces.filter((piece) => piece.color === color);
  const captureMoves = ownPieces.flatMap((piece) => getCaptureMoves(piece, pieces));

  if (captureMoves.length > 0) {
    return captureMoves;
  }

  return ownPieces.flatMap((piece) => getSimpleMoves(piece, pieces));
}

export function resolveBoardState(boardState: BoardState): BoardState {
  const legalMoves = generateLegalMoves(
    {
      ...boardState,
      legalMoves: [],
      selectedPieceId: null,
      mustContinueCapture: false,
    },
    boardState.turn,
  );
  const winner = determineWinner(boardState.pieces, boardState.turn, legalMoves);

  return {
    ...boardState,
    forcedCapture: legalMoves.some((move) => move.captures.length > 0),
    legalMoves,
    winner,
    selectedPieceId: null,
    mustContinueCapture: false,
  };
}

export function determineWinner(
  pieces: PieceState[],
  turn: PieceColor,
  legalMoves = generateLegalMoves({
    size: BOARD_SIZE,
    turn,
    pieces,
    forcedCapture: false,
    winner: null,
    moveCount: 0,
    legalMoves: [],
    selectedPieceId: null,
    mustContinueCapture: false,
  }),
): PieceColor | null {
  const redPieces = pieces.filter((piece) => piece.color === "red");
  const blackPieces = pieces.filter((piece) => piece.color === "black");

  if (redPieces.length === 0) {
    return "black";
  }

  if (blackPieces.length === 0) {
    return "red";
  }

  if (legalMoves.length === 0) {
    return getOpponentColor(turn);
  }

  return null;
}

function sameMove(move: MoveCommand, candidate: MoveCommand) {
  if (move.pieceId !== candidate.pieceId) {
    return false;
  }

  if (move.from.row !== candidate.from.row || move.from.col !== candidate.from.col) {
    return false;
  }

  if (move.path.length !== candidate.path.length || move.captures.length !== candidate.captures.length) {
    return false;
  }

  return move.path.every((position, index) => toKey(position) === toKey(candidate.path[index]!)) &&
    move.captures.every((position, index) => toKey(position) === toKey(candidate.captures[index]!));
}

export function applyMove(boardState: BoardState, move: MoveCommand): AppliedMoveResult {
  const legalMoves = boardState.legalMoves.length > 0 ? boardState.legalMoves : generateLegalMoves(boardState);
  const chosenMove = legalMoves.find((candidate) => sameMove(move, candidate));
  if (!chosenMove) {
    throw new Error("Movimiento invalido para el estado actual.");
  }

  const { nextPieces, promoted } = simulateMovePieces(boardState.pieces, chosenMove);
  const nextBoard = resolveBoardState({
    ...boardState,
    pieces: nextPieces,
    moveCount: boardState.moveCount + 1,
    turn: getOpponentColor(boardState.turn),
  });

  return {
    boardState: nextBoard,
    move: chosenMove,
    capturedCount: chosenMove.captures.length,
    promoted,
  };
}

function scorePiece(piece: PieceState) {
  return piece.rank === "king" ? 3.5 : 1;
}

function countThreats(boardState: BoardState, color: PieceColor) {
  const opponentBoard = { ...boardState, turn: getOpponentColor(color), legalMoves: [] };
  const opponentMoves = generateLegalMoves(opponentBoard, opponentBoard.turn);
  const threatened = new Set<string>();

  for (const move of opponentMoves) {
    for (const capture of move.captures) {
      const piece = findPieceAt(boardState.pieces, capture.row, capture.col);
      if (piece && piece.color === color) {
        threatened.add(piece.pieceId);
      }
    }
  }

  return threatened.size;
}

export function evaluateBoard(boardState: BoardState, perspective: PieceColor) {
  const ownPieces = boardState.pieces.filter((piece) => piece.color === perspective);
  const opponentPieces = boardState.pieces.filter((piece) => piece.color !== perspective);
  const ownMaterial = ownPieces.reduce((sum, piece) => sum + scorePiece(piece), 0);
  const opponentMaterial = opponentPieces.reduce((sum, piece) => sum + scorePiece(piece), 0);
  const ownKings = ownPieces.filter((piece) => piece.rank === "king").length;
  const opponentKings = opponentPieces.filter((piece) => piece.rank === "king").length;
  const ownCenter = ownPieces.reduce((sum, piece) => sum + (piece.row >= 2 && piece.row <= 5 && piece.col >= 2 && piece.col <= 5 ? 0.2 : 0), 0);
  const opponentCenter = opponentPieces.reduce((sum, piece) => sum + (piece.row >= 2 && piece.row <= 5 && piece.col >= 2 && piece.col <= 5 ? 0.2 : 0), 0);
  const ownAdvancement = ownPieces.reduce(
    (sum, piece) => sum + (piece.rank === "man" ? (piece.color === "red" ? BOARD_SIZE - 1 - piece.row : piece.row) * 0.08 : 0),
    0,
  );
  const opponentAdvancement = opponentPieces.reduce(
    (sum, piece) => sum + (piece.rank === "man" ? (piece.color === "red" ? BOARD_SIZE - 1 - piece.row : piece.row) * 0.08 : 0),
    0,
  );
  const ownThreats = countThreats(boardState, perspective);
  const opponentThreats = countThreats(boardState, getOpponentColor(perspective));
  const mobility = generateLegalMoves({ ...boardState, turn: perspective, legalMoves: [] }, perspective).length;
  const opponentMobility = generateLegalMoves({ ...boardState, turn: getOpponentColor(perspective), legalMoves: [] }, getOpponentColor(perspective)).length;

  let score =
    (ownMaterial - opponentMaterial) * 12 +
    (ownKings - opponentKings) * 4 +
    (ownCenter - opponentCenter) * 2 +
    (ownAdvancement - opponentAdvancement) * 2 +
    (mobility - opponentMobility) * 0.5 +
    (opponentThreats - ownThreats) * 2;

  if (boardState.winner === perspective) {
    score += 10_000 - boardState.moveCount;
  }

  if (boardState.winner === getOpponentColor(perspective)) {
    score -= 10_000 - boardState.moveCount;
  }

  return score;
}

interface SearchNode {
  boardState: BoardState;
  firstMove: MoveCommand;
  depth: number;
  pathCost: number;
  heuristicCost: number;
  totalCost: number;
}

function estimateDistanceToWin(boardState: BoardState, perspective: PieceColor) {
  if (boardState.winner === perspective) {
    return 0;
  }

  if (boardState.winner === getOpponentColor(perspective)) {
    return 10_000;
  }

  const ownPieces = boardState.pieces.filter((piece) => piece.color === perspective);
  const opponentPieces = boardState.pieces.filter((piece) => piece.color !== perspective);
  const ownMaterial = ownPieces.reduce((sum, piece) => sum + scorePiece(piece), 0);
  const opponentMaterial = opponentPieces.reduce((sum, piece) => sum + scorePiece(piece), 0);
  const ownMobility = generateLegalMoves({ ...boardState, turn: perspective, legalMoves: [] }, perspective).length;
  const opponentMobility = generateLegalMoves({ ...boardState, turn: getOpponentColor(perspective), legalMoves: [] }, getOpponentColor(perspective)).length;
  const ownPromotionDistance = ownPieces.reduce((sum, piece) => {
    if (piece.rank === "king") {
      return sum;
    }

    return sum + (piece.color === "red" ? piece.row : BOARD_SIZE - 1 - piece.row);
  }, 0);
  const opponentPromotionDistance = opponentPieces.reduce((sum, piece) => {
    if (piece.rank === "king") {
      return sum;
    }

    return sum + (piece.color === "red" ? piece.row : BOARD_SIZE - 1 - piece.row);
  }, 0);

  return Math.max(
    0,
    opponentPieces.length * 12 +
      (opponentMaterial - ownMaterial) * 4 +
      Math.max(0, opponentMobility - ownMobility) * 1.5 +
      Math.max(0, ownPromotionDistance - opponentPromotionDistance) * 0.25,
  );
}

function edgeCost(move: MoveCommand, boardState: BoardState, perspective: PieceColor) {
  if (boardState.winner === perspective) {
    return 0.1;
  }

  if (boardState.winner === getOpponentColor(perspective)) {
    return 100;
  }

  const promotionBonus = boardState.pieces.find((piece) => piece.pieceId === move.pieceId)?.rank === "king" ? 0 : 0.4;
  return Math.max(0.2, 1.2 - move.captures.length * 0.35 - promotionBonus);
}

function pushSorted(frontier: SearchNode[], node: SearchNode) {
  frontier.push(node);
  frontier.sort((left, right) => left.totalCost - right.totalCost || left.heuristicCost - right.heuristicCost);
}

export function searchBestMoveAStar(boardState: BoardState, currentPlayer: PieceColor, searchBudget = 250): AStarSearchResult {
  const rootBoard = resolveBoardState({ ...boardState, turn: currentPlayer });
  const legalMoves = rootBoard.legalMoves;
  if (legalMoves.length === 0) {
    return {
      recommendedMove: null,
      score: evaluateBoard(rootBoard, currentPlayer),
      exploredNodes: 0,
      summary: "No hay movimientos legales disponibles para el jugador actual.",
    };
  }

  const frontier: SearchNode[] = [];
  const bestSeen = new Map<string, SearchNode>();
  let exploredNodes = 0;

  for (const move of legalMoves) {
    const applied = applyMove(rootBoard, move);
    const pathCost = edgeCost(move, applied.boardState, currentPlayer);
    const heuristicCost = estimateDistanceToWin(applied.boardState, currentPlayer);
    const node: SearchNode = {
      boardState: applied.boardState,
      firstMove: move,
      depth: 1,
      pathCost,
      heuristicCost,
      totalCost: pathCost + heuristicCost,
    };
    pushSorted(frontier, node);
    bestSeen.set(JSON.stringify(move), node);
  }

  while (frontier.length > 0 && exploredNodes < searchBudget) {
    const node = frontier.shift()!;
    exploredNodes += 1;
    if (node.boardState.winner === currentPlayer) {
      return {
        recommendedMove: node.firstMove,
        score: evaluateBoard(node.boardState, currentPlayer),
        exploredNodes,
        summary: `A* encontro una ruta ganadora tras explorar ${exploredNodes} nodos del grafo de estados.`,
      };
    }

    if (node.boardState.winner) {
      continue;
    }

    const nextMoves = node.boardState.legalMoves.length > 0 ? node.boardState.legalMoves : generateLegalMoves(node.boardState);
    for (const nextMove of nextMoves) {
      const applied = applyMove(node.boardState, nextMove);
      const pathCost = node.pathCost + edgeCost(nextMove, applied.boardState, currentPlayer);
      const heuristicCost = estimateDistanceToWin(applied.boardState, currentPlayer);
      const candidate: SearchNode = {
        boardState: applied.boardState,
        firstMove: node.firstMove,
        depth: node.depth + 1,
        pathCost,
        heuristicCost,
        totalCost: pathCost + heuristicCost,
      };
      const rootKey = JSON.stringify(node.firstMove);
      const currentBest = bestSeen.get(rootKey);
      if (!currentBest || candidate.totalCost < currentBest.totalCost) {
        bestSeen.set(rootKey, candidate);
      }
      const stateKey = JSON.stringify({
        turn: applied.boardState.turn,
        pieces: applied.boardState.pieces
          .map((piece) => `${piece.pieceId}:${piece.row}:${piece.col}:${piece.rank}`)
          .sort(),
      });
      const seen = bestSeen.get(`${rootKey}:${stateKey}`);
      if (!seen || candidate.totalCost < seen.totalCost) {
        bestSeen.set(`${rootKey}:${stateKey}`, candidate);
        pushSorted(frontier, candidate);
      }
    }
  }

  const rankedMoves = legalMoves
    .map((move) => {
      const node = bestSeen.get(JSON.stringify(move));
      const fallbackScore = evaluateBoard(applyMove(rootBoard, move).boardState, currentPlayer);
      return {
        move,
        node,
        score: node ? -node.totalCost : fallbackScore,
      };
    })
    .sort((left, right) => right.score - left.score || right.move.captures.length - left.move.captures.length);

  const best = rankedMoves[0]!;
  return {
    recommendedMove: best.move,
    score: best.score,
    exploredNodes,
    summary: `A* exploro ${exploredNodes} nodos y priorizo ${
      best.move.captures.length > 0 ? "una secuencia de captura" : "un avance posicional"
    } con costo estimado ${Math.abs(best.score).toFixed(2)}.`,
  };
}

export function formatMove(move: MoveCommand | null) {
  if (!move) {
    return "sin movimiento";
  }

  return `${move.from.row},${move.from.col} -> ${move.to.row},${move.to.col}`;
}

export function pieceSkinTone(rank: PieceRank, color: PieceColor, equippedSkinId: string | null) {
  if (equippedSkinId === "skin_checkerboard") {
    return color === "red"
      ? rank === "king" ? "#f7d38d" : "#e6b45d"
      : rank === "king" ? "#4f5c68" : "#2c3741";
  }

  if (equippedSkinId === "skin_royal_garnet") {
    return color === "red"
      ? rank === "king" ? "#f3b3c2" : "#b94a63"
      : rank === "king" ? "#a6afb8" : "#414a55";
  }

  if (equippedSkinId === "skin_forest_gold") {
    return color === "red"
      ? rank === "king" ? "#f1df9b" : "#9aa84f"
      : rank === "king" ? "#d9c27a" : "#5f6f34";
  }

  return color === "red"
    ? rank === "king" ? "#ffd6a0" : "#ff8f70"
    : rank === "king" ? "#b9c4d0" : "#3d4652";
}
