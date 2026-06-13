const generationRegionMap: Record<string, string> = {
  "generation-i": "kanto",
  "generation-ii": "johto",
  "generation-iii": "hoenn",
  "generation-iv": "sinnoh",
  "generation-v": "unova",
  "generation-vi": "kalos",
  "generation-vii": "alola",
  "generation-viii": "galar",
  "generation-ix": "paldea",
};

export function regionFromGeneration(generation: string | null) {
  if (!generation) {
    return null;
  }

  return generationRegionMap[generation] ?? generation.replace("generation-", "");
}
