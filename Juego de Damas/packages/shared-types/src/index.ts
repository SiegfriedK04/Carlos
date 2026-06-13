export type ThemeMode = "light" | "dark";
export type PieceColor = "red" | "black";
export type PieceRank = "man" | "king";
export type PaymentStatus = "pending" | "paid" | "failed" | "canceled";
export type GameStatus = "active" | "won" | "lost" | "abandoned";

export interface Position {
  row: number;
  col: number;
}

export interface AppUser {
  userId: string;
  clerkUserId: string | null;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  equippedSkinId: string | null;
  unlockedSkinIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PieceState {
  pieceId: string;
  color: PieceColor;
  rank: PieceRank;
  row: number;
  col: number;
}

export interface MoveCommand {
  pieceId: string;
  from: Position;
  to: Position;
  path: Position[];
  captures: Position[];
}

export interface BoardState {
  size: number;
  turn: PieceColor;
  pieces: PieceState[];
  forcedCapture: boolean;
  winner: PieceColor | null;
  moveCount: number;
  legalMoves: MoveCommand[];
  selectedPieceId: string | null;
  mustContinueCapture: boolean;
}

export interface SavedGame {
  gameId: string;
  userId: string;
  boardState: BoardState;
  status: GameStatus;
  difficulty: "easy" | "medium" | "hard";
  startedAt: string;
  updatedAt: string;
  finishedAt: string | null;
  humanColor: PieceColor;
  aiColor: PieceColor;
  playerMoveCount: number;
  aiMoveCount: number;
  lastPlayerMove: MoveCommand | null;
  lastAiMove: MoveCommand | null;
  lastAiSummary: string | null;
}

export interface GameSummary {
  gameId: string;
  status: GameStatus;
  difficulty: "easy" | "medium" | "hard";
  moveCount: number;
  playerMoveCount: number;
  aiMoveCount: number;
  updatedAt: string;
  winner: PieceColor | null;
}

export interface RankingEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  bestWinMoveCount: number;
  wins: number;
  achievedAt: string;
}

export interface MarketplaceItem {
  itemId: string;
  slug: string;
  name: string;
  description: string;
  previewColor: string;
  priceUsd: number;
  stripePriceId: string | null;
}

export interface PurchaseRecord {
  paymentId: string;
  userId: string;
  itemId: string;
  provider: "stripe";
  status: PaymentStatus;
  amountUsd: number;
  stripePaymentIntentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiMoveRequest {
  boardState: BoardState;
  currentPlayer: PieceColor;
  searchBudget?: number;
}

export interface AiMoveResponse {
  recommendedMove: MoveCommand | null;
  score: number;
  exploredNodes: number;
  summary: string;
}

export interface StripeCheckoutResponse {
  paymentId: string;
  clientSecret: string;
  publishableKey: string;
  paymentIntentId: string;
}

export interface GameTurnResult {
  game: SavedGame;
  playerMove: MoveCommand;
  aiMove: MoveCommand | null;
  ai: AiMoveResponse | null;
  message: string;
}

export interface UserInventory {
  equippedSkinId: string | null;
  unlockedSkinIds: string[];
}

export interface AuthSessionResponse {
  sessionToken: string;
  user: AppUser;
}

export * from "./rules";
