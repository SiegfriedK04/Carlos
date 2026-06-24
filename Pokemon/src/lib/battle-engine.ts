import type {
  BaseStats,
  BattleActionEnvelope,
  BattleDoc,
  BattleLogEntry,
  BattlePlayerState,
  MoveDoc,
  PokemonBattleState,
  PokemonDoc,
  TypeDoc,
} from "../types/models";
import { LEVEL, MOVE_COUNT, STATUS_DURATION, SWITCH_PRIORITY, TEAM_SIZE } from "./constants";
import { formatStatusLabel } from "./presentation";
import { clamp, makeId, nowIso, randomInt, sampleUnique, slugifyName } from "./utils";

function buildBattleStat(baseStat: number, iv: number) {
  return Math.floor(((2 * baseStat + iv) * LEVEL) / 100) + 5;
}

function buildBattleHp(baseHp: number, iv: number) {
  return Math.floor(((2 * baseHp + iv) * LEVEL) / 100) + LEVEL + 10;
}

function getStageMultiplier(stage: number) {
  if (stage >= 0) {
    return (2 + stage) / 2;
  }

  return 2 / (2 - stage);
}

function getEffectiveStat(pokemon: PokemonBattleState, stat: keyof BaseStats) {
  const baseValue = pokemon.stats[stat];

  if (stat === "attack") {
    return Math.floor(baseValue * getStageMultiplier(pokemon.stages.attack));
  }

  if (stat === "defense") {
    return Math.floor(baseValue * getStageMultiplier(pokemon.stages.defense));
  }

  if (stat === "speed") {
    let speed = Math.floor(baseValue * getStageMultiplier(pokemon.stages.speed));
    if (pokemon.status?.name === "paralysis") {
      speed = Math.floor(speed / 2);
    }
    return speed;
  }

  return baseValue;
}

function typeMultiplier(moveType: string, defenderTypes: string[], types: TypeDoc[]) {
  return defenderTypes.reduce((acc, defenderType) => {
    const matchup = types.find((item) => item.name === moveType);
    if (!matchup) {
      return acc;
    }

    if (matchup.zeroTo.includes(defenderType)) {
      return acc * 0;
    }

    if (matchup.doubleTo.includes(defenderType)) {
      return acc * 2;
    }

    if (matchup.halfTo.includes(defenderType)) {
      return acc * 0.5;
    }

    return acc;
  }, 1);
}

function chooseAttackStat(attacker: PokemonBattleState, move: MoveDoc) {
  if (move.damageClass === "special") {
    return attacker.stats.specialAttack;
  }

  return getEffectiveStat(attacker, "attack");
}

function chooseDefenseStat(defender: PokemonBattleState, move: MoveDoc) {
  if (move.damageClass === "special") {
    return defender.stats.specialDefense;
  }

  return getEffectiveStat(defender, "defense");
}

function logEntry(turn: number, message: string, emphasis: BattleLogEntry["emphasis"] = "info"): BattleLogEntry {
  return {
    id: makeId("log"),
    turn,
    message,
    emphasis,
  };
}

function clearTemporaryEffects(pokemon: PokemonBattleState) {
  pokemon.status = null;
  pokemon.stages = {
    attack: 0,
    defense: 0,
    speed: 0,
  };
}

