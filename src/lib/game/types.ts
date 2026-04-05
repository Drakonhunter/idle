export type CropId = "carrot" | "potato";

export type PlotState =
  | { kind: "empty" }
  | { kind: "growing"; crop: CropId; plantedAt: number; growMs: number }
  | { kind: "ready"; crop: CropId; ripenedAt: number; growMs: number };

/** Per-tier counts (0 = not purchased). Max 2 per track in this release. */
export type UpgradeTrackLevels = {
  growth: number;
  gold: number;
  hands: number;
};

/** Persistent harvest counters for progression and future features. */
export type HarvestStats = {
  /** Carrots picked by the ruler (click), any field. */
  manualCarrotsTotal: number;
  /** Carrots gathered by field hands, any field. */
  workerCarrotsTotal: number;
  /**
   * Cumulative wages paid to field hands from carrot sales (same gold as the per-carrot
   * gap between manual and worker harvest); tracked for stats UI.
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
  version: 7;
  gold: number;
  /** From enchanted carrot rolls (🥕✨); spent on upgrades. */
  goldenCarrots: number;
  upgrades: UpgradeTrackLevels;
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
/** Base growth duration for carrot and potato (before upgrades). */
export const GROW_MS = 11_250;
export const MANUAL_HARVEST_GOLD_CARROT = 10;
export const MANUAL_HARVEST_GOLD_POTATO = 25;
export const WORKER_HARVEST_GOLD_CARROT = 5;
/** Half of manual potato gold, same ratio as carrots. */
export const WORKER_HARVEST_GOLD_POTATO = 12;
/** Per carrot, the treasury pays field hands this much from the sale (equals manual − worker payout). */
export const WORKER_WAGE_PER_CARROT =
  MANUAL_HARVEST_GOLD_CARROT - WORKER_HARVEST_GOLD_CARROT;
export const WORKER_WAGE_PER_POTATO =
  MANUAL_HARVEST_GOLD_POTATO - WORKER_HARVEST_GOLD_POTATO;
/** @deprecated Use MANUAL_HARVEST_GOLD_CARROT */
export const MANUAL_HARVEST_GOLD = MANUAL_HARVEST_GOLD_CARROT;
/** @deprecated Use WORKER_HARVEST_GOLD_CARROT */
export const WORKER_HARVEST_GOLD = WORKER_HARVEST_GOLD_CARROT;
export const STARTING_GOLD = 0;
export const STARTING_PLOT_COUNT = 1;

export function manualHarvestGold(crop: CropId): number {
  if (crop === "carrot") return MANUAL_HARVEST_GOLD_CARROT;
  return MANUAL_HARVEST_GOLD_POTATO;
}

export function workerHarvestGold(crop: CropId): number {
  if (crop === "carrot") return WORKER_HARVEST_GOLD_CARROT;
  return WORKER_HARVEST_GOLD_POTATO;
}

export function workerWageForCrop(crop: CropId): number {
  return manualHarvestGold(crop) - workerHarvestGold(crop);
}

/** Chance per manual carrot harvest for a golden carrot (enchanted roll). Potatoes never roll. */
export function enchantedCarrotChance(upgrades: UpgradeTrackLevels): number {
  const tier = Math.min(2, upgrades.growth);
  if (tier <= 0) return 0;
  return 0.01 * tier;
}

/** Grow duration when planting this crop (carrots: farm hands track; potatoes: gold track tier 2). */
export function growDurationMsForCrop(
  crop: CropId,
  upgrades: UpgradeTrackLevels,
): number {
  if (crop === "carrot") {
    if (upgrades.hands >= 2) return Math.round(GROW_MS * 0.9);
    if (upgrades.hands >= 1) return Math.round(GROW_MS * 0.95);
    return GROW_MS;
  }
  if (upgrades.gold >= 2) return Math.round(GROW_MS * 0.9);
  return GROW_MS;
}

export function potatoesUnlocked(upgrades: UpgradeTrackLevels): boolean {
  return upgrades.gold >= 1;
}

export function defaultUpgrades(): UpgradeTrackLevels {
  return { growth: 0, gold: 0, hands: 0 };
}

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
  if (crop === "potato") return "🥔";
  return "🌱";
}
