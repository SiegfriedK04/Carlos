import type {
  BattleAction,
  BattleDoc,
  MoveDoc,
  PlayerRef,
  PokemonCatalogResponse,
  PokemonDoc,
  RoomDoc,
  RoomSnapshot,
  TypeDoc,
} from "../types/models";
import { TEAM_SIZE } from "../lib/constants";
import { createBattleState, resolveTurnIfReady, validateAction } from "../lib/battle-engine";
import { nowIso, toCode } from "../lib/utils";
import { ensureIndexes, getCollections } from "../db/repositories";

async function buildSnapshot(code: string): Promise<RoomSnapshot> {
  const { rooms, battles } = await getCollections();
  const room = await rooms.findOne({ code });
  if (!room) {
    throw new Error("Sala no encontrada.");
  }
  const battle = await battles.findOne({ roomCode: code });
  return { room, battle };
}

async function uniqueCode() {
  const { rooms } = await getCollections();
  let code = toCode();
  while (await rooms.findOne({ code })) {
    code = toCode();
  }
  return code;
}

export async function bootstrapStorage() {
  await ensureIndexes();
}

export async function createRoom(playerName: string) {
  const { rooms } = await getCollections();
  const player: PlayerRef = {
    playerId: crypto.randomUUID(),
    playerName: playerName.trim(),
  };
  const room: RoomDoc = {
    code: await uniqueCode(),
    status: "waiting",
    players: [player],
    readyPlayerIds: [],
    teamSelections: [
      {
        playerId: player.playerId,
        pokemonIds: [],
      },
    ],
    createdAt: nowIso(),
  };
  await rooms.insertOne(room);
  return buildSnapshot(room.code);
}

export async function joinRoom(code: string, playerName: string) {
  const { rooms } = await getCollections();
  const room = await rooms.findOne({ code });
  if (!room) {
    throw new Error("La sala no existe.");
  }
  if (room.players.length >= 2) {
    throw new Error("La sala ya está llena.");
  }
  const player: PlayerRef = {
    playerId: crypto.randomUUID(),
    playerName: playerName.trim(),
  };

  await rooms.updateOne(
    { code },
    {
      $push: { players: player },
      $set: { status: "ready" },
      $addToSet: {
        teamSelections: {
          playerId: player.playerId,
          pokemonIds: [],
        },
      },
    },
  );
  return buildSnapshot(code);
}

export async function updateTeamSelection(code: string, playerId: string, pokemonIds: number[]) {
  const { pokemon, rooms } = await getCollections();
  const room = await rooms.findOne({ code });
  if (!room) {
    throw new Error("Sala no encontrada.");
  }
  if (!room.players.some((item) => item.playerId === playerId)) {
    throw new Error("Ese jugador no pertenece a la sala.");
  }

  const uniqueIds = Array.from(new Set(pokemonIds));
  if (uniqueIds.length > TEAM_SIZE) {
    throw new Error(`Solo puedes seleccionar ${TEAM_SIZE} Pokémon.`);
  }

  const validCount = await pokemon.countDocuments({
    pokedexId: { $in: uniqueIds },
    eligibleForBattle: true,
  });

  if (validCount !== uniqueIds.length) {
    throw new Error("Tu equipo contiene Pokémon no válidos para batalla.");
  }

  const selections = room.teamSelections ?? [];
  const nextSelections = selections.some((selection) => selection.playerId === playerId)
    ? selections.map((selection) =>
        selection.playerId === playerId ? { ...selection, pokemonIds: uniqueIds } : selection,
      )
    : [...selections, { playerId, pokemonIds: uniqueIds }];

  const nextReadyIds = room.readyPlayerIds.filter((id) => id !== playerId);

  await rooms.updateOne(
    { code },
    {
      $set: {
        teamSelections: nextSelections,
        readyPlayerIds: nextReadyIds,
      },
    },
  );

  return buildSnapshot(code);
}

