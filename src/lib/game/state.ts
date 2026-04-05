import {
  type ArcanePathId,
  type CropId,
  type GameState,
  type HarvestStats,
  type PlotState,
  ARCANE_WIZARD_RETURN_COST,
  defaultArcaneState,
  nextWorkerHireCost,
  STARTING_GOLD,
  STARTING_PLOT_COUNT,
  roundGold2,
} from "./types";
import {
  applyEnchantedDrop,
  arcaneTractUnlocked,
  canPayWizardReturn,
  carrotGrowMs,
  carrotWorkerPostRipeMs,
  manualCarrotHarvestGold,
  rollEnchantedCarrotHarvest,
  workerCarrotHarvestGold,
  workerCarrotWageAmount,
} from "./arcane";
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
    enchantedCarrotsTotal: 0,
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
    enchantedCarrotsTotal: stats.enchantedCarrotsTotal,
  };
}

function recordEnchantedCarrotFound(stats: HarvestStats): HarvestStats {
  return {
    ...stats,
    enchantedCarrotsTotal: stats.enchantedCarrotsTotal + 1,
  };
}

function recordWorkerCarrotHarvest(
  stats: HarvestStats,
  plotIndex: number,
  plotCount: number,
  wageForThisCarrot: number,
): HarvestStats {
  const manualCarrotsPerPlot = alignPerPlotCounts(stats.manualCarrotsPerPlot, plotCount);
  const workerCarrotsPerPlot = alignPerPlotCounts(stats.workerCarrotsPerPlot, plotCount);
  const nextW = [...workerCarrotsPerPlot];
  nextW[plotIndex] = (nextW[plotIndex] ?? 0) + 1;
  return {
    manualCarrotsTotal: stats.manualCarrotsTotal,
    workerCarrotsTotal: stats.workerCarrotsTotal + 1,
    workerWagesTotalPaid: roundGold2(
      stats.workerWagesTotalPaid + wageForThisCarrot,
    ),
    manualCarrotsPerPlot,
    workerCarrotsPerPlot: nextW,
    enchantedCarrotsTotal: stats.enchantedCarrotsTotal,
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
    version: 8,
    gold: STARTING_GOLD,
    plots: freshPlots(n),
    plotWorkers: freshWorkerSlots(n),
    plotSelectedCrops: freshSelectedCrops(n),
    stats: createFreshStats(n),
    tutorial: { complete: false, step: "welcome" },
    arcane: defaultArcaneState(),
    lastSavedAt: now,
  });
}

function advanceGrowing(plot: PlotState, now: number, growMs: number): PlotState {
  if (plot.kind !== "growing") return plot;
  if (now >= plot.plantedAt + growMs) {
    return {
      kind: "ready",
      crop: plot.crop,
      ripenedAt: plot.plantedAt + growMs,
    };
  }
  return plot;
}

function cropForPlot(state: GameState, plotIndex: number): CropId | null {
  return state.plotSelectedCrops[plotIndex] ?? null;
}

function startGrowing(crop: CropId, now: number): PlotState {
  return { kind: "growing", crop, plantedAt: now };
}

/** Safety cap for long AFK; ~months of 2-plot worker loops at current timings. */
const MAX_ADVANCE_ITERATIONS = 2_000_000;

/**
 * One deterministic pass toward `targetNow`: worker harvest replants at the simulated
 * harvest-finish time (not wall `targetNow`) so multi-cycle offline catch-up is correct.
 */
function advanceSinglePass(
  state: GameState,
  targetNow: number,
  random: () => number,
): GameState {
  let gold = state.gold;
  let stats = state.stats;
  let arcane = state.arcane;
  const plotCount = state.plots.length;
  const growMs = carrotGrowMs(state);
  const workerPostRipeMs = carrotWorkerPostRipeMs(state);
  const plots = state.plots.map((plot, i) => {
    const p = advanceGrowing(plot, targetNow, growMs);
    const selected = cropForPlot(state, i);
    if (
      p.kind === "ready" &&
      state.plotWorkers[i] &&
      targetNow >= p.ripenedAt + workerPostRipeMs
    ) {
      const slice = { ...state, arcane };
      gold += workerCarrotHarvestGold(slice);
      if (p.crop === "carrot") {
        const roll = rollEnchantedCarrotHarvest(arcane, random());
        arcane = applyEnchantedDrop(roll.arcane, roll.enchanted);
        if (roll.enchanted) {
          stats = recordEnchantedCarrotFound(stats);
        }
        const wage = workerCarrotWageAmount({ ...state, arcane });
        stats = recordWorkerCarrotHarvest(stats, i, plotCount, wage);
      }
      const harvestDoneAt = p.ripenedAt + workerPostRipeMs;
      if (selected != null) {
        return startGrowing(selected, harvestDoneAt);
      }
      return { kind: "empty" as const };
    }
    if (p.kind === "empty" && selected != null) {
      return startGrowing(selected, targetNow);
    }
    return p;
  });
  const unchanged =
    gold === state.gold &&
    stats === state.stats &&
    arcane === state.arcane &&
    plots.length === state.plots.length &&
    plots.every((pl, i) => pl === state.plots[i]);
  if (unchanged) {
    return state;
  }
  return {
    ...state,
    gold,
    stats,
    arcane,
    plots,
    lastSavedAt: state.lastSavedAt,
  };
}

