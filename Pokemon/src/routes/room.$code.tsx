import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { RoomPage } from "../components/room-page";
import { api } from "../lib/api";
import { getRoomPlayerId } from "../lib/session";
import type { RoomSnapshot } from "../types/models";

export const Route = createFileRoute("/room/$code")({
  component: RoomRouteComponent,
});

function RoomRouteComponent() {
  const { code } = Route.useParams();
  const [liveSnapshot, setLiveSnapshot] = useState<RoomSnapshot | null>(null);
  const playerId = getRoomPlayerId(code);

  const roomQuery = useQuery({
    queryKey: ["room", code],
    queryFn: () => api.getRoom(code),
    refetchInterval: liveSnapshot?.battle ? false : 4000,
  });

  const snapshot = liveSnapshot ?? roomQuery.data ?? null;

  if (roomQuery.isLoading && !snapshot) {
    return <p className="loading-banner">Cargando sala...</p>;
  }

  if (roomQuery.error || !snapshot) {
    return <p className="error-banner">{roomQuery.error?.message ?? "No se pudo cargar la sala."}</p>;
  }

  return <RoomPage snapshot={snapshot} playerId={playerId} onSnapshot={setLiveSnapshot} />;
}