function applyStatusMoveEffect(
  battle: BattleDoc,
  attacker: PokemonBattleState,
  defender: PokemonBattleState,
  move: MoveDoc,
) {
  if (!move.statusMeta) {
    return;
  }

  const chance = move.statusMeta.chance ?? 100;
  if (randomInt(1, 100) > chance) {
    return;
  }

  if (move.statusMeta.inflicts) {
    defender.status = {
      name: move.statusMeta.inflicts,
      remainingTurns: STATUS_DURATION,
    };
    battle.battleLog.push(
      logEntry(battle.turn, `${slugifyName(defender.name)} queda bajo ${formatStatusLabel(move.statusMeta.inflicts)}.`, "warning"),
    );
  }

  if (move.statusMeta.lowersStat && move.statusMeta.stageDelta) {
    const delta = move.statusMeta.stageDelta;
    if (move.statusMeta.lowersStat === "attack") {
      defender.stages.attack = clamp(defender.stages.attack + delta, -6, 6);
    }
    if (move.statusMeta.lowersStat === "defense") {
      defender.stages.defense = clamp(defender.stages.defense + delta, -6, 6);
    }
    if (move.statusMeta.lowersStat === "speed") {
      defender.stages.speed = clamp(defender.stages.speed + delta, -6, 6);
    }
    battle.battleLog.push(
      logEntry(
        battle.turn,
        `${slugifyName(defender.name)} sufre una reducción temporal de ${move.statusMeta.lowersStat === "attack" ? "Ataque" : move.statusMeta.lowersStat === "defense" ? "Defensa" : "Velocidad"}.`,
        "warning",
      ),
    );
  }

  if (move.statusMeta.inflicts === "attack_down") {
    defender.stages.attack = clamp(defender.stages.attack - 1, -6, 6);
  }
  if (move.statusMeta.inflicts === "defense_down") {
    defender.stages.defense = clamp(defender.stages.defense - 1, -6, 6);
  }
  if (move.statusMeta.inflicts === "speed_down") {
    defender.stages.speed = clamp(defender.stages.speed - 1, -6, 6);
  }
  if (
    move.statusMeta.inflicts === "attack_down" ||
    move.statusMeta.inflicts === "defense_down" ||
    move.statusMeta.inflicts === "speed_down"
  ) {
    defender.status = {
      name: move.statusMeta.inflicts,
      remainingTurns: STATUS_DURATION,
    };
  }
}

function calculateDamage(attacker: PokemonBattleState, defender: PokemonBattleState, move: MoveDoc, types: TypeDoc[]) {
  if (move.damageClass === "status" || !move.power) {
    return {
      damage: 0,
      typeFactor: 1,
      critical: false,
      stab: 1,
      hit: true,
    };
  }

  const accuracy = move.accuracy ?? 100;
  if (randomInt(1, 100) > accuracy) {
    return {
      damage: 0,
      typeFactor: 1,
      critical: false,
      stab: 1,
      hit: false,
    };
  }

  const attackStat = chooseAttackStat(attacker, move);
  const defenseStat = chooseDefenseStat(defender, move);
  const baseDamage =
    Math.floor(
      Math.floor(
        (Math.floor((2 * LEVEL) / 5 + 2) * move.power * Math.max(1, attackStat)) / Math.max(1, defenseStat),
      ) / 50,
    ) + 2;
  const typeFactor = typeMultiplier(move.type, defender.types, types);
  if (typeFactor === 0) {
    return {
      damage: 0,
      typeFactor,
      critical: false,
      stab: attacker.types.includes(move.type) ? 1.5 : 1,
      hit: true,
    };
  }

  const randomFactor = randomInt(85, 100) / 100;
  const critical = randomInt(1, 24) === 1;
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const burnModifier = attacker.status?.name === "burn" && move.damageClass === "physical" ? 0.5 : 1;
  const modifier = randomFactor * stab * typeFactor * (critical ? 1.5 : 1) * burnModifier;

  return {
    damage: Math.max(1, Math.floor(baseDamage * modifier)),
    typeFactor,
    critical,
    stab,
    hit: true,
  };
}

function activePokemon(player: BattlePlayerState) {
  return player.team.find((pokemon) => pokemon.slotId === player.activeSlotId)!;
}

function isDefeated(player: BattlePlayerState) {
  return player.team.every((pokemon) => pokemon.fainted);
}

function chooseReplacement(player: BattlePlayerState) {
  return player.team.find((pokemon) => !pokemon.fainted && pokemon.slotId !== player.activeSlotId) ?? null;
}

