import { useAuth } from "@clerk/tanstack-react-start";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { api } from "../lib/api";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { getToken, isSignedIn } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["me", "profile"],
    enabled: isSignedIn,
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        throw new Error("Debes iniciar sesion para ver tu perfil.");
      }
      return api.me(token);
    },
  });

  if (!isSignedIn) {
    return (
      <section className="panel compact-panel">
        <p className="eyebrow">Perfil</p>
        <h2>Debes iniciar sesion</h2>
        <p>Accede con tu cuenta para consultar tu perfil de jugador.</p>
        <Link to="/" className="cta-link secondary">Regresar al inicio</Link>
      </section>
    );
  }

  return (
    <section className="panel compact-panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Perfil</p>
          <h2>Jugador activo</h2>
        </div>
        <Link to="/" className="cta-link secondary">Regresar al lobby</Link>
      </div>

      {profileQuery.isLoading ? <p>Cargando perfil...</p> : null}
      {profileQuery.error ? <p className="error-text">{profileQuery.error.message}</p> : null}

      {profileQuery.data ? (
        <div className="detail-list profile-brief">
          <p><strong>Nombre:</strong> {profileQuery.data.displayName}</p>
          <p><strong>Correo:</strong> {profileQuery.data.email}</p>
          <p><strong>Skin equipada:</strong> {profileQuery.data.equippedSkinId ?? "ninguna"}</p>
          <p><strong>Skins desbloqueadas:</strong> {profileQuery.data.unlockedSkinIds.length}</p>
        </div>
      ) : null}

      <div className="cta-row">
        <Link to="/marketplace" className="cta-link">Ir al marketplace</Link>
        <Link to="/games" className="cta-link secondary">Ver historial</Link>
      </div>
    </section>
  );
}
