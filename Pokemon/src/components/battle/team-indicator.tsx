import { Circle, CircleDashed } from "lucide-react";
import type { PokemonBattleState } from "../../types/models";

export function TeamIndicator({
  team,
  align = "left",
}: {
  team: PokemonBattleState[];
  align?: "left" | "right";
}) {
  return (
    <div className={`team-indicator ${align}`}>
      {team.map((pokemon) =>
        pokemon.fainted ? (
          <CircleDashed key={pokemon.slotId} size={16} className="team-indicator__ball fainted" />
        ) : (
          <Circle key={pokemon.slotId} size={16} className="team-indicator__ball alive" />
        ),
      )}
    </div>
  );
}
