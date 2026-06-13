import type { MoveDoc, PokemonBattleState } from "../../types/models";
import { formatDamageClassLabel, formatPokemonName, formatTypeLabel } from "../../lib/presentation";

interface MoveGridProps {
  activePokemon: PokemonBattleState;
  disabled: boolean;
  pendingMoveId?: number | null;
  onMoveSelect: (move: MoveDoc) => void;
}

export function MoveGrid({ activePokemon, disabled, pendingMoveId, onMoveSelect }: MoveGridProps) {
  return (
    <div className="move-grid">
      {activePokemon.moves.map((move) => (
        <button
          key={move.moveId}
          type="button"
          className={`move-button ${pendingMoveId === move.moveId ? "selected" : ""}`}
          onClick={() => onMoveSelect(move)}
          disabled={disabled}
        >
          <span className="move-button__title">{formatPokemonName(move.name)}</span>
          <span className="move-button__meta">
            <span>{formatTypeLabel(move.type)}</span>
            <span>{formatDamageClassLabel(move.damageClass)}</span>
            <span>Poder {move.power ?? 0}</span>
            <span>Prec. {move.accuracy ?? 100}</span>
            <span>Prio. {move.priority}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
