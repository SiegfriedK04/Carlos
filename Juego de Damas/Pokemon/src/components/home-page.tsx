import { useState } from "react";
import { CopyPlus, Swords, Users } from "lucide-react";

interface HomePageProps {
  defaultName: string;
  onCreateRoom: (playerName: string) => Promise<void>;
  onJoinRoom: (playerName: string, roomCode: string) => Promise<void>;
  loading: boolean;
}

export function HomePage({ defaultName, onCreateRoom, onJoinRoom, loading }: HomePageProps) {
  const [playerName, setPlayerName] = useState(defaultName);
  const [roomCode, setRoomCode] = useState("");

  return (
    <section className="hero-shell">
      <div className="hero-copy glass-panel">
        <p className="eyebrow">Proyecto académico · inspirado en Showdown</p>
        <h2>Batallas Pokemon 1v1 en salas privadas con estilo bosque translúcido.</h2>
        <p className="hero-copy__lead">
          Crea una sala, comparte el código y pelea con un equipo de seis Pokémon usando datos reales de PokéAPI
          persistidos en MongoDB.
        </p>
        <div className="hero-stats">
          <span><Users size={16} /> 2 jugadores</span>
          <span><Swords size={16} /> daño resuelto en backend</span>
          <span><CopyPlus size={16} /> código privado</span>
        </div>
      </div>

      <div className="hero-actions glass-panel">
        <label className="field">
          <span>Tu nombre temporal</span>
          <input
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Entrenador UTP"
            maxLength={20}
          />
        </label>

        <div className="cta-row">
          <button
            type="button"
            className="primary-button"
            disabled={loading || playerName.trim().length < 2}
            onClick={() => void onCreateRoom(playerName)}
          >
            Crear sala
          </button>
        </div>

        <div className="divider" />

        <label className="field">
          <span>Código de sala</span>
          <input
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
            placeholder="AB12CD"
            maxLength={6}
          />
        </label>
        <button
          type="button"
          className="ghost-button"
          disabled={loading || playerName.trim().length < 2 || roomCode.trim().length !== 6}
          onClick={() => void onJoinRoom(playerName, roomCode)}
        >
          Unirme a la sala
        </button>
      </div>
    </section>
  );
}
