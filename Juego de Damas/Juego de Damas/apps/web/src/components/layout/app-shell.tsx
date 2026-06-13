import type { ReactNode } from "react";
import { useEffect } from "react";
import { useAuth, useClerk } from "@clerk/tanstack-react-start";

export function AppShell({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const clerk = useClerk();

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
            <button type="button" className="cta-link secondary" onClick={() => void clerk.signOut()}>
              Cerrar sesion
            </button>
          ) : null}
        </div>
      </header>
      <main className="page-frame">{children}</main>
    </div>
  );
}
