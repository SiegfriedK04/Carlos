import type { ReactNode } from "react";
import { useEffect } from "react";
import { useSessionAuth } from "../../lib/session-auth";

export function AppShell({ children }: { children: ReactNode }) {
  const { authSource, isSignedIn, signOut } = useSessionAuth();

  useEffect(() => {
    document.documentElement.dataset.theme = "light";
    window.localStorage.setItem("damas-theme", "light");
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Proyecto UTP</p>
          <h1>Juego de Damas</h1>
        </div>
        <div className="topbar-actions">
          {isSignedIn ? (
            <button type="button" className="cta-link secondary" onClick={() => void signOut()}>
              Cerrar sesion {authSource === "local" ? "local" : ""}
            </button>
          ) : null}
        </div>
      </header>
      <main className="page-frame">{children}</main>
    </div>
  );
}
