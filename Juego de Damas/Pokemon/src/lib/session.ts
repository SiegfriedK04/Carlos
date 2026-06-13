const storageKey = "pokemon-battle-rooms";

interface SessionState {
  playerName: string;
  rooms: Record<string, string>;
}

function readState(): SessionState {
  if (typeof window === "undefined") {
    return { playerName: "", rooms: {} };
  }

  const stored = window.localStorage.getItem(storageKey);
  if (!stored) {
    return { playerName: "", rooms: {} };
  }

  try {
    return JSON.parse(stored) as SessionState;
  } catch {
    return { playerName: "", rooms: {} };
  }
}

function writeState(nextState: SessionState) {
  window.localStorage.setItem(storageKey, JSON.stringify(nextState));
}

export function getStoredPlayerName() {
  return readState().playerName;
}

export function savePlayerName(playerName: string) {
  const state = readState();
  writeState({ ...state, playerName });
}

export function getRoomPlayerId(roomCode: string) {
  return readState().rooms[roomCode.toUpperCase()] ?? null;
}

export function saveRoomPlayer(roomCode: string, playerId: string) {
  const state = readState();
  writeState({
    ...state,
    rooms: {
      ...state.rooms,
      [roomCode.toUpperCase()]: playerId,
    },
  });
}
