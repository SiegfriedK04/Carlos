import { formatPokemonName } from "./presentation";

export function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function sampleUnique<T>(items: T[], count: number) {
  const copy = [...items];
  const selected: T[] = [];

  while (copy.length > 0 && selected.length < count) {
    const index = randomInt(0, copy.length - 1);
    selected.push(copy.splice(index, 1)[0]);
  }

  return selected;
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function slugifyName(value: string) {
  return formatPokemonName(value);
}

export function toCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => chars[randomInt(0, chars.length - 1)]).join("");
}

export function nowIso() {
  return new Date().toISOString();
}

export function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}
