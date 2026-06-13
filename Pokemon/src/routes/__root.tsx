import type { ReactNode } from "react";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { AppShell } from "../components/layout/app-shell";
import "../styles/global.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        title: "Pokemon Battle Rooms UTP",
      },
      {
        name: "description",
        content: "Batallas Pokemon 1v1 con TanStack Start, Hono, Bun y MongoDB.",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: () => (
    <div className="loading-banner">
      <strong>Página no encontrada.</strong>
      <p>La ruta que intentaste abrir no existe en esta aplicación.</p>
    </div>
  ),
});

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <AppShell>
          <Outlet />
        </AppShell>
      </QueryClientProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <HeadContent />
      </head>
      <body>{children}<Scripts /></body>
    </html>
  );
}
