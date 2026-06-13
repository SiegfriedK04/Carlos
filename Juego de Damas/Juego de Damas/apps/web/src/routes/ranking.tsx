import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { api } from "../lib/api";

export const Route = createFileRoute("/ranking")({
  component: RankingPage,
});

function RankingPage() {
  const rankingQuery = useQuery({
    queryKey: ["ranking"],
    queryFn: () => api.getRanking(),
  });

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Clasificacion</p>
          <h2>Ranking global</h2>
        </div>
        <Link to="/" className="cta-link secondary">Regresar al lobby</Link>
      </div>
      <p>Menor cantidad de movimientos para ganar, con desempate por fecha del logro.</p>

      {rankingQuery.isLoading ? <p>Cargando ranking...</p> : null}
      {rankingQuery.error ? <p className="error-text">{rankingQuery.error.message}</p> : null}

      <div className="ranking-table">
        <div className="ranking-row heading">
          <span>#</span>
          <span>Jugador</span>
          <span>Mejor victoria</span>
          <span>Victorias</span>
        </div>
        {rankingQuery.data?.length ? rankingQuery.data.map((entry, index) => (
          <div key={entry.userId} className="ranking-row">
            <span>{index + 1}</span>
            <span>{entry.displayName}</span>
            <span>{entry.bestWinMoveCount}</span>
            <span>{entry.wins}</span>
          </div>
        )) : <p>Todavia no hay victorias registradas.</p>}
      </div>
    </section>
  );
}
