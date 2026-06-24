import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HomePage } from "../components/home-page";
import { api } from "../lib/api";
import { getStoredPlayerName, savePlayerName, saveRoomPlayer } from "../lib/session";

export const Route = createFileRoute("/")({
  component: HomeRouteComponent,
});

function HomeRouteComponent() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const defaultName = getStoredPlayerName();

  const createMutation = useMutation({
    mutationFn: (playerName: string) => api.createRoom(playerName),
    onSuccess: (snapshot) => {
      savePlayerName(snapshot.room.players[0].playerName);
      saveRoomPlayer(snapshot.room.code, snapshot.room.players[0].playerId);
      void navigate({ to: "/room/$code", params: { code: snapshot.room.code } });
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  const joinMutation = useMutation({
    mutationFn: ({ playerName, roomCode }: { playerName: string; roomCode: string }) => api.joinRoom(roomCode, playerName),
    onSuccess: (snapshot) => {
      const joined = snapshot.room.players[snapshot.room.players.length - 1];
      savePlayerName(joined.playerName);
      saveRoomPlayer(snapshot.room.code, joined.playerId);
      void navigate({ to: "/room/$code", params: { code: snapshot.room.code } });
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  return (
    <>
      <HomePage
        defaultName={defaultName}
        loading={createMutation.isPending || joinMutation.isPending}
        onCreateRoom={async (playerName) => {
          setError(null);
          await createMutation.mutateAsync(playerName);
        }}
        onJoinRoom={async (playerName, roomCode) => {
          setError(null);
          await joinMutation.mutateAsync({ playerName, roomCode });
        }}
      />
      {error ? <p className="error-banner">{error}</p> : null}
    </>
  );
}
