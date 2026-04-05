import {
  type CropId,
  type GameState,
  type HarvestStats,
  type PlotState,
  type UpgradeTrackLevels,
  GROW_MS,
  defaultUpgrades,
  enchantedCarrotChance,
  growDurationMsForCrop,
  manualHarvestGold,
  potatoesUnlocked,
  workerHarvestGold,
  workerWageForCrop,
  nextWorkerHireCost,
  STARTING_GOLD,
  STARTING_PLOT_COUNT,
} from "./types";
import { isIntroModalStep, nextIntroStep, tutorialReconcileState } from "./tutorial";

function freshPlots(count: number): PlotState[] {
  return Array.from({ length: count }, () => ({ kind: "empty" as const }));
}

function freshWorkerSlots(count: number): boolean[] {
  return Array.from({ length: count }, () => false);
}

function freshSelectedCrops(count: number): (CropId | null)[] {
  return Array.from({ length: count }, () => null);
}

export function createFreshStats(plotCount: number): HarvestStats {
  return {
    manualCarrotsTotal: 0,
    workerCarrotsTotal: 0,
    workerWagesTotalPaid: 0,
    manualCarrotsPerPlot: Array.from({ length: plotCount }, () => 0),
    workerCarrotsPerPlot: Array.from({ length: plotCount }, () => 0),
  };
}

function alignPerPlotCounts(arr: number[], plotCount: number): number[] {
  const next = arr.slice(0, plotCount);
  while (next.length < plotCount) next.push(0);
  return next;
}

function ensureStatsForPlots(state: GameState): GameState {
  const n = state.plots.length;
  const s = state.stats;
  const m = alignPerPlotCounts(s.manualCarrotsPerPlot, n);
  const w = alignPerPlotCounts(s.workerCarrotsPerPlot, n);
  if (m === s.manualCarrotsPerPlot && w === s.workerCarrotsPerPlot) return state;
  return {
    ...state,
    stats: { ...s, manualCarrotsPerPlot: m, workerCarrotsPerPlot: w },
  };
}

function recordManualCarrotHarvest(
  stats: HarvestStats,
  plotIndex: number,
  plotCount: number,
): HarvestStats {
  const manualCarrotsPerPlot = alignPerPlotCounts(stats.manualCarrotsPerPlot, plotCount);
  const workerCarrotsPerPlot = alignPerPlotCounts(stats.workerCarrotsPerPlot, plotCount);
  const nextM = [...manualCarrotsPerPlot];
  nextM[plotIndex] = (nextM[plotIndex] ?? 0) + 1;
  return {
    manualCarrotsTotal: stats.manualCarrotsTotal + 1,
    workerCarrotsTotal: stats.workerCarrotsTotal,
    workerWagesTotalPaid: stats.workerWagesTotalPaid,
    manualCarrotsPerPlot: nextM,
    workerCarrotsPerPlot,
  };
}

function recordWorkerCarrotHarvest(
  stats: HarvestStats,
  plotIndex: number,
  plotCount: number,
  wage: number,
): HarvestStats {
  const manualCarrotsPerPlot = alignPerPlotCounts(stats.manualCarrotsPerPlot, plotCount);
  const workerCarrotsPerPlot = alignPerPlotCounts(stats.workerCarrotsPerPlot, plotCount);
  const nextW = [...workerCarrotsPerPlot];
  nextW[plotIndex] = (nextW[plotIndex] ?? 0) + 1;
  return {
    manualCarrotsTotal: stats.manualCarrotsTotal,
    workerCarrotsTotal: stats.workerCarrotsTotal + 1,
    workerWagesTotalPaid: stats.workerWagesTotalPaid + wage,
    manualCarrotsPerPlot,
    workerCarrotsPerPlot,
  };
}

function finalizeTutorial(state: GameState): GameState {
  const nextTutorial = tutorialReconcileState(state);
  const t = state.tutorial;
  if (nextTutorial.complete === t.complete && nextTutorial.step === t.step) {
    return state;
  }
  return { ...state, tutorial: nextTutorial };
}

export function createInitialState(now: number): GameState {
  const n = STARTING_PLOT_COUNT;
  return finalizeTutorial({
    version: 7,
    gold: STARTING_GOLD,
    goldenCarrots: 0,
    upgrades: defaultUpgrades(),
    plots: freshPlots(n),
    plotWorkers: freshWorkerSlots(n),
    plotSelectedCrops: freshSelectedCrops(n),
    stats: createFreshStats(n),
    tutorial: { complete: false, step: "welcome" },
    lastSavedAt: now,
  });
}

function withGrowMs(plot: PlotState): PlotState {
  if (plot.kind === "empty") return plot;
  if ("growMs" in plot && typeof plot.growMs === "number") return plot;
  return { ...plot, growMs: GROW_MS } as PlotState;
}

