import type { BattleDoc, MoveDoc, PokemonDoc, RoomDoc, TypeDoc } from "../types/models";
import { getDb } from "./mongo";

export async function getCollections() {
  const db = await getDb();

  return {
    pokemon: db.collection<PokemonDoc>("pokemon"),
    moves: db.collection<MoveDoc>("moves"),
    types: db.collection<TypeDoc>("types"),
    rooms: db.collection<RoomDoc>("rooms"),
    battles: db.collection<BattleDoc>("battles"),
  };
}

export async function ensureIndexes() {
  const { pokemon, moves, types, rooms, battles } = await getCollections();
  await Promise.all([
    pokemon.createIndex({ pokedexId: 1 }, { unique: true }),
    pokemon.createIndex({ eligibleForBattle: 1 }),
    moves.createIndex({ moveId: 1 }, { unique: true }),
    types.createIndex({ name: 1 }, { unique: true }),
    rooms.createIndex({ code: 1 }, { unique: true }),
    battles.createIndex({ roomCode: 1 }, { unique: true }),
  ]);
}
