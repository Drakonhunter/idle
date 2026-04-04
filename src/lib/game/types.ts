export type PlotState =
  | { kind: "empty" }
  | { kind: "growing"; plantedAt: number }
  | { kind: "ready"; ripenedAt: number };

export type GameState = {
  version: 1;
  gold: number;
  seeds: number;
  plots: PlotState[];
  lastSavedAt: number;
};

export const SAVE_KEY = "tiny-kingdom-idle-v1";
export const GROW_MS = 45_000;
export const PLANT_SEED_COST = 1;
export const HARVEST_GOLD = 4;
export const HARVEST_SEED_REFUND = 1;
export const STARTING_GOLD = 0;
export const STARTING_SEEDS = 12;
export const STARTING_PLOT_COUNT = 3;

export function plotPurchaseCost(plotIndex: number): number {
  if (plotIndex < STARTING_PLOT_COUNT) return 0;
  const n = plotIndex - STARTING_PLOT_COUNT + 1;
  return Math.floor(20 * Math.pow(1.55, n));
}