type PlotWithOptionalGrow =
  | { kind: "empty" }
  | { kind: "growing"; crop: CropId; plantedAt: number; growMs?: number }
  | { kind: "ready"; crop: CropId; ripenedAt: number; growMs?: number };

/** Saved plots before v7 may omit `growMs`; attach base duration. */
export function normalizePlotGrowMs(plot: PlotWithOptionalGrow): PlotState {
  if (plot.kind === "empty") return plot;
  const growMs =
    "growMs" in plot && typeof plot.growMs === "number" ? plot.growMs : GROW_MS;
  if (plot.kind === "growing") {
    return { kind: "growing", crop: plot.crop, plantedAt: plot.plantedAt, growMs };
  }
  return { kind: "ready", crop: plot.crop, ripenedAt: plot.ripenedAt, growMs };
}

function advanceGrowing(plot: PlotState, now: number): PlotState {
  const p = withGrowMs(plot);
  if (p.kind !== "growing") return p;
  const growMs = p.growMs;
  if (now >= p.plantedAt + growMs) {
    return {
      kind: "ready",
      crop: p.crop,
      ripenedAt: p.plantedAt + growMs,
      growMs,
    };
  }
  return p;
}

function cropForPlot(state: GameState, plotIndex: number): CropId | null {
  return state.plotSelectedCrops[plotIndex] ?? null;
}

function startGrowing(
  crop: CropId,
  now: number,
  upgrades: UpgradeTrackLevels,
): PlotState {
  const growMs = growDurationMsForCrop(crop, upgrades);
  return { kind: "growing", crop, plantedAt: now, growMs };
}

/** Safety cap for long AFK; ~months of 2-plot worker loops at current timings. */
const MAX_ADVANCE_ITERATIONS = 2_000_000;

/**
 * One deterministic pass toward `targetNow`: worker harvest replants at the simulated
 * harvest-finish time (not wall `targetNow`) so multi-cycle offline catch-up is correct.
 */
function advanceSinglePass(state: GameState, targetNow: number): GameState {
  let gold = state.gold;
  let stats = state.stats;
  const plotCount = state.plots.length;
  const plots = state.plots.map((plot, i) => {
    const p = advanceGrowing(plot, targetNow);
    const selected = cropForPlot(state, i);
    const workerGrowMs =
      selected != null
        ? growDurationMsForCrop(selected, state.upgrades)
        : GROW_MS;
    if (
      p.kind === "ready" &&
      state.plotWorkers[i] &&
      targetNow >= p.ripenedAt + workerGrowMs
    ) {
      gold += workerHarvestGold(p.crop);
      if (p.crop === "carrot") {
        stats = recordWorkerCarrotHarvest(
          stats,
          i,
          plotCount,
          workerWageForCrop("carrot"),
        );
      }
      const harvestDoneAt = p.ripenedAt + workerGrowMs;
      if (selected != null) {
        return startGrowing(selected, harvestDoneAt, state.upgrades);
      }
      return { kind: "empty" as const };
    }
    if (p.kind === "empty" && selected != null) {
      return startGrowing(selected, targetNow, state.upgrades);
    }
    return p;
  });
  const unchanged =
    gold === state.gold &&
    stats === state.stats &&
    plots.length === state.plots.length &&
    plots.every((pl, i) => pl === state.plots[i]);
  if (unchanged) {
    return state;
  }
  return {
    ...state,
    gold,
    stats,
    plots,
    lastSavedAt: state.lastSavedAt,
  };
}

/**
 * Worker completes harvest after workerGrowMs once ripe; manual harvest is instant.
 * Empty plots only grow when the player has assigned a crop.
 */
export function advanceStateToNow(state: GameState, targetNow: number): GameState {
  const aligned = ensureStatsForPlots(state);
  let current = aligned;
  for (let n = 0; n < MAX_ADVANCE_ITERATIONS; n++) {
    const next = advanceSinglePass(current, targetNow);
    if (next === current) break;
    current = next;
  }
  if (current === aligned) {
    return finalizeTutorial(aligned);
  }
  return finalizeTutorial({
    ...current,
    lastSavedAt: targetNow,
  });
}

export function harvestPlot(
  state: GameState,
  plotIndex: number,
  now: number,
): GameState | null {
  const base = ensureStatsForPlots(state);
  const plot = withGrowMs(base.plots[plotIndex]);
  if (!plot || plot.kind !== "ready") return null;
  const selected = cropForPlot(base, plotIndex);
  const nextPlots = [...base.plots];
  nextPlots[plotIndex] =
    selected != null
      ? startGrowing(selected, now, base.upgrades)
      : { kind: "empty" };
  let stats = base.stats;
  let goldenCarrots = base.goldenCarrots;
  if (plot.crop === "carrot") {
    stats = recordManualCarrotHarvest(stats, plotIndex, base.plots.length);
    const p = enchantedCarrotChance(base.upgrades);
    if (p > 0 && Math.random() < p) {
      goldenCarrots += 1;
    }
  }
  const goldGain = manualHarvestGold(plot.crop);
  const after = advanceStateToNow(
    {
      ...base,
      gold: base.gold + goldGain,
      goldenCarrots,
      stats,
      plots: nextPlots,
      lastSavedAt: now,
    },
    now,
  );
  return after;
}

