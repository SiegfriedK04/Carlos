import type { BaseStats, BattleStatusName, DamageClass, MoveDoc, PokemonDoc, TypeDoc } from "../types/models";
import { closeDb } from "../db/mongo";
import { ensureIndexes, getCollections } from "../db/repositories";
import { regionFromGeneration } from "../lib/pokedex-metadata";

const baseUrl = "https://pokeapi.co/api/v2";
const targetEligible = Number(process.env.SEED_TARGET_ELIGIBLE ?? 500);

interface NamedResource {
  name: string;
  url: string;
}

interface PokemonDetail {
  id: number;
  name: string;
  sprites: {
    front_default: string | null;
    back_default: string | null;
  };
  stats: {
    base_stat: number;
    stat: NamedResource;
  }[];
  types: {
    slot: number;
    type: NamedResource;
  }[];
  moves: {
    move: NamedResource;
  }[];
}

interface MoveDetail {
  id: number;
  name: string;
  accuracy: number | null;
  power: number | null;
  priority: number;
  damage_class: NamedResource;
  type: NamedResource;
  effect_entries: {
    effect: string;
    short_effect: string;
    language: NamedResource;
  }[];
  meta: {
    ailment: NamedResource;
    ailment_chance: number;
  } | null;
  stat_changes: {
    change: number;
    stat: NamedResource;
  }[];
}

interface TypeDetail {
  name: string;
  damage_relations: {
    double_damage_to: NamedResource[];
    half_damage_to: NamedResource[];
    no_damage_to: NamedResource[];
  };
}

interface SpeciesDetail {
  generation: NamedResource;
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`PokéAPI error ${response.status} en ${url}`);
  }
  return (await response.json()) as T;
}

function mapStats(stats: PokemonDetail["stats"]): BaseStats {
  const statMap = Object.fromEntries(stats.map((entry) => [entry.stat.name, entry.base_stat]));
  return {
    hp: statMap.hp,
    attack: statMap.attack,
    defense: statMap.defense,
    specialAttack: statMap["special-attack"],
    specialDefense: statMap["special-defense"],
    speed: statMap.speed,
  };
}

function detectStatusMeta(move: MoveDetail): MoveDoc["statusMeta"] {
  const ailment = move.meta?.ailment?.name;
  const ailmentChance = move.meta?.ailment_chance || 100;

  if (ailment === "burn" || ailment === "poison" || ailment === "paralysis" || ailment === "freeze" || ailment === "sleep") {
    return {
      inflicts: ailment as BattleStatusName,
      chance: ailmentChance,
    };
  }

  const statChange = move.stat_changes[0];
  if (statChange && statChange.change < 0) {
    if (statChange.stat.name === "attack") {
      return { inflicts: "attack_down", chance: 100 };
    }
    if (statChange.stat.name === "defense") {
      return { inflicts: "defense_down", chance: 100 };
    }
    if (statChange.stat.name === "speed") {
      return { inflicts: "speed_down", chance: 100 };
    }
  }

  return null;
}

async function upsertTypes() {
  const { types } = await getCollections();
  const typeIndexes = Array.from({ length: 18 }, (_, index) => index + 1);

  for (const id of typeIndexes) {
    const detail = await fetchJson<TypeDetail>(`${baseUrl}/type/${id}`);
    const typeDoc: TypeDoc = {
      name: detail.name,
      doubleTo: detail.damage_relations.double_damage_to.map((item) => item.name),
      halfTo: detail.damage_relations.half_damage_to.map((item) => item.name),
      zeroTo: detail.damage_relations.no_damage_to.map((item) => item.name),
    };
    await types.updateOne({ name: typeDoc.name }, { $set: typeDoc }, { upsert: true });
  }
}

async function upsertMove(resource: NamedResource) {
  const { moves } = await getCollections();
  const existing = await moves.findOne({ name: resource.name });
  if (existing) {
    return existing;
  }

  const detail = await fetchJson<MoveDetail>(resource.url);
  const damageClass = detail.damage_class.name as DamageClass;
  if (!detail.type?.name || !damageClass) {
    return null;
  }

  const spanishEffect = detail.effect_entries.find((entry) => entry.language.name === "es");
  const englishEffect = detail.effect_entries.find((entry) => entry.language.name === "en");
  const moveDoc: MoveDoc = {
    moveId: detail.id,
    name: detail.name,
    type: detail.type.name,
    power: detail.power,
    accuracy: detail.accuracy ?? 100,
    priority: detail.priority,
    damageClass,
    effectText:
      spanishEffect?.short_effect ??
      spanishEffect?.effect ??
      englishEffect?.short_effect ??
      englishEffect?.effect ??
      null,
    statusMeta: detectStatusMeta(detail),
  };

  await moves.updateOne({ moveId: moveDoc.moveId }, { $set: moveDoc }, { upsert: true });
  return moveDoc;
}

async function upsertPokemon(id: number) {
  const { pokemon } = await getCollections();
  const detail = await fetchJson<PokemonDetail>(`${baseUrl}/pokemon/${id}`);
  const species = await fetchJson<SpeciesDetail>(`${baseUrl}/pokemon-species/${id}`);
  const front = detail.sprites.front_default;
  const back = detail.sprites.back_default;
  if (!front || !back) {
    return null;
  }

  const uniqueMoveIds = new Set<number>();
  for (const moveEntry of detail.moves) {
    const moveDoc = await upsertMove(moveEntry.move);
    if (!moveDoc) {
      continue;
    }
    uniqueMoveIds.add(moveDoc.moveId);
  }

  const eligibleForBattle = uniqueMoveIds.size >= 4;
  const generation = species.generation?.name ?? null;
  const pokemonDoc: PokemonDoc = {
    pokedexId: detail.id,
    name: detail.name,
    generation,
    region: regionFromGeneration(generation),
    types: detail.types.sort((a, b) => a.slot - b.slot).map((entry) => entry.type.name),
    baseStats: mapStats(detail.stats),
    sprites: {
      front,
      back,
    },
    moveIds: Array.from(uniqueMoveIds),
    eligibleForBattle,
  };

  await pokemon.updateOne({ pokedexId: pokemonDoc.pokedexId }, { $set: pokemonDoc }, { upsert: true });
  return pokemonDoc;
}

async function main() {
  await ensureIndexes();
  await upsertTypes();

  let currentId = 1;
  let eligibleCount = 0;
  const { pokemon } = await getCollections();

  while (eligibleCount < targetEligible) {
    await upsertPokemon(currentId);
    eligibleCount = await pokemon.countDocuments({ eligibleForBattle: true });
    if (currentId % 10 === 0) {
      console.log(`Procesados ${currentId} Pokémon. Elegibles: ${eligibleCount}/${targetEligible}`);
    }
    currentId += 1;
  }

  console.log(`Importación completada. Elegibles: ${eligibleCount}`);
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  void closeDb();
  process.exit(1);
});
