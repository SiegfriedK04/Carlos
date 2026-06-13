import type { BattleStatusName } from "../../types/models";
import { formatStatusLabel } from "../../lib/presentation";

export function StatusPill({ status }: { status: BattleStatusName }) {
  return <span className={`status-pill status-${status}`}>{formatStatusLabel(status)}</span>;
}
