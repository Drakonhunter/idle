import {
  type GameState,
  type PlotState,
  GROW_MS,
  HARVEST_GOLD,
  HARVEST_SEED_REFUND,
  PLANT_SEED_COST,
  STARTING_GOLD,
  STARTING_PLOT_COUNT,
  STARTING_SEEDS,
} from "./types";

function freshPlots(count: number): PlotState[] {
  return Array.from({ length: count }, () => ({ kind: "empty" as const }));
}

export function createInitialState(now: number): GameState {
  return {
    version: 1,
    gold: STARTING_GOLD,
    seeds: STARTING_SEEDS,
    plots: freshPlots(STARTING_PLOT_COUNT),
    lastSavedAt: now,
    lastFieldWorkAt: 0,
  };
}

function advancePlot(plot: PlotState, now: number): PlotState {
  if (plot.kind !== "growing") return plot;
  if (now >= plot.plantedAt + GROW_MS) {
    return { kind: "ready", ripenedAt: plot.plantedAt + GROW_MS };
  }
  return plot;
}

export function advanceStateToNow(state: GameState, now: number): GameState {
  return {
    ...state,
    plots: state.plots.map((p) => advancePlot(p, now)),
    lastSavedAt: now,
  };
}

export function plantInPlot(
  state: GameState,
  plotIndex: number,
  now: number,
): GameState | null {
  const plot = state.plots[plotIndex];
  if (!plot || plot.kind !== "empty") return null;
  if (state.seeds < PLANT_SEED_COST) return null;
  const nextPlots = [...state.plots];
  nextPlots[plotIndex] = { kind: "growing", plantedAt: now };
  return advanceStateToNow(
    {
      ...state,
      seeds: state.seeds - PLANT_SEED_COST,
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
    gold: state.gold + HARVEST_GOLD,
    seeds: state.seeds + HARVEST_SEED_REFUND,
    plots: nextPlots,
    lastSavedAt: now,
  };
}

export function buyPlot(
  state: GameState,
  now: number,
  cost: number,
): GameState | null {
  if (state.gold < cost) return null;
  return {
    ...state,
    gold: state.gold - cost,
    plots: [...state.plots, { kind: "empty" }],
    lastSavedAt: now,
  };
}

/** Small active-play bonus: instant gold, long cooldown. */
export function fieldWorkDrip(
  state: GameState,
  now: number,
  cooldownMs: number,
  bonusGold: number,
): GameState | null {
  if (now - state.lastFieldWorkAt < cooldownMs) return null;
  return {
    ...state,
    gold: state.gold + bonusGold,
    lastSavedAt: now,
    lastFieldWorkAt: now,
  };
}