/**
 * Worker completes harvest GROW_MS after the crop becomes ripe; manual harvest is instant.
 * Empty plots only grow when the player has assigned a crop.
 */
export function advanceStateToNow(
  state: GameState,
  targetNow: number,
  random: () => number = Math.random,
): GameState {
  const aligned = ensureStatsForPlots(state);
  let current = aligned;
  for (let n = 0; n < MAX_ADVANCE_ITERATIONS; n++) {
    const next = advanceSinglePass(current, targetNow, random);
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
  random: () => number = Math.random,
): GameState | null {
  const base = ensureStatsForPlots(state);
  const plot = base.plots[plotIndex];
  if (!plot || plot.kind !== "ready") return null;
  const selected = cropForPlot(base, plotIndex);
  const nextPlots = [...base.plots];
  nextPlots[plotIndex] =
    selected != null ? startGrowing(selected, now) : { kind: "empty" };
  let stats = base.stats;
  let arcane = base.arcane;
  if (plot.crop === "carrot") {
    const roll = rollEnchantedCarrotHarvest(arcane, random());
    arcane = applyEnchantedDrop(roll.arcane, roll.enchanted);
    if (roll.enchanted) {
      stats = recordEnchantedCarrotFound(stats);
    }
    stats = recordManualCarrotHarvest(stats, plotIndex, base.plots.length);
  }
  const goldGain = manualCarrotHarvestGold({ ...base, arcane });
  const after = advanceStateToNow(
    {
      ...base,
      gold: base.gold + goldGain,
      stats,
      arcane,
      plots: nextPlots,
      lastSavedAt: now,
    },
    now,
    random,
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
  const n = base.plots.length;
  if (plotIndex < 0 || plotIndex >= n) return base;
  const plotSelectedCrops = [...base.plotSelectedCrops];
  while (plotSelectedCrops.length < n) {
    plotSelectedCrops.push(null);
  }
  plotSelectedCrops[plotIndex] = crop;
  const plots = [...base.plots];
  if (plots[plotIndex]?.kind === "empty") {
    plots[plotIndex] = startGrowing(crop, now);
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

export function acceptWizardHelpFree(state: GameState, now: number): GameState {
  if (arcaneTractUnlocked(state)) return state;
  return {
    ...state,
    arcane: {
      ...state.arcane,
      wizardOfferDismissed: true,
      wizardHelpFree: true,
      enchantedHarvestUnlocked: true,
      nextCarrotHarvestIsEnchanted: true,
    },
    lastSavedAt: now,
  };
}

export function dismissWizardOffer(state: GameState, now: number): GameState {
  return {
    ...state,
    arcane: {
      ...state.arcane,
      wizardOfferDismissed: true,
    },
    lastSavedAt: now,
  };
}

export function payWizardForHelp(state: GameState, now: number): GameState | null {
  if (!canPayWizardReturn(state)) return null;
  if (state.gold < ARCANE_WIZARD_RETURN_COST) return null;
  return {
    ...state,
    gold: state.gold - ARCANE_WIZARD_RETURN_COST,
    arcane: {
      ...state.arcane,
      wizardHelpPaid: true,
      enchantedHarvestUnlocked: true,
      nextCarrotHarvestIsEnchanted: true,
    },
    lastSavedAt: now,
  };
}

export function spendEnchantedCarrotOnPath(
  state: GameState,
  path: ArcanePathId,
  now: number,
): GameState | null {
  if (state.arcane.enchantedCarrotsInventory < 1) return null;
  if (state.arcane.pathUpgrades[path]) return null;
  return {
    ...state,
    arcane: {
      ...state.arcane,
      enchantedCarrotsInventory: state.arcane.enchantedCarrotsInventory - 1,
      pathUpgrades: { ...state.arcane.pathUpgrades, [path]: true },
    },
    lastSavedAt: now,
  };
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
