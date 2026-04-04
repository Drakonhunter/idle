import type { GameState, PlotState } from "./types";
import { SAVE_KEY } from "./types";
import { advanceStateToNow, createInitialState } from "./state";

type LegacyV1Plot =
  | { kind: "empty" }
  | { kind: "growing"; plantedAt: number }
  | { kind: "ready"; ripenedAt: number };

type LegacyV1State = {
  version: 1;
  gold: number;
  seeds: number;
  plots: LegacyV1Plot[];
  lastSavedAt: number;
  lastFieldWorkAt: number;
};

type LegacyV2State = {
  version: 2;
  gold: number;
  plots: PlotState[];
  hasWorker: boolean;
  lastSavedAt: number;
};

function migratePlotV1(p: LegacyV1Plot): PlotState {
  if (p.kind === "empty") return { kind: "empty" };
  if (p.kind === "growing")
    return { kind: "growing", crop: "carrot", plantedAt: p.plantedAt };
  return { kind: "ready", crop: "carrot", ripenedAt: p.ripenedAt };
}

function workerSlotsForPlotCount(count: number): boolean[] {
  return Array.from({ length: count }, () => false);
}

function alignPlotWorkers(
  plots: PlotState[],
  plotWorkers: boolean[] | undefined,
): boolean[] {
  const n = plots.length;
  const base = plotWorkers ?? [];
  const next = base.slice(0, n);
  while (next.length < n) next.push(false);
  return next;
}

function migrateV1ToV3(parsed: LegacyV1State, now: number): GameState {
  const migrated = parsed.plots.map(migratePlotV1);
  const plots: PlotState[] =
    migrated.length === 0 ? [{ kind: "empty" }] : migrated;
  return {
    version: 3,
    gold: Number(parsed.gold) || 0,
    plots,
    plotWorkers: workerSlotsForPlotCount(plots.length),
    lastSavedAt: Number(parsed.lastSavedAt) || now,
  };
}

function migrateV2ToV3(parsed: LegacyV2State, now: number): GameState {
  const plots = parsed.plots as PlotState[];
  const plotWorkers = workerSlotsForPlotCount(plots.length);
  if (parsed.hasWorker && plotWorkers.length > 0) {
    plotWorkers[0] = true;
  }
  return {
    version: 3,
    gold: Number(parsed.gold) || 0,
    plots,
    plotWorkers,
    lastSavedAt: Number(parsed.lastSavedAt) || now,
  };
}

export function loadGame(now: number): GameState {
  if (typeof window === "undefined") return createInitialState(now);
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialState(now);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!Array.isArray(parsed.plots)) {
      return createInitialState(now);
    }
    if (parsed.version === 1) {
      return advanceStateToNow(
        migrateV1ToV3(parsed as LegacyV1State, now),
        now,
      );
    }
    if (parsed.version === 2) {
      return advanceStateToNow(
        migrateV2ToV3(parsed as LegacyV2State, now),
        now,
      );
    }
    if (parsed.version !== 3) {
      return createInitialState(now);
    }
    const plots = parsed.plots as GameState["plots"];
    const plotWorkers = alignPlotWorkers(
      plots,
      parsed.plotWorkers as boolean[] | undefined,
    );
    const base: GameState = {
      version: 3,
      gold: Number(parsed.gold) || 0,
      plots,
      plotWorkers,
      lastSavedAt: Number(parsed.lastSavedAt) || now,
    };
    return advanceStateToNow(base, now);
  } catch {
    return createInitialState(now);
  }
}

export function saveGame(state: GameState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode */
  }
}
