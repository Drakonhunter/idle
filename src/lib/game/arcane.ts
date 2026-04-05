import type { GameState } from "./types";
import {
  ARCANE_ENCHANTED_DROP_CHANCE,
  ARCANE_WIZARD_RETURN_COST,
  GROW_MS,
  MANUAL_HARVEST_GOLD,
  WORKER_POST_RIPE_HARVEST_MS,
  WORKER_WAGE_PER_CARROT,
  roundGold2,
} from "./types";

export function totalCarrotsHarvested(stats: GameState["stats"]): number {
  return stats.manualCarrotsTotal + stats.workerCarrotsTotal;
}

export function arcaneTractUnlocked(state: GameState): boolean {
  return state.arcane.wizardHelpFree || state.arcane.wizardHelpPaid;
}

/** Effective growth time for carrots on fields (arcane growth path reduces by 10%). */
export function carrotGrowMs(state: GameState): number {
  if (state.arcane.pathUpgrades.growth) {
    return Math.round(GROW_MS * 0.9);
  }
  return GROW_MS;
}

/** Time workers wait after ripe before auto-harvest completes (not tied to Hastened soil yet). */
export function carrotWorkerPostRipeMs(_state: GameState): number {
  return WORKER_POST_RIPE_HARVEST_MS;
}

export function manualCarrotHarvestGold(state: GameState): number {
  const mult = state.arcane.pathUpgrades.saleGold ? 1.1 : 1;
  return Math.max(1, Math.round(MANUAL_HARVEST_GOLD * mult));
}

/**
 * Gross gold from one carrot sale (same whether you harvest or a worker does).
 */
export function carrotSaleGrossGold(state: GameState): number {
  return manualCarrotHarvestGold(state);
}

/**
 * Wage accrued in the ledger per worker-sold carrot (quantized to 2 decimal places).
 */
export function workerCarrotWageAmount(state: GameState): number {
  if (!state.arcane.pathUpgrades.cheaperWages) {
    return WORKER_WAGE_PER_CARROT;
  }
  return roundGold2(WORKER_WAGE_PER_CARROT * 0.9);
}

/**
 * Gold added to treasury when a worker sells a carrot: gross sale minus wage (2dp).
 * E.g. 11g sale − 4.5g wage → 6.5g.
 */
export function workerCarrotHarvestGold(state: GameState): number {
  const gross = carrotSaleGrossGold(state);
  const wage = workerCarrotWageAmount(state);
  return Math.max(0, roundGold2(gross - wage));
}

export function canShowWizardOffer(state: GameState): boolean {
  if (!state.tutorial.complete) return false;
  if (arcaneTractUnlocked(state)) return false;
  return totalCarrotsHarvested(state.stats) >= 25 && !state.arcane.wizardOfferDismissed;
}

export function canPayWizardReturn(state: GameState): boolean {
  return (
    state.arcane.wizardOfferDismissed &&
    !arcaneTractUnlocked(state) &&
    state.gold >= ARCANE_WIZARD_RETURN_COST
  );
}

export type EnchantedRollResult = {
  enchanted: boolean;
  arcane: GameState["arcane"];
};

/**
 * Decide if this carrot harvest yields an enchanted carrot. Mutates arcane flags
 * (e.g. clears guaranteed-next flag, rolls 1% when eligible).
 */
export function rollEnchantedCarrotHarvest(
  arcane: GameState["arcane"],
  random01: number,
): EnchantedRollResult {
  if (!arcane.enchantedHarvestUnlocked) {
    return { enchanted: false, arcane };
  }
  if (arcane.nextCarrotHarvestIsEnchanted) {
    return {
      enchanted: true,
      arcane: { ...arcane, nextCarrotHarvestIsEnchanted: false },
    };
  }
  if (random01 < ARCANE_ENCHANTED_DROP_CHANCE) {
    return {
      enchanted: true,
      arcane: { ...arcane },
    };
  }
  return { enchanted: false, arcane: { ...arcane } };
}

export function applyEnchantedDrop(
  arcane: GameState["arcane"],
  enchanted: boolean,
): GameState["arcane"] {
  if (!enchanted) return arcane;
  return {
    ...arcane,
    enchantedCarrotsInventory: arcane.enchantedCarrotsInventory + 1,
  };
}