export function selectCropForPlot(
  state: GameState,
  plotIndex: number,
  crop: CropId,
  now: number,
): GameState {
  const base = ensureStatsForPlots(state);
  if (crop === "potato" && !potatoesUnlocked(base.upgrades)) return base;
  const n = base.plots.length;
  if (plotIndex < 0 || plotIndex >= n) return base;
  const plotSelectedCrops = [...base.plotSelectedCrops];
  while (plotSelectedCrops.length < n) {
    plotSelectedCrops.push(null);
  }
  plotSelectedCrops[plotIndex] = crop;
  const plots = [...base.plots];
  if (plots[plotIndex]?.kind === "empty") {
    plots[plotIndex] = startGrowing(crop, now, base.upgrades);
  }
  return advanceStateToNow(
    {
      ...base,
      plots,
      plotSelectedCrops,
      lastSavedAt: now,
    },
    now,
  );
}

export function buyPlot(
  state: GameState,
  now: number,
  cost: number,
): GameState | null {
  const base = ensureStatsForPlots(state);
  if (base.gold < cost) return null;
  const newCount = base.plots.length + 1;
  const stats = {
    ...base.stats,
    manualCarrotsPerPlot: alignPerPlotCounts(
      base.stats.manualCarrotsPerPlot,
      newCount,
    ),
    workerCarrotsPerPlot: alignPerPlotCounts(
      base.stats.workerCarrotsPerPlot,
      newCount,
    ),
    workerWagesTotalPaid: base.stats.workerWagesTotalPaid,
  };
  return advanceStateToNow(
    {
      ...base,
      gold: base.gold - cost,
      stats,
      plots: [...base.plots, { kind: "empty" as const }],
      plotWorkers: [...base.plotWorkers, false],
      plotSelectedCrops: [...base.plotSelectedCrops, null],
      lastSavedAt: now,
    },
    now,
  );
}

export function hireWorkerForPlot(
  state: GameState,
  plotIndex: number,
  now: number,
): GameState | null {
  const base = ensureStatsForPlots(state);
  if (plotIndex < 0 || plotIndex >= base.plotWorkers.length) return null;
  if (base.plotWorkers[plotIndex]) return null;
  const cost = nextWorkerHireCost(base.plotWorkers);
  if (cost == null || base.gold < cost) return null;
  const nextWorkers = [...base.plotWorkers];
  nextWorkers[plotIndex] = true;
  return advanceStateToNow(
    {
      ...base,
      gold: base.gold - cost,
      plotWorkers: nextWorkers,
      lastSavedAt: now,
    },
    now,
  );
}

export type UpgradeTrackId = keyof UpgradeTrackLevels;

/** Golden carrot cost for tier 1 / tier 2 per track. */
const UPGRADE_COSTS: Record<UpgradeTrackId, [number, number]> = {
  growth: [1, 2],
  gold: [2, 2],
  hands: [1, 2],
};

export function nextUpgradeCost(
  track: UpgradeTrackId,
  upgrades: UpgradeTrackLevels,
): number | null {
  const level = upgrades[track];
  if (level >= 2) return null;
  return UPGRADE_COSTS[track][level];
}

export function purchaseUpgrade(
  state: GameState,
  track: UpgradeTrackId,
  now: number,
): GameState | null {
  const base = ensureStatsForPlots(state);
  const level = base.upgrades[track];
  if (level >= 2) return null;
  const cost = UPGRADE_COSTS[track][level];
  if (base.goldenCarrots < cost) return null;
  const nextUpgrades: UpgradeTrackLevels = {
    ...base.upgrades,
    [track]: level + 1,
  };
  return advanceStateToNow(
    {
      ...base,
      goldenCarrots: base.goldenCarrots - cost,
      upgrades: nextUpgrades,
      lastSavedAt: now,
    },
    now,
  );
}

export function advanceTutorialIntro(state: GameState): GameState {
  const t = state.tutorial;
  if (t.complete) return state;
  const s = t.step;
  if (s === "tutorial_wrap_up") {
    return finalizeTutorial({
      ...state,
      tutorial: { complete: true, step: "done" },
    });
  }
  if (s !== "welcome" && s !== "one_parcel" && s !== "crop_menu_intro") {
    return state;
  }
  return finalizeTutorial({
    ...state,
    tutorial: { ...t, step: nextIntroStep(s) },
  });
}
