import type { CropId, GameState, PlotState } from "./types";
import {
  GROW_MS,
  WORKER_WAGE_PER_CARROT,
  defaultUpgrades,
} from "./types";
import { SAVE_KEY } from "./types";
import {
  advanceStateToNow,
  createFreshStats,
  createInitialState,
  normalizePlotGrowMs,
} from "./state";

const CURRENT_SAVE_VERSION = 7 as const;

/** Saved plots before v7 may omit `growMs`; `normalizePlotGrowMs` fills it. */
type LegacyPlot =
  | { kind: "empty" }
  | { kind: "growing"; crop: CropId; plantedAt: number; growMs?: number }
  | { kind: "ready"; crop: CropId; ripenedAt: number; growMs?: number };

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
  plots: LegacyPlot[];
  hasWorker: boolean;
  lastSavedAt: number;
};

type LegacyV3State = {
  version: 3;
  gold: number;
  plots: LegacyPlot[];
  plotWorkers: boolean[];
  lastSavedAt: number;
};

type LegacyV4State = {
  version: 4;
  gold: number;
  plots: LegacyPlot[];
  plotWorkers: boolean[];
  plotSelectedCrops: CropId[];
  lastSavedAt: number;
};

type LegacyV5State = {
  version: 5;
  gold: number;
  plots: LegacyPlot[];
  plotWorkers: boolean[];
  plotSelectedCrops: (CropId | null)[];
  lastSavedAt: number;
};

type LegacyV6State = {
  version: 6;
  gold: number;
  plots: LegacyPlot[];
  plotWorkers: boolean[];
  plotSelectedCrops: (CropId | null)[];
  stats: GameState["stats"];
  tutorial: GameState["tutorial"];
  lastSavedAt: number;
};

function migratePlotV1(p: LegacyV1Plot): LegacyPlot {
  if (p.kind === "empty") return { kind: "empty" };
  if (p.kind === "growing")
    return {
      kind: "growing",
      crop: "carrot",
      plantedAt: p.plantedAt,
      growMs: GROW_MS,
    };
  return {
    kind: "ready",
    crop: "carrot",
    ripenedAt: p.ripenedAt,
    growMs: GROW_MS,
  };
}

function workerSlotsForPlotCount(count: number): boolean[] {
  return Array.from({ length: count }, () => false);
}

function selectedCropsForPlotCountV4(count: number): CropId[] {
  return Array.from({ length: count }, () => "carrot");
}

function alignPlotWorkers(
  plots: LegacyPlot[],
  plotWorkers: boolean[] | undefined,
): boolean[] {
  const n = plots.length;
  const base = plotWorkers ?? [];
  const next = base.slice(0, n);
  while (next.length < n) next.push(false);
  return next;
}

