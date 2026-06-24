export type BattleStatusName =
  | "burn"
  | "poison"
  | "paralysis"
  | "freeze"
  | "sleep"
  | "attack_down"
  | "defense_down"
  | "speed_down";

export type RoomStatus = "waiting" | "ready" | "in_battle" | "finished";
export type BattlePhase = "lobby" | "active" | "finished";
export type DamageClass = "physical" | "special" | "status";

export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface SpriteSet {
  front: string;
  back: string;
}

export interface MoveStatusMeta {
  inflicts?: BattleStatusName;
  lowersStat?: "attack" | "defense" | "speed";
  stageDelta?: number;
  chance?: number;
}

export interface MoveDoc {
  moveId: number;
  name: string;
  type: string;
  power: number | null;
  accuracy: number | null;
  priority: number;
  damageClass: DamageClass;
  effectText: string | null;
  statusMeta: MoveStatusMeta | null;
}

export interface PokemonDoc {
  pokedexId: number;
  name: string;
  generation: string | null;
  region: string | null;
  types: string[];
  baseStats: BaseStats;
  sprites: SpriteSet;
  moveIds: number[];
  eligibleForBattle: boolean;
}

export interface PokemonCatalogItem {
  pokedexId: number;
  name: string;
  generation: string | null;
  region: string | null;
  types: string[];
  sprites: SpriteSet;
  baseStats: BaseStats;
}

export interface PokemonCatalogResponse {
  items: PokemonCatalogItem[];
  meta: {
    total: number;
    regions: string[];
    generations: string[];
    types: string[];
  };
}

export interface TypeDoc {
  name: string;
  doubleTo: string[];
  halfTo: string[];
  zeroTo: string[];
}

export interface PlayerRef {
  playerId: string;
  playerName: string;
}

export interface RoomDoc {
  code: string;
  status: RoomStatus;
  players: PlayerRef[];
  readyPlayerIds: string[];
  teamSelections: {
    playerId: string;
    pokemonIds: number[];
  }[];
  createdAt: string;
}

export interface PokemonBattleState {
  slotId: string;
  pokemonId: number;
  name: string;
  level: number;
  types: string[];
  sprites: SpriteSet;
  moves: MoveDoc[];
  baseStats: BaseStats;
  stats: BaseStats;
  currentHp: number;
  fainted: boolean;
  status: {
    name: BattleStatusName;
    remainingTurns: number;
  } | null;
  stages: {
    attack: number;
    defense: number;
    speed: number;
  };
}

export interface BattlePlayerState extends PlayerRef {
  team: PokemonBattleState[];
  activeSlotId: string;
}

export type BattleAction =
  | { type: "move"; moveId: number }
  | { type: "switch"; targetSlotId: string };

export interface BattleActionEnvelope {
  playerId: string;
  turn: number;
  action: BattleAction;
}

export interface BattleLogEntry {
  id: string;
  turn: number;
  message: string;
  emphasis?: "info" | "success" | "warning";
}

export interface BattleDoc {
  roomCode: string;
  status: BattlePhase;
  turn: number;
  players: BattlePlayerState[];
  pendingActions: BattleActionEnvelope[];
  battleLog: BattleLogEntry[];
  winnerPlayerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoomSnapshot {
  room: RoomDoc;
  battle: BattleDoc | null;
}

export interface RealtimeMessage {
  type:
    | "room.updated"
    | "player.joined"
    | "player.ready"
    | "battle.started"
    | "battle.updated"
    | "turn.resolved"
    | "battle.ended";
  payload: RoomSnapshot;
}