function endOfTurnEffects(battle: BattleDoc) {
  for (const player of battle.players) {
    const active = activePokemon(player);

    if (active.status?.name === "burn" || active.status?.name === "poison") {
      const dot = Math.max(1, Math.floor(active.stats.hp * 0.05));
      active.currentHp = Math.max(0, active.currentHp - dot);
      battle.battleLog.push(logEntry(battle.turn, `${slugifyName(active.name)} recibe ${dot} de daño residual.`, "warning"));
      if (active.currentHp === 0) {
        active.fainted = true;
        battle.battleLog.push(logEntry(battle.turn, `${slugifyName(active.name)} se debilitó.`, "warning"));
      }
    }

    if (active.status) {
      active.status.remainingTurns -= 1;
      if (active.status.remainingTurns <= 0) {
        const clearedStatus = active.status.name;
        active.status = null;
        battle.battleLog.push(logEntry(battle.turn, `${slugifyName(active.name)} ya no está bajo ${formatStatusLabel(clearedStatus)}.`));
      }
    }

    if (active.fainted) {
      const replacement = chooseReplacement(player);
      if (replacement) {
        player.activeSlotId = replacement.slotId;
        clearTemporaryEffects(replacement);
        battle.battleLog.push(logEntry(battle.turn, `${player.playerName} envía a ${slugifyName(replacement.name)}.`));
      }
    }
  }
}

function resolveSwitch(battle: BattleDoc, player: BattlePlayerState, targetSlotId: string) {
  const target = player.team.find((pokemon) => pokemon.slotId === targetSlotId);
  if (!target || target.fainted || target.slotId === player.activeSlotId) {
    return;
  }

  const previous = activePokemon(player);
  clearTemporaryEffects(previous);
  player.activeSlotId = target.slotId;
  battle.battleLog.push(logEntry(battle.turn, `${player.playerName} cambia a ${slugifyName(target.name)}.`));
}

function resolveMove(
  battle: BattleDoc,
  attackerPlayer: BattlePlayerState,
  defenderPlayer: BattlePlayerState,
  moveId: number,
  types: TypeDoc[],
) {
  const attacker = activePokemon(attackerPlayer);
  const defender = activePokemon(defenderPlayer);
  if (attacker.fainted) {
    return;
  }

  if (attacker.status?.name === "freeze") {
    battle.battleLog.push(logEntry(battle.turn, `${slugifyName(attacker.name)} está congelado y no puede moverse.`, "warning"));
    return;
  }

  if (attacker.status?.name === "sleep") {
    battle.battleLog.push(logEntry(battle.turn, `${slugifyName(attacker.name)} está dormido y no puede moverse.`, "warning"));
    return;
  }

  const move = attacker.moves.find((item) => item.moveId === moveId);
  if (!move) {
    return;
  }

  battle.battleLog.push(logEntry(battle.turn, `${slugifyName(attacker.name)} usa ${slugifyName(move.name)}.`));
  const result = calculateDamage(attacker, defender, move, types);

  if (!result.hit) {
    battle.battleLog.push(logEntry(battle.turn, `El movimiento falló.`, "warning"));
    return;
  }

  if (result.damage > 0) {
    defender.currentHp = Math.max(0, defender.currentHp - result.damage);
    battle.battleLog.push(logEntry(battle.turn, `${slugifyName(defender.name)} recibe ${result.damage} de daño.`));
  }

  if (result.critical) {
    battle.battleLog.push(logEntry(battle.turn, `Golpe crítico.`, "success"));
  }

  if (result.typeFactor > 1) {
    battle.battleLog.push(logEntry(battle.turn, `Es súper efectivo.`, "success"));
  }
  if (result.typeFactor > 0 && result.typeFactor < 1) {
    battle.battleLog.push(logEntry(battle.turn, `No es muy efectivo.`, "warning"));
  }
  if (result.typeFactor === 0) {
    battle.battleLog.push(logEntry(battle.turn, `No tuvo efecto.`, "warning"));
  }

  applyStatusMoveEffect(battle, attacker, defender, move);

  if (defender.currentHp === 0) {
    defender.fainted = true;
    battle.battleLog.push(logEntry(battle.turn, `${slugifyName(defender.name)} se debilitó.`, "warning"));
  }
}