export async function markReady(code: string, playerId: string) {
  const { battles, moves, pokemon, rooms } = await getCollections();
  const room = await rooms.findOne({ code });
  if (!room) {
    throw new Error("Sala no encontrada.");
  }
  if (!room.players.some((item) => item.playerId === playerId)) {
    throw new Error("Ese jugador no pertenece a la sala.");
  }
  const playerSelection = (room.teamSelections ?? []).find((selection) => selection.playerId === playerId);
  if (!playerSelection || playerSelection.pokemonIds.length !== TEAM_SIZE) {
    throw new Error(`Selecciona exactamente ${TEAM_SIZE} Pokémon antes de marcar listo.`);
  }

  const nextReadyIds = Array.from(new Set([...room.readyPlayerIds, playerId]));
  await rooms.updateOne({ code }, { $set: { readyPlayerIds: nextReadyIds } });

  if (room.players.length === 2 && nextReadyIds.length === 2 && !(await battles.findOne({ roomCode: code }))) {
    const selectedIds = (room.teamSelections ?? []).flatMap((selection) => selection.pokemonIds);
    const chosenPokemon = await pokemon.find({ pokedexId: { $in: selectedIds }, eligibleForBattle: true }).toArray();
    const allMoves = await moves.find({}).toArray();
    const moveMap = new Map<number, MoveDoc>(allMoves.map((move) => [move.moveId, move]));
    const pokemonMap = new Map<number, PokemonDoc>(chosenPokemon.map((item) => [item.pokedexId, item]));
    const selectedTeamsByPlayer = new Map(
      (room.teamSelections ?? []).map((selection) => [selection.playerId, selection.pokemonIds]),
    );
    const battle = createBattleState(code, room.players, pokemonMap, moveMap, selectedTeamsByPlayer);
    await battles.insertOne(battle);
    await rooms.updateOne({ code }, { $set: { status: "in_battle" } });
  }

  return buildSnapshot(code);
}

export async function getRoomSnapshot(code: string) {
  return buildSnapshot(code);
}

export async function submitAction(code: string, playerId: string, turn: number, action: BattleAction) {
  const { battles, rooms, types } = await getCollections();
  const battle = await battles.findOne({ roomCode: code });
  if (!battle) {
    throw new Error("La batalla aún no existe.");
  }
  const room = await rooms.findOne({ code });
  if (!room || !room.players.some((player) => player.playerId === playerId)) {
    throw new Error("El jugador no pertenece a esta sala.");
  }

  validateAction(battle, playerId, turn, action);
  battle.pendingActions.push({ playerId, turn, action });

  const typeDocs = await types.find({}).toArray();
  const resolvedBattle = resolveTurnIfReady(battle, typeDocs as TypeDoc[]);
  await battles.updateOne({ roomCode: code }, { $set: resolvedBattle });

  if (resolvedBattle.status === "finished") {
    await rooms.updateOne({ code }, { $set: { status: "finished" } });
  }

  return buildSnapshot(code);
}

export async function ensureSeedReadiness() {
  const { pokemon, moves, types } = await getCollections();
  return {
    pokemon: await pokemon.countDocuments({ eligibleForBattle: true }),
    moves: await moves.countDocuments(),
    types: await types.countDocuments(),
  };
}

export async function getPokemonCatalog(filters: {
  search?: string;
  type?: string;
  region?: string;
  generation?: string;
  limit?: number;
}): Promise<PokemonCatalogResponse> {
  const { pokemon } = await getCollections();
  const query: Record<string, unknown> = {
    eligibleForBattle: true,
  };

  if (filters.search) {
    query.name = {
      $regex: filters.search.trim().toLowerCase(),
      $options: "i",
    };
  }
  if (filters.type) {
    query.types = filters.type;
  }
  if (filters.region) {
    query.region = filters.region;
  }
  if (filters.generation) {
    query.generation = filters.generation;
  }

  const limit = Math.min(filters.limit ?? 150, 600);
  const docs = await pokemon.find(query).sort({ pokedexId: 1 }).limit(limit).toArray();
  const total = await pokemon.countDocuments(query);
  const allMetaDocs = await pokemon
    .find(
      { eligibleForBattle: true },
      {
        projection: {
          generation: 1,
          region: 1,
          types: 1,
        },
      },
    )
    .toArray();

  return {
    items: docs.map((item) => ({
      pokedexId: item.pokedexId,
      name: item.name,
      generation: item.generation,
      region: item.region,
      types: item.types,
      sprites: item.sprites,
      baseStats: item.baseStats,
    })),
    meta: {
      total,
      generations: Array.from(
        new Set(allMetaDocs.map((item) => item.generation).filter((value): value is string => Boolean(value))),
      ).sort(),
      regions: Array.from(new Set(allMetaDocs.map((item) => item.region).filter((value): value is string => Boolean(value)))).sort(),
      types: Array.from(new Set(allMetaDocs.flatMap((item) => item.types ?? []))).sort(),
    },
  };
}
