import type { RealtimeMessage } from "../types/models";

const roomSockets = new Map<string, Set<WebSocket>>();

export function addSocket(roomCode: string, socket: WebSocket) {
  const existing = roomSockets.get(roomCode) ?? new Set<WebSocket>();
  existing.add(socket);
  roomSockets.set(roomCode, existing);
}

export function removeSocket(roomCode: string, socket: WebSocket) {
  const existing = roomSockets.get(roomCode);
  if (!existing) {
    return;
  }
  existing.delete(socket);
  if (existing.size === 0) {
    roomSockets.delete(roomCode);
  }
}

export function broadcast(roomCode: string, message: RealtimeMessage) {
  const existing = roomSockets.get(roomCode);
  if (!existing) {
    return;
  }

  const payload = JSON.stringify(message);
  for (const socket of existing) {
    socket.send(payload);
  }
}
