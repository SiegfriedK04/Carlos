import { describe, expect, test } from "bun:test";
import { createBattleState, resolveTurnIfReady, validateAction } from "../src/lib/battle-engine";
import type { MoveDoc, PokemonDoc, TypeDoc } from "../src/types/models";

const tackle: MoveDoc = {
  moveId: 1,
  name: "tackle",
  type: "normal",
  power: 50,
  accuracy: 100,
  priority: 0,
  damageClass: "physical",
  effectText: null,
  statusMeta: null,
};

const thunderWave: MoveDoc = {
  moveId: 2,
  name: "thunder-wave",
  type: "electric",
  power: null,
  accuracy: 100,
  priority: 0,
  damageClass: "status",
  effectText: null,
  statusMeta: {
    inflicts: "paralysis",
    chance: 100,
  },
};

const ember: MoveDoc = {
  moveId: 3,
  name: "ember",
  type: "fire",
  power: 40,
  accuracy: 100,
  priority: 0,
  damageClass: "special",
  effectText: null,
  statusMeta: {
    inflicts: "burn",
    chance: 100,
  },
};

const mockPokemon: PokemonDoc = {
  pokedexId: 25,
  name: "pikachu",
  generation: "generation-i",
  region: "kanto",
  types: ["electric"],
  baseStats: {
    hp: 60,
    attack: 70,
    defense: 55,
    specialAttack: 65,
    specialDefense: 55,
    speed: 90,
  },
  sprites: {
    front: "front.png",
    back: "back.png",
  },
  moveIds: [1, 2, 3, 4],
  eligibleForBattle: true,
};

const mockTypes: TypeDoc[] = [
  { name: "normal", doubleTo: [], halfTo: ["rock"], zeroTo: ["ghost"] },
  { name: "electric", doubleTo: ["water", "flying"], halfTo: ["grass"], zeroTo: ["ground"] },
  { name: "fire", doubleTo: ["grass"], halfTo: ["water"], zeroTo: [] },
];

describe("battle engine", () => {
  test("rejects repeated action for same turn", () => {
    const moves = new Map([
      [1, tackle],
      [2, thunderWave],
      [3, ember],
      [4, tackle],
    ]);
    const pokedex = Array.from({ length: 12 }, (_, index) => ({
      ...mockPokemon,
      pokedexId: index + 1,
      name: `poke-${index + 1}`,
    }));
    const teams = new Map<string, number[]>([
      ["a", pokedex.slice(0, 6).map((pokemon) => pokemon.pokedexId)],
      ["b", pokedex.slice(6, 12).map((pokemon) => pokemon.pokedexId)],
    ]);
    const battle = createBattleState(
      "ROOM01",
      [
        { playerId: "a", playerName: "A" },
        { playerId: "b", playerName: "B" },
      ],
      new Map(pokedex.map((pokemon) => [pokemon.pokedexId, pokemon])),
      moves,
      teams,
    );

    validateAction(battle, "a", battle.turn, { type: "move", moveId: battle.players[0].team[0].moves[0].moveId });
    battle.pendingActions.push({ playerId: "a", turn: battle.turn, action: { type: "move", moveId: 1 } });

    expect(() => validateAction(battle, "a", battle.turn, { type: "move", moveId: 1 })).toThrow();
  });

  test("resolves a turn and increments turn counter", () => {
    const moves = new Map([
      [1, tackle],
      [2, thunderWave],
      [3, ember],
      [4, tackle],
    ]);
    const pokedex = Array.from({ length: 12 }, (_, index) => ({
      ...mockPokemon,
      pokedexId: index + 100,
      name: `poke-${index + 100}`,
    }));
    const teams = new Map<string, number[]>([
      ["a", pokedex.slice(0, 6).map((pokemon) => pokemon.pokedexId)],
      ["b", pokedex.slice(6, 12).map((pokemon) => pokemon.pokedexId)],
    ]);
    const battle = createBattleState(
      "ROOM01",
      [
        { playerId: "a", playerName: "A" },
        { playerId: "b", playerName: "B" },
      ],
      new Map(pokedex.map((pokemon) => [pokemon.pokedexId, pokemon])),
      moves,
      teams,
    );

    const firstMove = battle.players[0].team[0].moves[0];
    const secondMove = battle.players[1].team[0].moves[0];

    battle.pendingActions.push({ playerId: "a", turn: battle.turn, action: { type: "move", moveId: firstMove.moveId } });
    battle.pendingActions.push({ playerId: "b", turn: battle.turn, action: { type: "move", moveId: secondMove.moveId } });

    const updated = resolveTurnIfReady(battle, mockTypes);
    expect(updated.turn).toBe(2);
    expect(updated.pendingActions).toHaveLength(0);
    expect(updated.battleLog.length).toBeGreaterThan(1);
  });
});
