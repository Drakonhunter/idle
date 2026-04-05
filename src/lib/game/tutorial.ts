import type { GameState, TutorialStep } from "./types";
import { nextWorkerHireCost, plotPurchaseCost } from "./types";

/** Full-screen intro modals (welcome + crop tip). The one-parcel beat uses an inline card so the field stays visible. */
export function isIntroModalStep(step: TutorialStep): boolean {
  return step === "welcome" || step === "crop_menu_intro";
}

export function nextIntroStep(step: TutorialStep): TutorialStep {
  if (step === "welcome") return "one_parcel";
  if (step === "one_parcel") return "crop_menu_intro";
  if (step === "crop_menu_intro") return "open_crop_menu";
  return step;
}

export function tutorialMaybeAdvanceOnEconomy(state: GameState): GameState["tutorial"] {
  const t = state.tutorial;
  if (t.complete) return t;

  if (t.step === "harvest_for_land") {
    const cost = plotPurchaseCost(state.plots.length);
    if (state.gold >= cost) {
      return { ...t, step: "buy_field" };
    }
  }

  if (t.step === "save_for_worker") {
    const c = nextWorkerHireCost(state.plotWorkers);
    if (c != null && state.gold >= c) {
      return { ...t, step: "hire_worker" };
    }
  }

  return t;
}

/** If the player skipped ahead (load, fast play), snap the script forward. */
export function tutorialReconcileState(state: GameState): GameState["tutorial"] {
  let t = state.tutorial;

  if (t.complete) return t;

  if (t.step === "open_crop_menu") {
    const c0 = state.plotSelectedCrops[0];
    if (c0 != null) {
      t = { ...t, step: "harvest_for_land" };
    }
  }

  t = tutorialMaybeAdvanceOnEconomy({ ...state, tutorial: t });

  if (t.step === "harvest_for_land" && state.plots.length > 1) {
    t = { ...t, step: "plant_second_field" };
  }
  if (t.step === "buy_field" && state.plots.length > 1) {
    t = { ...t, step: "plant_second_field" };
  }

  if (t.step === "plant_second_field") {
    const c1 = state.plotSelectedCrops[1];
    if (c1 != null) {
      t = { ...t, step: "save_for_worker" };
    }
  }

  t = tutorialMaybeAdvanceOnEconomy({ ...state, tutorial: t });

  if (t.step === "hire_worker" && state.plotWorkers.some(Boolean)) {
    return { complete: true, step: "done" };
  }

  return t;
}
