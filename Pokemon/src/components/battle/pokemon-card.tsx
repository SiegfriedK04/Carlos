import { formatPokemonName, formatTypeLabel } from "../../lib/presentation";
import { StatusPill } from "../ui/status-pill";
import type { PokemonBattleState } from "../../types/models";

interface PokemonCardProps {
  pokemon: PokemonBattleState;
  isActive?: boolean;
  mirrored?: boolean;
}

export function PokemonCard({ pokemon, isActive = false, mirrored = false }: PokemonCardProps) {
  const hpPercentage = Math.max(0, Math.round((pokemon.currentHp / pokemon.stats.hp) * 100));

  return (
    <article className={`pokemon-card ${isActive ? "active" : ""}`}>
      <div className="pokemon-card__meta">
        <div>
          <p className="pokemon-card__name">{formatPokemonName(pokemon.name)}</p>
          <div className="pokemon-card__types">
            {pokemon.types.map((type) => (
              <span key={type} className={`type-chip type-${type}`}>
                {formatTypeLabel(type)}
              </span>
            ))}
          </div>
        </div>
        {pokemon.status ? <StatusPill status={pokemon.status.name} /> : null}
      </div>

      <div className={`pokemon-card__sprite ${mirrored ? "mirrored" : ""}`}>
        <img src={mirrored ? pokemon.sprites.front : pokemon.sprites.back} alt={pokemon.name} />
      </div>

      <div className="hp-block">
        <div className="hp-block__label">
          <span>HP · Nv. {pokemon.level}</span>
          <strong>{pokemon.currentHp} / {pokemon.stats.hp}</strong>
        </div>
        <div className="hp-track">
          <div className="hp-fill" style={{ width: `${hpPercentage}%` }} />
        </div>
      </div>
    </article>
  );
}
