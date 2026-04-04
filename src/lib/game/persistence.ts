import type { CropId, GameState, PlotState } from "./types";
import { SAVE_KEY } from "./types";
import { advanceStateToNow, createInitialState } from "./state";

const CURRENT_SAVE_VERSION = 5 as const;

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

type LegacyV3State = {
  version: 3;
  gold: number;
  plots: PlotState[];
  plotWorkers: boolean[];
  lastSavedAt: number;
};

type LegacyV4State = {
  version: 4;
  gold: number;
  plots: PlotState[];
  plotWorkers: boolean[];
  plotSelectedCrops: CropId[];
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

function selectedCropsForPlotCountV4(count: number): CropId[] {
  return Array.from({ length: count }, () => "carrot");
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

function alignSelectedCropsV5(
  plots: PlotState[],
  plotSelectedCrops: (CropId | null)[] | undefined,
): (CropId | null)[] {
  const n = plots.length;
  const base = plotSelectedCrops ?? [];
  const next = base.slice(0, n) as (CropId | null)[];
  while (next.length < n) next.push(null);
  return next;
}

/** v1 → v2 */
function migrateV1ToV2(parsed: LegacyV1State): LegacyV2State {
  const migrated = parsed.plots.map(migratePlotV1);
  const plots: PlotState[] =
    migrated.length === 0 ? [{ kind: "empty" }] : migrated;
  return {
    version: 2,
    gold: Number(parsed.gold) || 0,
    plots,
    hasWorker: false,
    lastSavedAt: Number(parsed.lastSavedAt) || 0,
  };
}

/** v2 → v3 */
function migrateV2ToV3(parsed: LegacyV2State): LegacyV3State {
  const plots = parsed.plots;
  const plotWorkers = workerSlotsForPlotCount(plots.length);
  if (parsed.hasWorker && plotWorkers.length > 0) {
    plotWorkers[0] = true;
  }
  return {
    version: 3,
    gold: Number(parsed.gold) || 0,
    plots,
    plotWorkers,
    lastSavedAt: Number(parsed.lastSavedAt) || 0,
  };
}

/** v3 → v4 */
function migrateV3ToV4(parsed: LegacyV3State): LegacyV4State {
  const plots = parsed.plots;
  const plotWorkers = alignPlotWorkers(plots, parsed.plotWorkers);
  return {
    version: 4,
    gold: Number(parsed.gold) || 0,
    plots,
    plotWorkers,
    plotSelectedCrops: selectedCropsForPlotCountV4(plots.length),
    lastSavedAt: Number(parsed.lastSavedAt) || 0,
  };
}

/** v4 → v5: no default crop; fallow empty plots */
function migrateV4ToV5(parsed: LegacyV4State): GameState {
  const plots = parsed.plots;
  const plotWorkers = alignPlotWorkers(plots, parsed.plotWorkers);
  const plotSelectedCrops: (CropId | null)[] = plots.map((plot) =>
    plot.kind === "empty" ? null : plot.crop,
  );
  while (plotSelectedCrops.length < plots.length) {
    plotSelectedCrops.push(null);
  }
  return {
    version: 5,
    gold: Number(parsed.gold) || 0,
    plots,
    plotWorkers,
    plotSelectedCrops,
    lastSavedAt: Number(parsed.lastSavedAt) || 0,
  };
}

function migrateSaveTowardCurrent(
  parsed: Record<string, unknown>,
): GameState | null {
  let version = Number(parsed.version);
  if (!Number.isFinite(version)) return null;

  let data: Record<string, unknown> = { ...parsed };

  while (version < CURRENT_SAVE_VERSION) {
    if (version === 1) {
      const next = migrateV1ToV2(data as unknown as LegacyV1State);
      data = { ...next } as unknown as Record<string, unknown>;
      version = 2;
      continue;
    }
    if (version === 2) {
      const next = migrateV2ToV3(data as unknown as LegacyV2State);
      data = { ...next } as unknown as Record<string, unknown>;
      version = 3;
      continue;
    }
    if (version === 3) {
      const next = migrateV3ToV4(data as unknown as LegacyV3State);
      data = { ...next } as unknown as Record<string, unknown>;
      version = 4;
      continue;
    }
    if (version === 4) {
      const next = migrateV4ToV5(data as unknown as LegacyV4State);
      data = { ...next } as unknown as Record<string, unknown>;
      version = 5;
      continue;
    }
    return null;
  }

  if (version !== CURRENT_SAVE_VERSION) return null;
  if (!Array.isArray(data.plots)) return null;

  const plots = data.plots as GameState["plots"];
  const plotWorkers = alignPlotWorkers(
    plots,
    data.plotWorkers as boolean[] | undefined,
  );
  const plotSelectedCrops = alignSelectedCropsV5(
    plots,
    data.plotSelectedCrops as (CropId | null)[] | undefined,
  );

  return {
    version: 5,
    gold: Number(data.gold) || 0,
    plots,
    plotWorkers,
    plotSelectedCrops,
    lastSavedAt: Number(data.lastSavedAt) || 0,
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
    const migrated = migrateSaveTowardCurrent(parsed);
    if (!migrated) {
      return createInitialState(now);
    }
    return advanceStateToNow(migrated, now);
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