function actionPriority(player: BattlePlayerState, action: BattleActionEnvelope["action"]) {
  if (action.type === "switch") {
    return SWITCH_PRIORITY;
  }

  const active = activePokemon(player);
  const move = active.moves.find((item) => item.moveId === action.moveId);
  return move?.priority ?? 0;
}

function orderActions(battle: BattleDoc) {
  const [playerOne, playerTwo] = battle.players;
  const actionOne = battle.pendingActions.find((item) => item.playerId === playerOne.playerId)!;
  const actionTwo = battle.pendingActions.find((item) => item.playerId === playerTwo.playerId)!;

  const priorityOne = actionPriority(playerOne, actionOne.action);
  const priorityTwo = actionPriority(playerTwo, actionTwo.action);

  if (priorityOne !== priorityTwo) {
    return priorityOne > priorityTwo
      ? ([
          [playerOne, actionOne],
          [playerTwo, actionTwo],
        ] as [BattlePlayerState, BattleActionEnvelope][])
      : ([
          [playerTwo, actionTwo],
          [playerOne, actionOne],
        ] as [BattlePlayerState, BattleActionEnvelope][]);
  }

  const speedOne = getEffectiveStat(activePokemon(playerOne), "speed");
  const speedTwo = getEffectiveStat(activePokemon(playerTwo), "speed");
  if (speedOne !== speedTwo) {
    return speedOne > speedTwo
      ? ([
          [playerOne, actionOne],
          [playerTwo, actionTwo],
        ] as [BattlePlayerState, BattleActionEnvelope][])
      : ([
          [playerTwo, actionTwo],
          [playerOne, actionOne],
        ] as [BattlePlayerState, BattleActionEnvelope][]);
  }

  return randomInt(0, 1) === 0
    ? ([
        [playerOne, actionOne],
        [playerTwo, actionTwo],
      ] as [BattlePlayerState, BattleActionEnvelope][])
    : ([
        [playerTwo, actionTwo],
        [playerOne, actionOne],
      ] as [BattlePlayerState, BattleActionEnvelope][]);
}

function buildBattlePokemon(pokemon: PokemonDoc, movePool: MoveDoc[]): PokemonBattleState {
  const ivs = {
    hp: randomInt(0, 31),
    attack: randomInt(0, 31),
    defense: randomInt(0, 31),
    specialAttack: randomInt(0, 31),
    specialDefense: randomInt(0, 31),
    speed: randomInt(0, 31),
  };

  const stats: BaseStats = {
    hp: buildBattleHp(pokemon.baseStats.hp, ivs.hp),
    attack: buildBattleStat(pokemon.baseStats.attack, ivs.attack),
    defense: buildBattleStat(pokemon.baseStats.defense, ivs.defense),
    specialAttack: buildBattleStat(pokemon.baseStats.specialAttack, ivs.specialAttack),
    specialDefense: buildBattleStat(pokemon.baseStats.specialDefense, ivs.specialDefense),
    speed: buildBattleStat(pokemon.baseStats.speed, ivs.speed),
  };

  return {
    slotId: makeId("slot"),
    pokemonId: pokemon.pokedexId,
    name: pokemon.name,
    level: LEVEL,
    types: pokemon.types,
    sprites: pokemon.sprites,
    moves: sampleUnique(movePool, MOVE_COUNT),
    baseStats: pokemon.baseStats,
    stats,
    currentHp: stats.hp,
    fainted: false,
    status: null,
    stages: {
      attack: 0,
      defense: 0,
      speed: 0,
    },
  };
}

