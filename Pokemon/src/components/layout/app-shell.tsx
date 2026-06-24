import type { ReactNode } from "react";
import { Swords, Sparkles } from "lucide-react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <div className="ambient ambient-top" />
      <div className="ambient ambient-bottom" />
      <header className="topbar glass-panel">
        <div className="brand-lockup">
          <div className="brand-badge">
            <Swords size={18} />
          </div>
          <div>
            <p className="eyebrow">UTP · Desarrollo de Software</p>
            <h1>Pokemon Battle Rooms</h1>
          </div>
        </div>
        <div className="topbar-note">
          <Sparkles size={16} />
          <span>Arena translúcida estilo bosque</span>
        </div>
      </header>
      <main className="page-frame">{children}</main>
    </div>
  );
}
