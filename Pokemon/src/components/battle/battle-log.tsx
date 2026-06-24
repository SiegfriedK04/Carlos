import type { BattleLogEntry } from "../../types/models";

export function BattleLog({ entries }: { entries: BattleLogEntry[] }) {
  return (
    <aside className="battle-log glass-panel">
      <div className="section-heading">
        <p>Registro de batalla</p>
        <span>{entries.length} eventos</span>
      </div>
      <div className="battle-log__entries">
        {entries.slice().reverse().map((entry) => (
          <article key={entry.id} className={`battle-log__entry ${entry.emphasis ?? "info"}`}>
            <span className="turn-badge">T{entry.turn}</span>
            <p>{entry.message}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}
