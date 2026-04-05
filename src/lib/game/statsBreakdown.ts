import type { GameState } from "./types";
import {
  ARCANE_ENCHANTED_DROP_CHANCE,
  GROW_MS,
  MANUAL_HARVEST_GOLD,
  WORKER_POST_RIPE_HARVEST_MS,
  WORKER_WAGE_PER_CARROT,
} from "./types";
import {
  carrotGrowMs,
  carrotSaleGrossGold,
  carrotWorkerPostRipeMs,
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
    workerPostRipeBaseMs: number;
    workerPostRipeEffectiveMs: number;
    workerPostRipeDisplay: string;
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
  workerNet: {
    /** Gross sale per carrot (same as manual harvest): 10 × (1 + 0.1 Golden market). */
    saleGrossPerCarrot: number;
    saleEquation: string;
    /** Base worker wage = 50% of base carrot price (5g). */
    baseWorkerWage: number;
    wageEquation: string;
    wageResult: number;
    netEquation: string;
    netResult: number;
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
    totalCarrots: number;
    saleGrossPerCarrot: number;
    manualGoldEach: number;
    workerNetEach: number;
    wageEach: number;
    grossEquation: string;
    grossValue: number;
    wagesTotalRaw: number;
    wagesEquation: string;
    treasuryEquation: string;
    treasuryValue: number;
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

  const workerPostRipeMs = carrotWorkerPostRipeMs(state);

  const hasSale = state.arcane.pathUpgrades.saleGold;
  const goldMult = hasSale ? 1.1 : 1;
  const multLabel = hasSale ? "Golden market ×1.1" : "×1 (no Golden market)";

  const manualResult = manualCarrotHarvestGold(state);
  const manualEq = hasSale
    ? `max(1, round(${MANUAL_HARVEST_GOLD} × (1 + 0.1))) = ${manualResult}`
    : `max(1, round(${MANUAL_HARVEST_GOLD} × 1)) = ${manualResult}`;

  const saleGrossPerCarrot = carrotSaleGrossGold(state);
  const saleGrossEq = hasSale
    ? `gross_sale = max(1, round(${MANUAL_HARVEST_GOLD} × 1.1)) = ${saleGrossPerCarrot}`
    : `gross_sale = ${saleGrossPerCarrot}`;

  const hasWageDiscount = state.arcane.pathUpgrades.cheaperWages;
  const wageResult = workerCarrotWageAmount(state);
  const baseWorkerWage = WORKER_WAGE_PER_CARROT;
  const wageEq = hasWageDiscount
    ? `modified_wage = round2(${baseWorkerWage} × (1 − 0.1)) = round2(5 × 0.9) = ${wageResult}`
    : `wage = ${baseWorkerWage} (base = ${MANUAL_HARVEST_GOLD} × 50%, no Fair ledgers)`;

  const workerNetResult = workerCarrotHarvestGold(state);
  const netEq = `round2(gross_sale − wage) = round2(${saleGrossPerCarrot} − ${wageResult}) = ${workerNetResult}`;

  const a = state.arcane;
  const dropPct = ARCANE_ENCHANTED_DROP_CHANCE * 100;
  const dropEq = a.enchantedHarvestUnlocked
    ? a.nextCarrotHarvestIsEnchanted
      ? "Next carrot harvest: 100% (guaranteed once), then random rolls apply."
      : `Each carrot harvest: ${dropPct}% random (plus any active guarantee).`
    : "Enchanted harvest not unlocked.";

  const m = state.stats.manualCarrotsTotal;
  const w = state.stats.workerCarrotsTotal;
  const totalCarrots = m + w;
  const me = manualResult;
  const wageEach = wageResult;
  const workerNetEach = workerNetResult;

  const grossSalesValue = totalCarrots * saleGrossPerCarrot;
  const treasuryFromCarrots = m * me + w * workerNetEach;
  const wagesRaw = state.stats.workerWagesTotalPaid;
  const profitValue = treasuryFromCarrots - wagesRaw;

  return {
    timing: {
      baseGrowMs: GROW_MS,
      hasGrowthUpgrade: hasGrowth,
      growthEquation,
      effectiveGrowMs,
      effectiveGrowDisplay: formatMs(effectiveGrowMs),
      workerPostRipeBaseMs: WORKER_POST_RIPE_HARVEST_MS,
      workerPostRipeEffectiveMs: workerPostRipeMs,
      workerPostRipeDisplay: formatMs(workerPostRipeMs),
      workerHarvestNote:
        "Worker delay after ripe is its own timer (currently equals base grow time). Hastened soil only speeds planting → ripe, not hand speed — a future upgrade can change worker_post_ripe_ms.",
      workerHarvestEquation: `worker_wait_ms = worker_post_ripe_ms → ${workerPostRipeMs} ms (constant ${WORKER_POST_RIPE_HARVEST_MS} today)`,
    },
    manualGold: {
      base: MANUAL_HARVEST_GOLD,
      mult: goldMult,
      multLabel,
      equation: manualEq,
      result: manualResult,
    },
    workerNet: {
      saleGrossPerCarrot,
      saleEquation: saleGrossEq,
      baseWorkerWage,
      wageEquation: wageEq,
      wageResult,
      netEquation: netEq,
      netResult: workerNetResult,
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
      totalCarrots,
      saleGrossPerCarrot,
      manualGoldEach: me,
      workerNetEach,
      wageEach,
      grossEquation: `${totalCarrots} × ${saleGrossPerCarrot} (gross gold per carrot sold, manual or worker)`,
      grossValue: grossSalesValue,
      wagesTotalRaw: wagesRaw,
      wagesEquation:
        w > 0
          ? `ledger total (sum of ${wageEach}g per worker carrot, 2dp) = ${wagesRaw}`
          : "No worker carrots yet.",
      treasuryEquation: `${m} × ${me} + ${w} × ${workerNetEach}`,
      treasuryValue: treasuryFromCarrots,
      profitEquation: `treasury_from_carrots − wages_total = ${treasuryFromCarrots} − ${wagesRaw}`,
      profitValue,
    },
  };
}
