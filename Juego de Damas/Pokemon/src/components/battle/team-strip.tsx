import type { PokemonBattleState } from "../../types/models";
import { formatPokemonName } from "../../lib/presentation";
import { StatusPill } from "../ui/status-pill";

interface TeamStripProps {
  team: PokemonBattleState[];
  activeSlotId: string;
  selectable?: boolean;
  pendingSlotId?: string | null;
  onSelect?: (slotId: string) => void;
}

export function TeamStrip({ team, activeSlotId, selectable = false, pendingSlotId, onSelect }: TeamStripProps) {
  return (
    <div className="team-strip">
      {team.map((pokemon) => {
        const isActive = pokemon.slotId === activeSlotId;
        const isSelected = pokemon.slotId === pendingSlotId;
        return (
          <button
            key={pokemon.slotId}
            type="button"
            className={`team-chip ${isActive ? "active" : ""} ${isSelected ? "selected" : ""}`}
            disabled={!selectable || isActive || pokemon.fainted}
            onClick={() => onSelect?.(pokemon.slotId)}
          >
            <img src={pokemon.sprites.front} alt={pokemon.name} />
            <div>
              <strong>{formatPokemonName(pokemon.name)}</strong>
              <span>{pokemon.currentHp}/{pokemon.stats.hp} HP</span>
            </div>
            {pokemon.status ? <StatusPill status={pokemon.status.name} /> : null}
          </button>
        );
      })}
    </div>
  );
}
