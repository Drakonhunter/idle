import {
  type CropId,
  type GameState,
  type PlotState,
  DEFAULT_PLOT_CROP,
  GROW_MS,
  MANUAL_HARVEST_GOLD,
  WORKER_HARVEST_GOLD,
  nextWorkerHireCost,
  STARTING_GOLD,
  STARTING_PLOT_COUNT,
} from "./types";

function freshPlots(count: number): PlotState[] {
  return Array.from({ length: count }, () => ({ kind: "empty" as const }));
}

function freshWorkerSlots(count: number): boolean[] {
  return Array.from({ length: count }, () => false);
}

function freshSelectedCrops(count: number): CropId[] {
  return Array.from({ length: count }, () => DEFAULT_PLOT_CROP);
}

export function createInitialState(now: number): GameState {
  return {
    version: 4,
    gold: STARTING_GOLD,
    plots: freshPlots(STARTING_PLOT_COUNT),
    plotWorkers: freshWorkerSlots(STARTING_PLOT_COUNT),
    plotSelectedCrops: freshSelectedCrops(STARTING_PLOT_COUNT),
    lastSavedAt: now,
  };
}

function advanceGrowing(plot: PlotState, now: number): PlotState {
  if (plot.kind !== "growing") return plot;
  if (now >= plot.plantedAt + GROW_MS) {
    return {
      kind: "ready",
      crop: plot.crop,
      ripenedAt: plot.plantedAt + GROW_MS,
    };
  }
  return plot;
}

function cropForPlot(state: GameState, plotIndex: number): CropId {
  return state.plotSelectedCrops[plotIndex] ?? DEFAULT_PLOT_CROP;
}

function startGrowing(crop: CropId, now: number): PlotState {
  return { kind: "growing", crop, plantedAt: now };
}

/**
 * Worker completes harvest GROW_MS after the crop becomes ripe; manual harvest is instant.
 * Empty plots auto-start the plot's selected crop.
 */
export function advanceStateToNow(state: GameState, now: number): GameState {
  let gold = state.gold;
  const plots = state.plots.map((plot, i) => {
    let p = advanceGrowing(plot, now);
    if (
      p.kind === "ready" &&
      state.plotWorkers[i] &&
      now >= p.ripenedAt + GROW_MS
    ) {
      gold += WORKER_HARVEST_GOLD;
      return startGrowing(cropForPlot(state, i), now);
    }
    if (p.kind === "empty") {
      return startGrowing(cropForPlot(state, i), now);
    }
    return p;
  });
  return {
    ...state,
    gold,
    plots,
    lastSavedAt: now,
  };
}

export function harvestPlot(
  state: GameState,
  plotIndex: number,
  now: number,
): GameState | null {
  const plot = state.plots[plotIndex];
  if (!plot || plot.kind !== "ready") return null;
  const nextPlots = [...state.plots];
  nextPlots[plotIndex] = startGrowing(cropForPlot(state, plotIndex), now);
  return advanceStateToNow(
    {
      ...state,
      gold: state.gold + MANUAL_HARVEST_GOLD,
      plots: nextPlots,
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
  if (state.gold < cost) return null;
  return advanceStateToNow(
    {
      ...state,
      gold: state.gold - cost,
      plots: [...state.plots, { kind: "empty" as const }],
      plotWorkers: [...state.plotWorkers, false],
      plotSelectedCrops: [...state.plotSelectedCrops, DEFAULT_PLOT_CROP],
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
  if (plotIndex < 0 || plotIndex >= state.plotWorkers.length) return null;
  if (state.plotWorkers[plotIndex]) return null;
  const cost = nextWorkerHireCost(state.plotWorkers);
  if (state.gold < cost) return null;
  const nextWorkers = [...state.plotWorkers];
  nextWorkers[plotIndex] = true;
  return advanceStateToNow(
    {
      ...state,
      gold: state.gold - cost,
      plotWorkers: nextWorkers,
      lastSavedAt: now,
    },
    now,
  );
}
