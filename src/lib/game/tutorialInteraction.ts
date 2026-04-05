import type { TutorialStep } from "./types";

export type PlotInteractionFlags = {
  cropMenu: boolean;
  harvest: boolean;
  hire: boolean;
};

export type TutorialUiLock = {
  shieldPlotsAndTitle: boolean;
  shieldActionsRow: boolean;
  allowBuyField: boolean;
  allowReset: boolean;
};

const allOff: PlotInteractionFlags = {
  cropMenu: false,
  harvest: false,
  hire: false,
};

const allOn: PlotInteractionFlags = {
  cropMenu: true,
  harvest: true,
  hire: true,
};

export function plotInteraction(
  step: TutorialStep,
  tutorialComplete: boolean,
  plotIndex: number,
): PlotInteractionFlags {
  if (tutorialComplete) return allOn;

  switch (step) {
    case "welcome":
    case "crop_menu_intro":
      return allOff;
    case "one_parcel":
      return allOff;
    case "open_crop_menu":
      return plotIndex === 0
        ? { cropMenu: true, harvest: false, hire: false }
        : allOff;
    case "harvest_for_land":
      return plotIndex === 0
        ? { cropMenu: false, harvest: true, hire: false }
        : allOff;
    case "buy_field":
      return allOff;
    case "plant_second_field":
      return plotIndex === 1
        ? { cropMenu: true, harvest: false, hire: false }
        : allOff;
    case "save_for_worker":
      return { cropMenu: true, harvest: true, hire: false };
    case "hire_worker":
      return { cropMenu: false, harvest: true, hire: true };
    case "done":
      return allOn;
    default:
      return allOn;
  }
}

export function tutorialUiLock(
  step: TutorialStep,
  tutorialComplete: boolean,
): TutorialUiLock {
  if (tutorialComplete) {
    return {
      shieldPlotsAndTitle: false,
      shieldActionsRow: false,
      allowBuyField: true,
      allowReset: true,
    };
  }

  if (step === "one_parcel") {
    return {
      shieldPlotsAndTitle: true,
      shieldActionsRow: true,
      allowBuyField: false,
      allowReset: false,
    };
  }

  if (step === "buy_field") {
    return {
      shieldPlotsAndTitle: true,
      shieldActionsRow: false,
      allowBuyField: true,
      allowReset: false,
    };
  }

  return {
    shieldPlotsAndTitle: false,
    shieldActionsRow: false,
    allowBuyField: false,
    allowReset: false,
  };
}
