export type CropId = "carrot";

export type PlotState =
  | { kind: "empty" }
  | { kind: "growing"; crop: CropId; plantedAt: number }
  | { kind: "ready"; crop: CropId; ripenedAt: number };

export type GameState = {
  version: 2;
  gold: number;
  plots: PlotState[];
  /** Hired worker auto-harvests ripe crops after GROW_MS (same as grow time). */
  hasWorker: boolean;
  lastSavedAt: number;
};

export const SAVE_KEY = "tiny-kingdom-idle-v1";
export const GROW_MS = 45_000;
export const MANUAL_HARVEST_GOLD = 8;
export const WORKER_HARVEST_GOLD = 4;
export const WORKER_HIRE_COST = 50;
export const STARTING_GOLD = 0;
export const STARTING_PLOT_COUNT = 1;