function alignSelectedCropsV5(
  plots: LegacyPlot[],
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
  const plots: LegacyPlot[] =
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
function migrateV4ToV5(parsed: LegacyV4State): LegacyV5State {
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

/** v5 → v6: harvest stats + tutorial; existing saves skip the guided intro. */
function migrateV5ToV6(parsed: LegacyV5State): LegacyV6State {
  const plots = parsed.plots;
  const plotWorkers = alignPlotWorkers(plots, parsed.plotWorkers);
  const plotSelectedCrops = alignSelectedCropsV5(
    plots,
    parsed.plotSelectedCrops,
  );
  return {
    version: 6,
    gold: Number(parsed.gold) || 0,
    plots,
    plotWorkers,
    plotSelectedCrops,
    stats: createFreshStats(plots.length),
    tutorial: { complete: true, step: "done" },
    lastSavedAt: Number(parsed.lastSavedAt) || 0,
  };
}

/** v6 → v7: golden carrots, upgrade tracks, per-plot grow duration. */
function migrateV6ToV7(parsed: LegacyV6State): GameState {
  const plots = parsed.plots.map(normalizePlotGrowMs);
  const plotWorkers = alignPlotWorkers(plots, parsed.plotWorkers);
  const plotSelectedCrops = alignSelectedCropsV5(
    plots,
    parsed.plotSelectedCrops,
  );
  const plotCount = plots.length;
  const rawStats = parsed.stats;
  const stats = normalizeHarvestStats(rawStats, plotCount);
  return {
    version: 7,
    gold: Number(parsed.gold) || 0,
    goldenCarrots: 0,
    upgrades: defaultUpgrades(),
    plots,
    plotWorkers,
    plotSelectedCrops,
    stats,
    tutorial: normalizeTutorial(parsed.tutorial as TutorialLike),
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
    if (version === 5) {
      const next = migrateV5ToV6(data as unknown as LegacyV5State);
      data = { ...next } as unknown as Record<string, unknown>;
      version = 6;
      continue;
    }
    if (version === 6) {
      const next = migrateV6ToV7(data as unknown as LegacyV6State);
      data = { ...next } as unknown as Record<string, unknown>;
      version = 7;
      continue;
    }
    return null;
  }

  if (version !== CURRENT_SAVE_VERSION) return null;
  if (!Array.isArray(data.plots)) return null;

  const plots = (data.plots as LegacyPlot[]).map(normalizePlotGrowMs);
  const plotWorkers = alignPlotWorkers(
    plots,
    data.plotWorkers as boolean[] | undefined,
  );
  const plotSelectedCrops = alignSelectedCropsV5(
    plots,
    data.plotSelectedCrops as (CropId | null)[] | undefined,
  );
  const plotCount = plots.length;
  const rawStats = data.stats as HarvestStatsLike | undefined;
  const stats = normalizeHarvestStats(rawStats, plotCount);
  const rawTutorial = data.tutorial as TutorialLike | undefined;
  const tutorial = normalizeTutorial(rawTutorial);
  const goldenCarrotsRaw = Number(data.goldenCarrots);
  const goldenCarrots = Number.isFinite(goldenCarrotsRaw)
    ? Math.max(0, goldenCarrotsRaw)
    : 0;
  const upgrades = normalizeUpgrades(data.upgrades);

  return {
    version: 7,
    gold: Number(data.gold) || 0,
    goldenCarrots,
    upgrades,
    plots,
    plotWorkers,
    plotSelectedCrops,
    stats,
    tutorial,
    lastSavedAt: Number(data.lastSavedAt) || 0,
  };
}

type UpgradesLike = {
  growth?: unknown;
  gold?: unknown;
  hands?: unknown;
};

function normalizeUpgrades(raw: unknown): GameState["upgrades"] {
  const d = defaultUpgrades();
  if (!raw || typeof raw !== "object") return d;
  const o = raw as UpgradesLike;
  const clamp = (n: unknown) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return 0;
    return Math.min(2, Math.max(0, Math.floor(v)));
  };
  return {
    growth: clamp(o.growth),
    gold: clamp(o.gold),
    hands: clamp(o.hands),
  };
}

type HarvestStatsLike = {
  manualCarrotsTotal?: unknown;
  workerCarrotsTotal?: unknown;
  workerWagesTotalPaid?: unknown;
  manualCarrotsPerPlot?: unknown;
  workerCarrotsPerPlot?: unknown;
};

type TutorialLike = {
  complete?: unknown;
  step?: unknown;
};

function normalizeHarvestStats(
  raw: HarvestStatsLike | undefined,
  plotCount: number,
): GameState["stats"] {
  const base = createFreshStats(plotCount);
  if (!raw || typeof raw !== "object") return base;
  const manualTotal = Number(raw.manualCarrotsTotal);
  const workerTotal = Number(raw.workerCarrotsTotal);
  const wagesRaw = Number(raw.workerWagesTotalPaid);
  const mArr = Array.isArray(raw.manualCarrotsPerPlot)
    ? raw.manualCarrotsPerPlot.map((n) => Number(n) || 0)
    : [];
  const wArr = Array.isArray(raw.workerCarrotsPerPlot)
    ? raw.workerCarrotsPerPlot.map((n) => Number(n) || 0)
    : [];
  const workerCarrotsTotalNorm = Number.isFinite(workerTotal)
    ? Math.max(0, workerTotal)
    : 0;
  const wagesFromSave = Number.isFinite(wagesRaw) ? Math.max(0, wagesRaw) : null;
  const workerWagesTotalPaid =
    wagesFromSave != null
      ? wagesFromSave
      : workerCarrotsTotalNorm * WORKER_WAGE_PER_CARROT;
  return {
    manualCarrotsTotal: Number.isFinite(manualTotal) ? Math.max(0, manualTotal) : 0,
    workerCarrotsTotal: workerCarrotsTotalNorm,
    workerWagesTotalPaid,
    manualCarrotsPerPlot: alignPerPlotCounts(mArr, plotCount),
    workerCarrotsPerPlot: alignPerPlotCounts(wArr, plotCount),
  };
}

function alignPerPlotCounts(arr: number[], plotCount: number): number[] {
  const next = arr.slice(0, plotCount).map((n) => (Number.isFinite(n) ? Math.max(0, n) : 0));
  while (next.length < plotCount) next.push(0);
  return next;
}

const VALID_TUTORIAL_STEPS = new Set<string>([
  "welcome",
  "one_parcel",
  "crop_menu_intro",
  "open_crop_menu",
  "harvest_for_land",
  "buy_field",
  "plant_second_field",
  "save_for_worker",
  "hire_worker",
  "tutorial_wrap_up",
  "done",
]);

function normalizeTutorial(raw: TutorialLike | undefined): GameState["tutorial"] {
  if (!raw || typeof raw !== "object") {
    return { complete: false, step: "welcome" };
  }
  const complete = Boolean(raw.complete);
  const stepStr = typeof raw.step === "string" ? raw.step : "";
  const step = VALID_TUTORIAL_STEPS.has(stepStr)
    ? (stepStr as GameState["tutorial"]["step"])
    : "welcome";
  return { complete, step };
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

/** Clears persisted save (e.g. dev reset). */
export function clearSavedGame(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
