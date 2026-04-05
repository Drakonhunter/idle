import type { GameState } from "./types";
import {
  ARCANE_ENCHANTED_DROP_CHANCE,
  GROW_MS,
  MANUAL_HARVEST_GOLD,
  WORKER_HARVEST_GOLD,
  WORKER_WAGE_PER_CARROT,
} from "./types";
import {
  carrotGrowMs,
  manualCarrotHarvestGold,
  workerCarrotHarvestGold,
  workerCarrotWageAmount,
} from "./arcane";

function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  const s = ms / 1000;
  const rounded = Math.round(s * 100) / 100;
  return `${ms.toLocaleString()} ms (${rounded}s)`;
}

export type KingdomStatsBreakdown = {
  timing: {
    baseGrowMs: number;
    hasGrowthUpgrade: boolean;
    growthEquation: string;
    effectiveGrowMs: number;
    effectiveGrowDisplay: string;
    workerHarvestNote: string;
    workerHarvestEquation: string;
  };
  manualGold: {
    base: number;
    mult: number;
    multLabel: string;
    equation: string;
    result: number;
  };
  workerRemit: {
    base: number;
    mult: number;
    multLabel: string;
    equation: string;
    result: number;
  };
  wages: {
    base: number;
    hasDiscount: boolean;
    equation: string;
    result: number;
  };
  enchanted: {
    harvestUnlocked: boolean;
    dropChancePct: number;
    nextHarvestGuaranteed: boolean;
    dropEquation: string;
  };
  aggregates: {
    manualCount: number;
    workerCount: number;
    manualGoldEach: number;
    workerGoldEach: number;
    wageEach: number;
    grossEquation: string;
    grossValue: number;
    wagesTotalRaw: number;
    wagesEquation: string;
    profitEquation: string;
    profitValue: number;
  };
};

export function buildKingdomStatsBreakdown(state: GameState): KingdomStatsBreakdown {
  const effectiveGrowMs = carrotGrowMs(state);
  const hasGrowth = state.arcane.pathUpgrades.growth;
  const growthEquation = hasGrowth
    ? `round(${GROW_MS} × 0.9) = ${effectiveGrowMs}`
    : `${GROW_MS} (no Hastened soil)`;

  const hasSale = state.arcane.pathUpgrades.saleGold;
  const goldMult = hasSale ? 1.1 : 1;
  const multLabel = hasSale ? "Golden market ×1.1" : "×1 (no Golden market)";

  const manualResult = manualCarrotHarvestGold(state);
  const manualEq = hasSale
    ? `max(1, round(${MANUAL_HARVEST_GOLD} × 1.1)) = ${manualResult}`
    : `max(1, round(${MANUAL_HARVEST_GOLD} × 1)) = ${manualResult}`;

  const workerResult = workerCarrotHarvestGold(state);
  const workerEq = hasSale
    ? `max(1, round(${WORKER_HARVEST_GOLD} × 1.1)) = ${workerResult}`
    : `max(1, round(${WORKER_HARVEST_GOLD} × 1)) = ${workerResult}`;

  const hasWageDiscount = state.arcane.pathUpgrades.cheaperWages;
  const wageResult = workerCarrotWageAmount(state);
  const wageEq = hasWageDiscount
    ? `round2(${WORKER_WAGE_PER_CARROT} × 0.9) = ${wageResult}`
    : `${WORKER_WAGE_PER_CARROT} (no Fair ledgers discount)`;

  const a = state.arcane;
  const dropPct = ARCANE_ENCHANTED_DROP_CHANCE * 100;
  const dropEq = a.enchantedHarvestUnlocked
    ? a.nextCarrotHarvestIsEnchanted
      ? "Next carrot harvest: 100% (guaranteed once), then random rolls apply."
      : `Each carrot harvest: ${dropPct}% random (plus any active guarantee).`
    : "Enchanted harvest not unlocked.";

  const m = state.stats.manualCarrotsTotal;
  const w = state.stats.workerCarrotsTotal;
  const wg = workerResult;
  const me = manualResult;
  const wageEach = wageResult;

  const grossValue = m * me + w * wg;
  const wagesRaw = state.stats.workerWagesTotalPaid;
  const profitValue = grossValue - wagesRaw;

  return {
    timing: {
      baseGrowMs: GROW_MS,
      hasGrowthUpgrade: hasGrowth,
      growthEquation,
      effectiveGrowMs,
      effectiveGrowDisplay: formatMs(effectiveGrowMs),
      workerHarvestNote:
        "A field hand completes a harvest one full grow-cycle after the crop becomes ripe (same duration as planting→ripe).",
      workerHarvestEquation: `worker_wait_ms = grow_ms_effective → ${effectiveGrowMs} ms`,
    },
    manualGold: {
      base: MANUAL_HARVEST_GOLD,
      mult: goldMult,
      multLabel,
      equation: manualEq,
      result: manualResult,
    },
    workerRemit: {
      base: WORKER_HARVEST_GOLD,
      mult: goldMult,
      multLabel,
      equation: workerEq,
      result: workerResult,
    },
    wages: {
      base: WORKER_WAGE_PER_CARROT,
      hasDiscount: hasWageDiscount,
      equation: wageEq,
      result: wageResult,
    },
    enchanted: {
      harvestUnlocked: a.enchantedHarvestUnlocked,
      dropChancePct: dropPct,
      nextHarvestGuaranteed: a.nextCarrotHarvestIsEnchanted,
      dropEquation: dropEq,
    },
    aggregates: {
      manualCount: m,
      workerCount: w,
      manualGoldEach: me,
      workerGoldEach: wg,
      wageEach,
      grossEquation: `${m} × ${me} + ${w} × ${wg}`,
      grossValue,
      wagesTotalRaw: wagesRaw,
      wagesEquation:
        w > 0
          ? `ledger total (sum of ${wageEach}g per worker carrot, 2dp) = ${wagesRaw}`
          : "No worker carrots yet.",
      profitEquation: `gross − wages_total = ${grossValue} − ${wagesRaw}`,
      profitValue,
    },
  };
}
