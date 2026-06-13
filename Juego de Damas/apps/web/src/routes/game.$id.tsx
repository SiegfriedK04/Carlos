import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { applyMove, type BoardState, type MoveCommand, type PieceState } from "@damas/shared-types";
import { CheckersBoard } from "../components/game/checkers-board";
import { api } from "../lib/api";
import { formatGameStatus } from "../lib/game-labels";
import { useSessionAuth } from "../lib/session-auth";

export const Route = createFileRoute("/game/$id")({
  component: GamePage,
});

function GamePage() {
  const { id } = Route.useParams();
  const { getToken, isLoaded, isSignedIn } = useSessionAuth();
  const queryClient = useQueryClient();
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [selectedMove, setSelectedMove] = useState<MoveCommand | null>(null);
  const [turnMessage, setTurnMessage] = useState<string | null>(null);
  const [displayBoardState, setDisplayBoardState] = useState<BoardState | null>(null);
  const [isAnimatingAiTurn, setIsAnimatingAiTurn] = useState(false);

  const gameQuery = useQuery({
    queryKey: ["game", id, isLoaded, isSignedIn],
    enabled: Boolean(isLoaded && isSignedIn),
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        throw new Error("Debes iniciar sesion para abrir la partida.");
      }
      return api.getGame(id, token);
    },
  });

  const profileQuery = useQuery({
    queryKey: ["me", "game", isLoaded, isSignedIn],
    enabled: Boolean(isLoaded && isSignedIn),
    queryFn: async () => {
      const token = await getToken();
      if (!token) {
        throw new Error("Debes iniciar sesion para cargar tu skin.");
      }
      return api.me(token);
    },
  });

  useEffect(() => {
    if (gameQuery.data?.boardState && !isAnimatingAiTurn) {
      setDisplayBoardState(gameQuery.data.boardState);
    }
  }, [gameQuery.data?.boardState, isAnimatingAiTurn]);

  const boardState = displayBoardState ?? gameQuery.data?.boardState;
  const availableMoves = useMemo(
    () => boardState?.legalMoves.filter((move) => !selectedPieceId || move.pieceId === selectedPieceId) ?? [],
    [boardState?.legalMoves, selectedPieceId],
  );

  useEffect(() => {
    if (!availableMoves.some((move) => selectedMove && move.pieceId === selectedMove.pieceId && move.to.row === selectedMove.to.row && move.to.col === selectedMove.to.col)) {
      setSelectedMove(null);
    }
  }, [availableMoves, selectedMove]);

  const playMutation = useMutation({
    mutationFn: async (move: MoveCommand) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Debes iniciar sesion para jugar.");
      }
      return api.playTurn(id, move, token);
    },
    onSuccess: async (result) => {
      const currentBoard = gameQuery.data?.boardState;
      if (currentBoard) {
        const playerPreview = applyMove(currentBoard, result.playerMove).boardState;
        setDisplayBoardState(playerPreview);
        setTurnMessage("Tu movimiento fue aplicado. Observa el tablero antes de la respuesta de la IA.");
        setIsAnimatingAiTurn(true);
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }

      setDisplayBoardState(result.game.boardState);
      setTurnMessage(result.message);
      setSelectedPieceId(null);
      setSelectedMove(null);
      setIsAnimatingAiTurn(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["game", id] }),
        queryClient.invalidateQueries({ queryKey: ["games"] }),
        queryClient.invalidateQueries({ queryKey: ["ranking"] }),
      ]);
    },
  });

  if (!isSignedIn) {
    return (
      <section className="panel">
        <div className="section-head">
          <h2>Partida</h2>
          <Link to="/" className="cta-link secondary">Regresar al lobby</Link>
        </div>
        <p>Inicia sesion desde el lobby para abrir tu partida guardada.</p>
      </section>
    );
  }

  const game = gameQuery.data;
  if (!game || !boardState) {
    return (
      <section className="panel">
        <div className="section-head">
          <h2>Partida activa</h2>
          <Link to="/" className="cta-link secondary">Regresar al lobby</Link>
        </div>
        {gameQuery.isLoading ? <p>Cargando partida...</p> : null}
        {gameQuery.error ? <p className="error-text">{gameQuery.error.message}</p> : <p>No se encontro la partida solicitada.</p>}
      </section>
    );
  }

  return (
    <div className="dashboard-grid game-layout">
      <section className="panel board-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Tablero</p>
            <h2>Partida activa</h2>
          </div>
          <div className="cta-row">
            <Link to="/" className="cta-link secondary">Regresar al lobby</Link>
            <Link to="/games" className="cta-link secondary">Ver historial</Link>
          </div>
        </div>

        {gameQuery.isLoading ? <p>Cargando partida...</p> : null}
        {gameQuery.error ? <p className="error-text">{gameQuery.error.message}</p> : null}

        <CheckersBoard
          boardState={boardState}
          selectedPieceId={selectedPieceId}
          selectedMove={selectedMove}
          equippedSkinId={profileQuery.data?.equippedSkinId ?? null}
          disabled={playMutation.isPending || isAnimatingAiTurn || game.status !== "active" || boardState.turn !== game.humanColor}
          onPieceSelect={(piece: PieceState) => {
            const pieceMoves = boardState.legalMoves.filter((move) => move.pieceId === piece.pieceId);
            setSelectedPieceId(pieceMoves.length > 0 ? piece.pieceId : null);
            setSelectedMove(pieceMoves[0] ?? null);
          }}
          onMovePreview={(move) => setSelectedMove(move)}
          onMoveCommit={(move) => {
            setSelectedMove(move);
            playMutation.mutate(move);
          }}
        />

        <div className="stack-list">
          <p>Turno actual: <strong>{isAnimatingAiTurn ? "IA" : boardState.turn === game.humanColor ? "Jugador" : "IA"}</strong></p>
          <p>Estado: <strong>{formatGameStatus(game.status)}</strong></p>
          <p>Movimientos del jugador: <strong>{game.playerMoveCount}</strong> | IA: <strong>{game.aiMoveCount}</strong></p>
          {boardState.forcedCapture ? <p>Hay captura obligatoria disponible.</p> : null}
          {isAnimatingAiTurn ? <p>La respuesta de la IA se mostrara despues de una breve pausa visual.</p> : null}
          {game.lastAiSummary ? <p>Analisis IA: {game.lastAiSummary}</p> : null}
          {turnMessage ? <p>{turnMessage}</p> : null}
        </div>

        <div className="stack-list">
          <h3>Movimientos legales</h3>
          {availableMoves.map((move) => (
            <button key={`${move.pieceId}-${move.path.map((step) => `${step.row}-${step.col}`).join("_")}`} type="button" className={`move-chip ${selectedMove === move ? "active" : ""}`} onClick={() => setSelectedMove(move)}>
              {move.from.row},{move.from.col} {"->"} {move.to.row},{move.to.col}
              {move.captures.length ? ` | capturas: ${move.captures.length}` : ""}
            </button>
          ))}
        </div>

        <div className="cta-row">
          <button
            type="button"
            className="cta-link"
            disabled={!selectedMove || playMutation.isPending || isAnimatingAiTurn || game.status !== "active" || boardState.turn !== game.humanColor}
            onClick={() => selectedMove && playMutation.mutate(selectedMove)}
          >
            {playMutation.isPending ? "Resolviendo..." : "Confirmar movimiento"}
          </button>
        </div>
      </section>
    </div>
  );
}
