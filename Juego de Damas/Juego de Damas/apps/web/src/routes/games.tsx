import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@clerk/tanstack-react-start";
import { api } from "../lib/api";
import { formatGameStatus, formatWinnerLabel } from "../lib/game-labels";

export const Route = createFileRoute("/games")({
  component: GamesPage,
});

function GamesPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const gamesQuery = useQuery({
    queryKey: ["games", isLoaded, isSignedIn],
    enabled: Boolean(isLoaded && isSignedIn),
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        throw new Error("Debes iniciar sesion para consultar tus partidas.");
      }
      return api.listGames(token);
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) {
        throw new Error("Debes iniciar sesion para crear una partida.");
      }
      return api.createGame(token);
    },
    onSuccess: async (game) => {
      await queryClient.invalidateQueries({ queryKey: ["games"] });
      void navigate({ to: "/game/$id", params: { id: game.gameId } });
    },
  });

  if (!isSignedIn) {
    return (
      <section className="panel">
        <div className="section-head">
          <h2>Mis partidas</h2>
          <Link to="/" className="cta-link secondary">Regresar al lobby</Link>
        </div>
        <p>Inicia sesion desde el lobby para crear o continuar partidas guardadas.</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Persistencia</p>
          <h2>Mis partidas</h2>
        </div>
        <div className="cta-row">
          <Link to="/" className="cta-link secondary">Regresar al lobby</Link>
          <button type="button" className="cta-link" onClick={() => createMutation.mutate()}>
            {createMutation.isPending ? "Creando..." : "Nueva partida"}
          </button>
        </div>
      </div>

      {gamesQuery.isLoading ? <p>Cargando partidas...</p> : null}
      {gamesQuery.error ? <p className="error-text">{gamesQuery.error.message}</p> : null}

      <div className="stack-list">
        {gamesQuery.data?.length ? gamesQuery.data.map((game) => (
          <article key={game.gameId} className="summary-card">
            <div>
              <strong>Partida {game.gameId.slice(0, 8)}</strong>
              <p>Estado: {formatGameStatus(game.status)} | Ganador: {formatWinnerLabel(game.winner)}</p>
              <p>Jugador: {game.playerMoveCount} movimientos | IA: {game.aiMoveCount}</p>
              <p>Actualizada: {new Date(game.updatedAt).toLocaleString("es-PA")}</p>
            </div>
            <Link to="/game/$id" params={{ id: game.gameId }} className="cta-link secondary">
              Continuar
            </Link>
          </article>
        )) : <p>Todavia no tienes partidas guardadas. Crea la primera para comenzar.</p>}
      </div>
    </section>
  );
}
