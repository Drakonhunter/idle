export type CropId = "carrot";

export type PlotState =
  | { kind: "empty" }
  | { kind: "growing"; crop: CropId; plantedAt: number }
  | { kind: "ready"; crop: CropId; ripenedAt: number };

/** Persistent harvest counters for progression and future features. */
export type HarvestStats = {
  /** Carrots picked by the ruler (click), any field. */
  manualCarrotsTotal: number;
  /** Carrots gathered by field hands, any field. */
  workerCarrotsTotal: number;
  /**
   * Cumulative wages paid to field hands from carrot sales (same gold as the per-carrot
   * gap between manual and worker harvest); tracked for the ledger / stats UI.
   */
  workerWagesTotalPaid: number;
  /** Per-plot manual carrot harvests (aligned to `plots` indices). */
  manualCarrotsPerPlot: number[];
  /** Per-plot worker carrot harvests. */
  workerCarrotsPerPlot: number[];
};

export type TutorialStep =
  | "welcome"
  | "one_parcel"
  | "crop_menu_intro"
  | "open_crop_menu"
  | "harvest_for_land"
  | "buy_field"
  | "plant_second_field"
  | "save_for_worker"
  | "hire_worker"
  | "tutorial_wrap_up"
  | "done";

export type TutorialState = {
  complete: boolean;
  step: TutorialStep;
};

export type GameState = {
  version: 6;
  gold: number;
  plots: PlotState[];
  /** One hired worker per plot index; auto-harvests that field after GROW_MS once ripe. */
  plotWorkers: boolean[];
  /**
   * Crop assigned to this plot; replants after harvest. `null` = fallow until player picks.
   */
  plotSelectedCrops: (CropId | null)[];
  stats: HarvestStats;
  tutorial: TutorialState;
  lastSavedAt: number;
};

export const SAVE_KEY = "tiny-kingdom-idle-v1";
/** Carrot growth duration (4× faster than the original 45s loop). */
export const GROW_MS = 11_250;
export const MANUAL_HARVEST_GOLD = 10;
export const WORKER_HARVEST_GOLD = 5;
/** Per carrot, the treasury pays field hands this much from the sale (lore; equals manual − worker payout). */
export const WORKER_WAGE_PER_CARROT = MANUAL_HARVEST_GOLD - WORKER_HARVEST_GOLD;
export const STARTING_GOLD = 0;
export const STARTING_PLOT_COUNT = 1;

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
export function nextWorkerHireCost(plotWorkers: boolean[]): number | null {
  if (plotWorkers.length === 0) return null;
  if (!plotWorkers.includes(false)) return null;
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