export function createBattleState(
  roomCode: string,
  players: { playerId: string; playerName: string }[],
  pokemonById: Map<number, PokemonDoc>,
  movesById: Map<number, MoveDoc>,
  selectedTeamsByPlayer: Map<string, number[]>,
) {
  const battlePlayers: BattlePlayerState[] = players.map((player, index) => {
    const selectedIds = selectedTeamsByPlayer.get(player.playerId) ?? [];
    if (selectedIds.length !== TEAM_SIZE) {
      throw new Error(`El jugador ${player.playerName} debe tener exactamente ${TEAM_SIZE} Pokémon seleccionados.`);
    }

    const selectedTeam = selectedIds
      .map((pokemonId) => pokemonById.get(pokemonId))
      .filter((pokemon): pokemon is PokemonDoc => Boolean(pokemon));

    if (selectedTeam.length !== TEAM_SIZE) {
      throw new Error(`No se pudieron cargar todos los Pokémon seleccionados por ${player.playerName}.`);
    }

    const team = selectedTeam.map((pokemon) =>
      buildBattlePokemon(
        pokemon,
        pokemon.moveIds.map((moveId) => movesById.get(moveId)).filter((move): move is MoveDoc => Boolean(move)),
      ),
    );

    return {
      ...player,
      team,
      activeSlotId: team[0].slotId,
    };
  });

  return {
    roomCode,
    status: "active",
    turn: 1,
    players: battlePlayers,
    pendingActions: [],
    battleLog: [logEntry(1, "La batalla ha comenzado.", "success")],
    winnerPlayerId: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  } satisfies BattleDoc;
}

export function validateAction(battle: BattleDoc, playerId: string, turn: number, action: BattleActionEnvelope["action"]) {
  if (battle.status !== "active") {
    throw new Error("La batalla ya no acepta acciones.");
  }

  if (battle.turn !== turn) {
    throw new Error("El turno enviado no coincide con el estado actual.");
  }

  if (battle.pendingActions.some((item) => item.playerId === playerId && item.turn === turn)) {
    throw new Error("Ese jugador ya eligió una acción para este turno.");
  }

  const player = battle.players.find((item) => item.playerId === playerId);
  if (!player) {
    throw new Error("El jugador no pertenece a esta batalla.");
  }

  const active = activePokemon(player);
  if (active.fainted) {
    throw new Error("El Pokemon activo está debilitado.");
  }

  if (action.type === "move" && !active.moves.some((move) => move.moveId === action.moveId)) {
    throw new Error("El movimiento no pertenece al Pokemon activo.");
  }

  if (
    action.type === "switch" &&
    !player.team.some((pokemon) => pokemon.slotId === action.targetSlotId && !pokemon.fainted && pokemon.slotId !== player.activeSlotId)
  ) {
    throw new Error("El cambio solicitado no es válido.");
  }
}

export function resolveTurnIfReady(battle: BattleDoc, types: TypeDoc[]) {
  if (battle.pendingActions.length < 2) {
    return battle;
  }

  const ordered = orderActions(battle);

  for (const [player, actionEnvelope] of ordered) {
    const rival = battle.players.find((item) => item.playerId !== player.playerId)!;

    if (actionEnvelope.action.type === "switch") {
      resolveSwitch(battle, player, actionEnvelope.action.targetSlotId);
      continue;
    }

    resolveMove(battle, player, rival, actionEnvelope.action.moveId, types);

    if (isDefeated(rival)) {
      battle.status = "finished";
      battle.winnerPlayerId = player.playerId;
      battle.battleLog.push(logEntry(battle.turn, `${player.playerName} gana la partida.`, "success"));
      break;
    }
  }

  if (battle.status !== "finished") {
    endOfTurnEffects(battle);
    const defeatedPlayer = battle.players.find((player) => isDefeated(player));
    if (defeatedPlayer) {
      const winner = battle.players.find((player) => player.playerId !== defeatedPlayer.playerId)!;
      battle.status = "finished";
      battle.winnerPlayerId = winner.playerId;
      battle.battleLog.push(logEntry(battle.turn, `${winner.playerName} gana la partida.`, "success"));
    }
  }

  battle.pendingActions = [];
  if (battle.status !== "finished") {
    battle.turn += 1;
  }
  battle.updatedAt = nowIso();
  return battle;
}
