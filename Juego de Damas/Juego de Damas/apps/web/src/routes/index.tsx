import { useMemo, useState } from "react";
import { SignIn, SignUp, useAuth } from "@clerk/tanstack-react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ThemeMode } from "@damas/shared-types";
import { api } from "../lib/api";
import { getClerkPanelAppearance } from "../lib/theme";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const [authMode, setAuthMode] = useState<"signIn" | "signUp">("signIn");
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const theme = ((typeof document !== "undefined" ? document.documentElement.dataset.theme : "light") ?? "light") as ThemeMode;
  const appearance = useMemo(() => getClerkPanelAppearance(theme), [theme]);

  const profileQuery = useQuery({
    queryKey: ["me", isLoaded, isSignedIn],
    enabled: Boolean(isLoaded && isSignedIn),
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        throw new Error("No se pudo obtener la sesion de Clerk.");
      }
      return api.me(token);
    },
  });

  const gamesQuery = useQuery({
    queryKey: ["games", "home", isLoaded, isSignedIn],
    enabled: Boolean(isLoaded && isSignedIn),
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        throw new Error("Debes iniciar sesion para listar tus partidas.");
      }
      return api.listGames(token);
    },
  });

  const rankingQuery = useQuery({
    queryKey: ["ranking", "home"],
    queryFn: () => api.getRanking(),
  });

  const createGameMutation = useMutation({
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
      <div className="auth-landing">
        <section className="panel auth-hero-panel">
          <p className="eyebrow">Proyecto UTP</p>
          <h2>Juego de Damas con IA, persistencia y ranking global</h2>
          <p className="lead-copy">
            Inicia sesion para acceder al lobby, retomar partidas guardadas, consultar el ranking y desbloquear skins para tus fichas.
          </p>
          <div className="feature-strip">
            <span>Partidas persistidas</span>
            <span>IA separada por microservicio</span>
            <span>Marketplace con Stripe sandbox</span>
          </div>
        </section>

        <section className="panel auth-card-panel">
          <div className="segmented-row auth-switcher">
            <button type="button" className={authMode === "signIn" ? "cta-link" : "cta-link secondary"} onClick={() => setAuthMode("signIn")}>
              Ingresar
            </button>
            <button type="button" className={authMode === "signUp" ? "cta-link" : "cta-link secondary"} onClick={() => setAuthMode("signUp")}>
              Crear cuenta
            </button>
          </div>
          <div className="auth-form-shell">
            {authMode === "signIn" ? <SignIn appearance={appearance} /> : <SignUp appearance={appearance} />}
          </div>
        </section>
      </div>
    );
  }

  return (
    <section className="panel lobby-shell">
      <div className="section-head">
        <div>
          <p className="eyebrow">Lobby</p>
          <h2>Centro de mando del jugador</h2>
        </div>
        <button type="button" className="cta-link" disabled={createGameMutation.isPending} onClick={() => createGameMutation.mutate()}>
          {createGameMutation.isPending ? "Creando..." : "Nueva partida"}
        </button>
      </div>

      <p className="lead-copy lobby-copy">
        Navega desde aqui a tu perfil, historial, ranking y marketplace. Todo el acceso principal queda reunido en un solo panel.
      </p>

      <div className="lobby-summary-row">
        <div className="summary-card compact-summary">
          <strong>{profileQuery.data?.displayName ?? "Jugador"}</strong>
          <span>{profileQuery.data?.equippedSkinId ?? "Sin skin equipada"}</span>
        </div>
        <div className="summary-card compact-summary">
          <strong>{gamesQuery.data?.length ?? 0}</strong>
          <span>Partidas guardadas</span>
        </div>
        <div className="summary-card compact-summary">
          <strong>{profileQuery.data?.unlockedSkinIds.length ?? 0}</strong>
          <span>Skins desbloqueadas</span>
        </div>
        <div className="summary-card compact-summary">
          <strong>{rankingQuery.data?.length ?? 0}</strong>
          <span>Jugadores en ranking</span>
        </div>
      </div>

      <div className="lobby-nav-grid">
        <Link to="/profile" className="menu-card">
          <p className="eyebrow">Perfil</p>
          <strong>Ver perfil</strong>
          <span>Consulta solo tus datos principales.</span>
        </Link>

        <Link to="/games" className="menu-card">
          <p className="eyebrow">Historial</p>
          <strong>Partidas guardadas</strong>
          <span>Retoma una partida anterior cuando quieras.</span>
        </Link>

        <Link to="/ranking" className="menu-card">
          <p className="eyebrow">Ranking</p>
          <strong>Tabla global</strong>
          <span>Revisa las mejores victorias registradas.</span>
        </Link>

        <Link to="/marketplace" className="menu-card">
          <p className="eyebrow">Marketplace</p>
          <strong>Inventario y tienda</strong>
          <span>Compra y equipa skins de fichas.</span>
        </Link>
      </div>
    </section>
  );
}
