export type CropId = "carrot";

export type PlotState =
  | { kind: "empty" }
  | { kind: "growing"; crop: CropId; plantedAt: number }
  | { kind: "ready"; crop: CropId; ripenedAt: number };

export type GameState = {
  version: 4;
  gold: number;
  plots: PlotState[];
  /** One hired worker per plot index; auto-harvests that field after GROW_MS once ripe. */
  plotWorkers: boolean[];
  /** Crop this plot will grow (auto-replant after harvest). */
  plotSelectedCrops: CropId[];
  lastSavedAt: number;
};

export const SAVE_KEY = "tiny-kingdom-idle-v1";
/** Carrot growth duration (4× faster than the original 45s loop). */
export const GROW_MS = 11_250;
export const MANUAL_HARVEST_GOLD = 8;
export const WORKER_HARVEST_GOLD = 4;
export const STARTING_GOLD = 0;
export const STARTING_PLOT_COUNT = 1;
export const DEFAULT_PLOT_CROP: CropId = "carrot";

/** Gold to buy the next plot: 10 for 2nd, 50 for 3rd, then rising. */
export function plotPurchaseCost(currentPlotCount: number): number {
  if (currentPlotCount < 1) return 0;
  if (currentPlotCount === 1) return 10;
  if (currentPlotCount === 2) return 50;
  return Math.floor(50 * Math.pow(3.2, currentPlotCount - 2));
}

/**
 * Cost to hire a worker on a plot that does not have one yet.
 * Price is based on how many workers are already employed (any field).
 */
export function nextWorkerHireCost(plotWorkers: boolean[]): number {
  const hired = plotWorkers.filter(Boolean).length;
  const tiers = [50, 400, 2800, 18_000, 115_000];
  if (hired < tiers.length) return tiers[hired];
  return Math.floor(
    tiers[tiers.length - 1] * Math.pow(5.2, hired - tiers.length + 1),
  );
}

export function cropEmoji(crop: CropId): string {
  if (crop === "carrot") return "🥕";
  return "🌱";
}
