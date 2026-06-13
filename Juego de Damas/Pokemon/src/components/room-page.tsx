import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Clock3, Copy, DoorOpen, Search, Shield, Swords, Users, X, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type {
  BattleAction,
  MoveDoc,
  PokemonCatalogItem,
  RealtimeMessage,
  RoomSnapshot,
} from "../types/models";
import { api } from "../lib/api";
import {
  formatDamageClassLabel,
  formatGenerationLabel,
  formatMoveEffectText,
  formatPokemonName,
  formatRegionLabel,
  formatTypeLabel,
} from "../lib/presentation";
import { BattleLog } from "./battle/battle-log";
import { MoveGrid } from "./battle/move-grid";
import { PokemonCard } from "./battle/pokemon-card";
import { TeamIndicator } from "./battle/team-indicator";
import { TeamStrip } from "./battle/team-strip";

interface RoomPageProps {
  snapshot: RoomSnapshot;
  playerId: string | null;
  onSnapshot: (snapshot: RoomSnapshot) => void;
}

export function RoomPage({ snapshot, playerId, onSnapshot }: RoomPageProps) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [generationFilter, setGenerationFilter] = useState("");
  const [selectedMove, setSelectedMove] = useState<MoveDoc | null>(null);
  const [pendingSwitchId, setPendingSwitchId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const socket = api.roomSocket(snapshot.room.code);
    socket.addEventListener("open", () => {
      socket.send("sync");
    });
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data) as RealtimeMessage;
      onSnapshot(message.payload);
      if (message.type === "turn.resolved" || message.type === "battle.ended") {
        setSelectedMove(null);
        setPendingSwitchId(null);
      }
    });
    return () => socket.close();
  }, [snapshot.room.code, onSnapshot]);

  const self = snapshot.room.players.find((player) => player.playerId === playerId) ?? null;
  const battle = snapshot.battle;
  const myBattleState = battle?.players.find((player) => player.playerId === playerId) ?? null;
  const opponentBattleState = battle?.players.find((player) => player.playerId !== playerId) ?? null;
  const selfSelection =
    snapshot.room.teamSelections?.find((selection) => selection.playerId === playerId)?.pokemonIds ?? [];
  const isReady = Boolean(self && snapshot.room.readyPlayerIds.includes(self.playerId));
  const hasSubmitted = Boolean(myBattleState?.playerId && battle?.pendingActions.some((item) => item.playerId === myBattleState.playerId));
  const playersWithSubmittedAction = new Set(battle?.pendingActions.map((item) => item.playerId) ?? []);

  const catalogQuery = useQuery({
    queryKey: ["pokemon-catalog", deferredSearch, typeFilter, regionFilter, generationFilter],
    queryFn: () =>
      api.getPokemonCatalog({
        search: deferredSearch,
        type: typeFilter,
        region: regionFilter,
        generation: generationFilter,
        limit: 240,
      }),
    enabled: !battle,
  });

  const activePokemon = myBattleState?.team.find((pokemon) => pokemon.slotId === myBattleState.activeSlotId) ?? null;
  const pendingAction: BattleAction | null = selectedMove
    ? { type: "move", moveId: selectedMove.moveId }
    : pendingSwitchId
      ? { type: "switch", targetSlotId: pendingSwitchId }
      : null;

  const battleResult = useMemo(() => {
    if (!battle || battle.status !== "finished" || !playerId) {
      return null;
    }
    return battle.winnerPlayerId === playerId ? "victoria" : "derrota";
  }, [battle, playerId]);

  async function markReady() {
    if (!playerId) {
      return;
    }
    setBusy(true);
    try {
      const nextSnapshot = await api.markReady(snapshot.room.code, playerId);
      onSnapshot(nextSnapshot);
    } finally {
      setBusy(false);
    }
  }

  async function saveTeam(nextIds: number[]) {
    if (!playerId) {
      return;
    }
    setBusy(true);
    try {
      const nextSnapshot = await api.saveTeam(snapshot.room.code, playerId, nextIds);
      onSnapshot(nextSnapshot);
    } finally {
      setBusy(false);
    }
  }

  async function submitBattleAction() {
    if (!playerId || !battle || !pendingAction) {
      return;
    }
    setBusy(true);
    try {
      const nextSnapshot = await api.submitAction(snapshot.room.code, playerId, battle.turn, pendingAction);
      onSnapshot(nextSnapshot);
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    await navigator.clipboard.writeText(snapshot.room.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function toggleCatalogPokemon(pokemon: PokemonCatalogItem) {
    const isSelected = selfSelection.includes(pokemon.pokedexId);
    if (isSelected) {
      void saveTeam(selfSelection.filter((id) => id !== pokemon.pokedexId));
      return;
    }

    if (selfSelection.length >= 6) {
      return;
    }

    void saveTeam([...selfSelection, pokemon.pokedexId]);
  }

  const selectionCount = selfSelection.length;

  return (
    <section className="room-layout">
      <div className="room-main glass-panel">
        <div className="room-header">
          <div className="room-header__left">
            <Link to="/" className="icon-link">
              <ArrowLeft size={16} />
              Volver
            </Link>
            <div>
              <p className="eyebrow">Código de sala</p>
              <h2>{snapshot.room.code}</h2>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={() => void copyCode()}>
            <Copy size={16} />
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>

        {!battle ? (
          <div className="lobby-stack">
            <div className="lobby-grid">
              <div className="lobby-copy">
                <p className="eyebrow">Lobby</p>
                <h3>Arma tu equipo antes de confirmar la sala.</h3>
                <p>
                  Elige exactamente 6 Pokémon, comparte el código y marca listo. Si cambias tu selección después de estar listo,
                  el sistema retirará tu ready para evitar batallas con equipos desincronizados.
                </p>
                <div className="selection-summary">
                  <span><Shield size={14} /> Equipo: {selectionCount}/6</span>
                  <span><Users size={14} /> Jugadores: {snapshot.room.players.length}/2</span>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  disabled={busy || !playerId || snapshot.room.players.length < 2 || isReady || selectionCount !== 6}
                  onClick={() => void markReady()}
                >
                  {isReady ? "Listo" : selectionCount === 6 ? "Marcar listo" : "Selecciona 6 Pokémon"}
                </button>
              </div>

              <div className="lobby-players">
                {snapshot.room.players.map((player) => {
                  const playerCount =
                    snapshot.room.teamSelections?.find((selection) => selection.playerId === player.playerId)?.pokemonIds.length ?? 0;

                  return (
                    <article key={player.playerId} className="player-row">
                      <div>
                        <p>{player.playerName}</p>
                        <span>{player.playerId === playerId ? "Tú" : "Invitado"}</span>
                      </div>
                      <div className="player-row__status">
                        <strong>{snapshot.room.readyPlayerIds.includes(player.playerId) ? "Listo" : "Esperando"}</strong>
                        <span>{playerCount}/6 elegidos</span>
                      </div>
                    </article>
                  );
                })}
                {snapshot.room.players.length < 2 ? (
                  <article className="player-row empty">
                    <div>
                      <p>Espacio disponible</p>
                      <span>Comparte el código con tu rival</span>
                    </div>
                    <DoorOpen size={18} />
                  </article>
                ) : null}
              </div>
            </div>

            <div className="team-builder glass-subpanel">
              <div className="section-heading">
                <p>Constructor de equipo</p>
                <span>{catalogQuery.data?.meta.total ?? 0} Pokémon disponibles</span>
              </div>

              <div className="builder-toolbar">
                <label className="field search-field">
                  <span>Buscar</span>
                  <div className="search-shell">
                    <Search size={16} />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre del Pokémon" />
                  </div>
                </label>

                <label className="field">
                  <span>Tipo</span>
                  <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                    <option value="">Todos</option>
                    {catalogQuery.data?.meta.types.map((type) => (
                      <option key={type} value={type}>
                        {formatTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Región</span>
                  <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)}>
                    <option value="">Todas</option>
                    {catalogQuery.data?.meta.regions.map((region) => (
                      <option key={region} value={region}>
                        {formatRegionLabel(region)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Generación</span>
                  <select value={generationFilter} onChange={(event) => setGenerationFilter(event.target.value)}>
                    <option value="">Todas</option>
                    {catalogQuery.data?.meta.generations.map((generation) => (
                      <option key={generation} value={generation}>
                        {formatGenerationLabel(generation)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="selected-team-preview">
                <div className="section-heading">
                  <p>Tu selección</p>
                  <span>{selectionCount}/6</span>
                </div>
                <div className="selected-team-grid">
                  {catalogQuery.data?.items
                    .filter((item) => selfSelection.includes(item.pokedexId))
                    .map((pokemon) => (
                      <button
                        key={pokemon.pokedexId}
                        type="button"
                        className="catalog-card selected"
                        onClick={() => toggleCatalogPokemon(pokemon)}
                      >
                        <img src={pokemon.sprites.front} alt={pokemon.name} />
                        <div>
                          <strong>{formatPokemonName(pokemon.name)}</strong>
                          <span>#{pokemon.pokedexId}</span>
                        </div>
                        <X size={16} />
                      </button>
                    ))}
                </div>
              </div>

              <div className="catalog-grid">
                {catalogQuery.data?.items.map((pokemon) => {
                  const isSelected = selfSelection.includes(pokemon.pokedexId);
                  const isDisabled = busy || (!isSelected && selectionCount >= 6);

                  return (
                    <button
                      key={pokemon.pokedexId}
                      type="button"
                      className={`catalog-card ${isSelected ? "selected" : ""}`}
                      disabled={isDisabled}
                      onClick={() => toggleCatalogPokemon(pokemon)}
                    >
                      <div className="catalog-card__header">
                        <span>#{pokemon.pokedexId}</span>
                        <span>{formatRegionLabel(pokemon.region)}</span>
                      </div>
                      <img src={pokemon.sprites.front} alt={pokemon.name} />
                      <div className="catalog-card__body">
                        <strong>{formatPokemonName(pokemon.name)}</strong>
                        <div className="pokemon-card__types">
                          {pokemon.types.map((type) => (
                            <span key={type} className={`type-chip type-${type}`}>
                              {formatTypeLabel(type)}
                            </span>
                          ))}
                        </div>
                        <span className="catalog-card__meta-line">{formatGenerationLabel(pokemon.generation)}</span>
                        <div className="catalog-card__stats">
                          <span><Shield size={14} /> Atq {pokemon.baseStats.attack}</span>
                          <span><Shield size={14} /> Def {pokemon.baseStats.defense}</span>
                          <span><Zap size={14} /> Atq. Esp. {pokemon.baseStats.specialAttack}</span>
                          <span><Zap size={14} /> Def. Esp. {pokemon.baseStats.specialDefense}</span>
                          <span><Zap size={14} /> Vel {pokemon.baseStats.speed}</span>
                        </div>
                      </div>
                      <span className="catalog-card__action">{isSelected ? <X size={16} /> : <Check size={16} />}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : myBattleState && opponentBattleState && activePokemon ? (
          <div className="battle-layout">
            <div className="arena-panel">
              <div className="battle-strip">
                <span><Users size={14} /> {snapshot.room.players[0].playerName} vs {snapshot.room.players[1].playerName}</span>
                <span><Clock3 size={14} /> Turno {battle.turn}</span>
                <span><Swords size={14} /> {hasSubmitted ? "Acción enviada, esperando al rival" : "Selecciona y confirma tu acción"}</span>
              </div>

              <div className="turn-status-row">
                {battle.players.map((player) => (
                  <div key={player.playerId} className={`turn-status-chip ${playersWithSubmittedAction.has(player.playerId) ? "ready" : ""}`}>
                    <strong>{player.playerName}</strong>
                    <span>
                      {playersWithSubmittedAction.has(player.playerId)
                        ? player.playerId === playerId
                          ? "Ya elegiste tu acción"
                          : "El rival ya eligió su acción"
                        : player.playerId === playerId
                          ? "Aún no eliges tu acción"
                          : "El rival aún no elige"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="battlefield compact">
                <div className="battlefield__backdrop" />
                <div className="battlefield__team battlefield__team--enemy">
                  <span>Equipo rival</span>
                  <TeamIndicator team={opponentBattleState.team} align="right" />
                </div>
                <PokemonCard pokemon={opponentBattleState.team.find((p) => p.slotId === opponentBattleState.activeSlotId)!} isActive mirrored />
                <div className="battlefield__team battlefield__team--self">
                  <span>Tu equipo</span>
                  <TeamIndicator team={myBattleState.team} />
                </div>
                <PokemonCard pokemon={activePokemon} isActive />
              </div>

              <div className="battle-controls">
                <div className="controls-grid">
                  <div className="controls-section glass-subpanel">
                    <div className="section-heading">
                      <p>Movimientos</p>
                      <span>Lee los detalles antes de confirmar</span>
                    </div>
                    <MoveGrid
                      activePokemon={activePokemon}
                      disabled={busy || hasSubmitted || battle.status === "finished"}
                      pendingMoveId={selectedMove?.moveId ?? null}
                      onMoveSelect={(move: MoveDoc) => {
                        setSelectedMove(move);
                        setPendingSwitchId(null);
                      }}
                    />
                  </div>

                  <div className="controls-section glass-subpanel">
                    <div className="section-heading">
                      <p>Cambio de Pokémon</p>
                      <span>Cambiar elimina estado y modificadores temporales</span>
                    </div>
                    <TeamStrip
                      team={myBattleState.team}
                      activeSlotId={myBattleState.activeSlotId}
                      selectable
                      pendingSlotId={pendingSwitchId}
                      onSelect={(slotId) => {
                        setPendingSwitchId(slotId);
                        setSelectedMove(null);
                      }}
                    />
                  </div>
                </div>

                <div className="action-footer glass-subpanel">
                  <div className="action-summary">
                    <p className="eyebrow">Acción seleccionada</p>
                    {hasSubmitted ? <span className="action-summary__notice">Tu decisión ya fue enviada. Esperando la respuesta del rival.</span> : null}
                    {selectedMove ? (
                      <>
                        <strong>{formatPokemonName(selectedMove.name)}</strong>
                        <span>
                          {formatTypeLabel(selectedMove.type)} · {formatDamageClassLabel(selectedMove.damageClass)} · Poder {selectedMove.power ?? 0} · Precisión {selectedMove.accuracy ?? 100}
                          {" "}· Prioridad {selectedMove.priority}
                        </span>
                        <p>{formatMoveEffectText(selectedMove.effectText)}</p>
                      </>
                    ) : pendingSwitchId ? (
                      <>
                        <strong>
                          Cambiar a {formatPokemonName(myBattleState.team.find((pokemon) => pokemon.slotId === pendingSwitchId)?.name ?? "")}
                        </strong>
                        <span>El cambio ocurre antes de la mayoría de movimientos.</span>
                      </>
                    ) : (
                      <>
                        <strong>Ninguna acción elegida</strong>
                        <span>Selecciona un movimiento o un Pokémon de reemplazo.</span>
                      </>
                    )}
                  </div>

                  <div className="action-footer__buttons">
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={busy || hasSubmitted || !pendingAction}
                      onClick={() => {
                        setSelectedMove(null);
                        setPendingSwitchId(null);
                      }}
                    >
                      Limpiar
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={busy || hasSubmitted || !pendingAction || battle.status === "finished"}
                      onClick={() => void submitBattleAction()}
                    >
                      Confirmar acción
                    </button>
                  </div>
                </div>

                {battleResult ? (
                  <div className={`result-banner ${battleResult}`}>
                    <strong>{battleResult === "victoria" ? "Victoria" : "Derrota"}</strong>
                    <span>
                      {battleResult === "victoria"
                        ? "Tu estrategia dominó la sala."
                        : "La sala favoreció al rival esta vez."}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            <BattleLog entries={battle.battleLog} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
