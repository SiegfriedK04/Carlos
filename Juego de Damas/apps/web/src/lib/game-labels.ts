export function formatGameStatus(status: string) {
  switch (status) {
    case "active":
      return "En curso";
    case "won":
      return "Ganada";
    case "lost":
      return "Perdida";
    case "draw":
      return "Empate";
    default:
      return status;
  }
}

export function formatWinnerLabel(winner: string | null | undefined) {
  if (!winner) {
    return "En curso";
  }

  switch (winner) {
    case "human":
      return "Jugador";
    case "ai":
      return "IA";
    case "draw":
      return "Empate";
    default:
      return winner;
  }
}
