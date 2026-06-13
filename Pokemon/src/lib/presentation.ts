import type { BattleStatusName, DamageClass } from "../types/models";

const typeLabels: Record<string, string> = {
  normal: "Normal",
  fire: "Fuego",
  water: "Agua",
  electric: "Eléctrico",
  grass: "Planta",
  ice: "Hielo",
  fighting: "Lucha",
  poison: "Veneno",
  ground: "Tierra",
  flying: "Volador",
  psychic: "Psíquico",
  bug: "Bicho",
  rock: "Roca",
  ghost: "Fantasma",
  dragon: "Dragón",
  dark: "Siniestro",
  steel: "Acero",
  fairy: "Hada",
};

const statusLabels: Record<BattleStatusName, string> = {
  burn: "Quemadura",
  poison: "Veneno",
  paralysis: "Parálisis",
  freeze: "Congelado",
  sleep: "Dormido",
  attack_down: "Ataque -1",
  defense_down: "Defensa -1",
  speed_down: "Velocidad -1",
};

const damageClassLabels: Record<DamageClass, string> = {
  physical: "Físico",
  special: "Especial",
  status: "Estado",
};

export function formatPokemonName(value: string) {
  return value
    .replace(/-/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function formatTypeLabel(type: string) {
  return typeLabels[type] ?? formatPokemonName(type);
}

export function formatStatusLabel(status: BattleStatusName) {
  return statusLabels[status];
}

export function formatDamageClassLabel(damageClass: DamageClass) {
  return damageClassLabels[damageClass];
}

export function formatRegionLabel(region: string | null) {
  return region ? formatPokemonName(region) : "Sin región";
}

export function formatGenerationLabel(generation: string | null) {
  return generation ? formatPokemonName(generation.replace("generation ", "generación ")) : "Sin generación";
}

export function formatMoveEffectText(effectText: string | null) {
  if (!effectText) {
    return "Sin efecto secundario relevante registrado.";
  }

  return effectText
    .replaceAll("Protects the user's field from major status ailments and confusion for five turns.", "Protege el lado del usuario de problemas de estado mayores y confusión durante cinco turnos.")
    .replaceAll("Protects the user from all attacks. Its chance of failing rises if it is used in succession.", "Protege al usuario de todos los ataques. Su probabilidad de fallar aumenta si se usa consecutivamente.")
    .replaceAll("Inflicts regular damage. User's critical hit rate is one level higher when using this move.", "Inflige daño normal. La probabilidad de golpe crítico del usuario aumenta un nivel al usar este movimiento.")
    .replaceAll("Lowers the target's Speed by one stage.", "Reduce la Velocidad del objetivo en un nivel.")
    .replaceAll("Lowers the target's Special Defense by one stage.", "Reduce la Defensa Especial del objetivo en un nivel.")
    .replaceAll("Lowers the target's Defense by one stage.", "Reduce la Defensa del objetivo en un nivel.")
    .replaceAll("Lowers the target's Attack by one stage.", "Reduce el Ataque del objetivo en un nivel.")
    .replaceAll("Has a $effect_chance% chance to burn the target.", "Tiene una probabilidad de quemar al objetivo.")
    .replaceAll("Has a $effect_chance% chance to paralyze the target.", "Tiene una probabilidad de paralizar al objetivo.")
    .replaceAll("Has a $effect_chance% chance to freeze the target.", "Tiene una probabilidad de congelar al objetivo.")
    .replaceAll("Has a $effect_chance% chance to poison the target.", "Tiene una probabilidad de envenenar al objetivo.")
    .replaceAll("Has a $effect_chance% chance to make the target flinch.", "Tiene una probabilidad de hacer retroceder al objetivo.")
    .replaceAll("Inflicts regular damage.", "Inflige daño normal.")
    .replaceAll("Never misses.", "Nunca falla.")
    .replaceAll("The user sleeps for two turns, completely healing itself.", "El usuario se duerme durante dos turnos y se cura por completo.")
    .replaceAll("The target is put to sleep.", "El objetivo queda dormido.")
    .replaceAll("The target is frozen solid.", "El objetivo queda congelado.")
    .replaceAll("The target is paralyzed.", "El objetivo queda paralizado.")
    .replaceAll("The target is burned.", "El objetivo queda quemado.")
    .replaceAll("The target is poisoned.", "El objetivo queda envenenado.")
    .replace(/Has a chance to paralyze the target\./gi, "Tiene probabilidad de paralizar al objetivo.")
    .replace(/Has a chance to burn the target\./gi, "Tiene probabilidad de quemar al objetivo.")
    .replace(/Has a chance to poison the target\./gi, "Tiene probabilidad de envenenar al objetivo.")
    .replace(/Has a chance to freeze the target\./gi, "Tiene probabilidad de congelar al objetivo.")
    .replace(/Has a chance to make the target flinch\./gi, "Tiene probabilidad de hacer retroceder al objetivo.")
    .replace(/Lowers the target's Speed\./gi, "Reduce la Velocidad del objetivo.")
    .replace(/Lowers the target's Speed by one stage\./gi, "Reduce la Velocidad del objetivo en un nivel.")
    .replace(/Lowers the target's Attack by one stage\./gi, "Reduce el Ataque del objetivo en un nivel.")
    .replace(/Lowers the target's Defense by one stage\./gi, "Reduce la Defensa del objetivo en un nivel.")
    .replace(/Lowers the target's Special Defense by one stage\./gi, "Reduce la Defensa Especial del objetivo en un nivel.")
    .replace(/Inflicts regular damage\./gi, "Inflige daño normal.")
    .replace(/Never misses\./gi, "Nunca falla.")
    .replace(/Hits twice in one turn\./gi, "Golpea dos veces en el mismo turno.")
    .replace(/The user must recharge next turn\./gi, "El usuario debe recargarse el siguiente turno.");
}
