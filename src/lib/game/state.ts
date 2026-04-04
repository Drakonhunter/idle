import {
  type CropId,
  type GameState,
  type PlotState,
  GROW_MS,
  MANUAL_HARVEST_GOLD,
  WORKER_HARVEST_GOLD,
  WORKER_HIRE_COST,
  STARTING_GOLD,
  STARTING_PLOT_COUNT,
} from "./types";

function freshPlots(count: number): PlotState[] {
  return Array.from({ length: count }, () => ({ kind: "empty" as const }));
}

export function createInitialState(now: number): GameState {
  return {
    version: 2,
    gold: STARTING_GOLD,
    plots: freshPlots(STARTING_PLOT_COUNT),
    hasWorker: false,
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

/**
 * Worker completes harvest GROW_MS after the crop becomes ripe; manual harvest is instant.
 */
export function advanceStateToNow(state: GameState, now: number): GameState {
  let gold = state.gold;
  const plots = state.plots.map((plot) => {
    const p = advanceGrowing(plot, now);
    if (
      p.kind === "ready" &&
      state.hasWorker &&
      now >= p.ripenedAt + GROW_MS
    ) {
      gold += WORKER_HARVEST_GOLD;
      return { kind: "empty" as const };
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

export function plantInPlot(
  state: GameState,
  plotIndex: number,
  crop: CropId,
  now: number,
): GameState | null {
  const plot = state.plots[plotIndex];
  if (!plot || plot.kind !== "empty") return null;
  const nextPlots = [...state.plots];
  nextPlots[plotIndex] = { kind: "growing", crop, plantedAt: now };
  return advanceStateToNow(
    {
      ...state,
      plots: nextPlots,
      lastSavedAt: now,
    },
    now,
  );
}

export function harvestPlot(
  state: GameState,
  plotIndex: number,
  now: number,
): GameState | null {
  const plot = state.plots[plotIndex];
  if (!plot || plot.kind !== "ready") return null;
  const nextPlots = [...state.plots];
  nextPlots[plotIndex] = { kind: "empty" };
  return {
    ...state,
    gold: state.gold + MANUAL_HARVEST_GOLD,
    plots: nextPlots,
    lastSavedAt: now,
  };
}

export function hireWorker(state: GameState, now: number): GameState | null {
  if (state.hasWorker) return null;
  if (state.gold < WORKER_HIRE_COST) return null;
  return advanceStateToNow(
    {
      ...state,
      gold: state.gold - WORKER_HIRE_COST,
      hasWorker: true,
      lastSavedAt: now,
    },
    now,
  );
}