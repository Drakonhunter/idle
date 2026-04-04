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

function migratePlotV1(p: LegacyV1Plot): PlotState {
  if (p.kind === "empty") return { kind: "empty" };
  if (p.kind === "growing")
    return { kind: "growing", crop: "carrot", plantedAt: p.plantedAt };
  return { kind: "ready", crop: "carrot", ripenedAt: p.ripenedAt };
}

function migrateV1ToV2(parsed: LegacyV1State, now: number): GameState {
  const migrated = parsed.plots.map(migratePlotV1);
  const plots: PlotState[] =
    migrated.length === 0 ? [{ kind: "empty" }] : migrated.slice(0, 1);
  return {
    version: 2,
    gold: Number(parsed.gold) || 0,
    plots,
    hasWorker: false,
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
      return advanceStateToNow(migrateV1ToV2(parsed as LegacyV1State, now), now);
    }
    if (parsed.version !== 2) {
      return createInitialState(now);
    }
    const base: GameState = {
      version: 2,
      gold: Number(parsed.gold) || 0,
      plots: parsed.plots as GameState["plots"],
      hasWorker: Boolean(parsed.hasWorker),
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
