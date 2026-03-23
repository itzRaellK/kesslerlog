/**
 * Resolve IDs de status_types / game_status_types de forma tolerante a
 * maiúsculas, espaços e variações de acentuação (ex.: "Concluido" vs "Concluído").
 */

export function normalizeStatusName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function findCycleFinishedStatusId(
  statusTypes: Array<{ id: string; name: string }>,
): string | undefined {
  return statusTypes.find(
    (s) => normalizeStatusName(s.name) === "finalizado",
  )?.id;
}

/** Status de jogo "terminei" (seed: "Concluído"). */
export function findGameCompletedStatusId(
  gameStatusTypes: Array<{ id: string; name: string }>,
): string | undefined {
  return gameStatusTypes.find(
    (s) => normalizeStatusName(s.name) === "concluido",
  )?.id;
}

/** Nome vindo de cycles_with_details.status_name. */
export function isFinishedCycleLabel(
  statusName: string | null | undefined,
): boolean {
  if (!statusName) return false;
  return normalizeStatusName(statusName) === "finalizado";
}

/**
 * Quando o nome do status de ciclo não existe igual em game_status_types,
 * usa este mapa (chaves = normalizeStatusName do ciclo).
 * Ex.: ciclo "Finalizado" → jogo "Concluído" no seed padrão.
 */
const CYCLE_STATUS_TO_GAME_STATUS: Record<string, string> = {
  finalizado: "concluido",
  abandonado: "abandonado",
  jogando: "jogando",
  pausado: "jogando",
  "na fila": "nao iniciado",
};

/**
 * Resolve `game_status_type_id` a partir do rótulo do status de ciclo escolhido.
 * 1) Mesmo nome normalizado em game_status_types; 2) mapa acima; 3) undefined.
 */
export function findGameStatusIdForCycleStatusLabel(
  cycleStatusLabel: string,
  gameStatusTypes: Array<{ id: string; name: string }>,
): string | undefined {
  const normCycle = normalizeStatusName(cycleStatusLabel);
  const direct = gameStatusTypes.find(
    (g) => normalizeStatusName(g.name) === normCycle,
  );
  if (direct) return direct.id;
  const mappedKey = CYCLE_STATUS_TO_GAME_STATUS[normCycle];
  if (mappedKey) {
    return gameStatusTypes.find(
      (g) => normalizeStatusName(g.name) === mappedKey,
    )?.id;
  }
  return undefined;
}
