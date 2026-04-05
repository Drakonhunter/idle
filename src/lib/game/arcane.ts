import type { GameState } from "./types";
import {
  ARCANE_ENCHANTED_DROP_CHANCE,
  ARCANE_WIZARD_RETURN_COST,
  GROW_MS,
  MANUAL_HARVEST_GOLD,
  WORKER_HARVEST_GOLD,
  WORKER_WAGE_PER_CARROT,
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

export function manualCarrotHarvestGold(state: GameState): number {
  const mult = state.arcane.pathUpgrades.saleGold ? 1.1 : 1;
  return Math.max(1, Math.round(MANUAL_HARVEST_GOLD * mult));
}

export function workerCarrotHarvestGold(state: GameState): number {
  const mult = state.arcane.pathUpgrades.saleGold ? 1.1 : 1;
  return Math.max(1, Math.round(WORKER_HARVEST_GOLD * mult));
}

/**
 * Wage deducted from ledger per worker-sold carrot (exact in simulation).
 * With the arcane discount this is 4.5g; UI should round when displaying totals.
 */
export function workerCarrotWageAmount(state: GameState): number {
  if (!state.arcane.pathUpgrades.cheaperWages) {
    return WORKER_WAGE_PER_CARROT;
  }
  return WORKER_WAGE_PER_CARROT * 0.9;
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
