"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { carrotGrowMs } from "@/lib/game/arcane";
import {
  acceptWizardHelpFree,
  advanceStateToNow,
  advanceTutorialIntro,
  buyPlot,
  createInitialState,
  dismissWizardOffer,
  harvestPlot,
  hireWorkerForPlot,
  payWizardForHelp,
  selectCropForPlot,
  spendEnchantedCarrotOnPath,
} from "@/lib/game/state";
import { clearSavedGame, loadGame, saveGame } from "@/lib/game/persistence";
import type { ArcanePathId, CropId, GameState } from "@/lib/game/types";
import { GROW_MS, nextWorkerHireCost, plotPurchaseCost } from "@/lib/game/types";

const TICK_MS = 500;
const SAVE_DEBOUNCE_MS = 400;

export function useIdleGame() {
  const [state, setState] = useState<GameState | null>(null);
  const [now, setNow] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = Date.now();
    queueMicrotask(() => {
      setNow(t);
      setState(loadGame(t));
    });
  }, []);

  const gameReady = state != null;

  useEffect(() => {
    if (!gameReady) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      setState((s) => (s ? advanceStateToNow(s, t, Math.random) : s));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [gameReady]);

  const effectiveState =
    state != null
      ? advanceStateToNow(
          state,
          now > 0 ? now : state.lastSavedAt,
          Math.random,
        )
      : null;

  useEffect(() => {
    if (!effectiveState) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveGame(effectiveState);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [effectiveState]);

  const setAndPersist = useCallback((updater: (s: GameState) => GameState) => {
    setState((s) => {
      if (!s) return s;
      const t = Date.now();
      setNow(t);
      return updater(advanceStateToNow(s, t, Math.random));
    });
  }, []);

  const harvest = useCallback(
    (plotIndex: number) => {
      setAndPersist((s) => {
        const t = Date.now();
        return harvestPlot(s, plotIndex, t, Math.random) ?? s;
      });
    },
    [setAndPersist],
  );

  const pickCropForPlot = useCallback(
    (plotIndex: number, crop: CropId) => {
      setAndPersist((s) => {
        const t = Date.now();
        return selectCropForPlot(s, plotIndex, crop, t);
      });
    },
    [setAndPersist],
  );

  const buyNextPlot = useCallback(() => {
    setAndPersist((s) => {
      const t = Date.now();
      const cost = plotPurchaseCost(s.plots.length);
      return buyPlot(s, t, cost) ?? s;
    });
  }, [setAndPersist]);

  const hireWorkerOnPlot = useCallback(
    (plotIndex: number) => {
      setAndPersist((s) => {
        const t = Date.now();
        return hireWorkerForPlot(s, plotIndex, t) ?? s;
      });
    },
    [setAndPersist],
  );

  const resetKingdom = useCallback(() => {
    const t = Date.now();
    clearSavedGame();
    setNow(t);
    setState(createInitialState(t));
  }, []);

  const tutorialNext = useCallback(() => {
    setAndPersist((s) => advanceTutorialIntro(s));
  }, [setAndPersist]);

  const wizardAcceptFree = useCallback(() => {
    setAndPersist((s) => {
      const t = Date.now();
      return acceptWizardHelpFree(s, t);
    });
  }, [setAndPersist]);

  const wizardDismissOffer = useCallback(() => {
    setAndPersist((s) => {
      const t = Date.now();
      return dismissWizardOffer(s, t);
    });
  }, [setAndPersist]);

  const tryPayWizardReturn = useCallback((): boolean => {
    let ok = false;
    setState((s) => {
      if (!s) return s;
      const t = Date.now();
      setNow(t);
      const base = advanceStateToNow(s, t, Math.random);
      const paid = payWizardForHelp(base, t);
      if (paid) {
        ok = true;
        return advanceStateToNow(paid, t, Math.random);
      }
      return base;
    });
    return ok;
  }, []);

  const spendEnchantedOnPath = useCallback(
    (path: ArcanePathId) => {
      setAndPersist((s) => {
        const t = Date.now();
        return spendEnchantedCarrotOnPath(s, path, t) ?? s;
      });
    },
    [setAndPersist],
  );

  const nextPlotCost =
    effectiveState != null
      ? plotPurchaseCost(effectiveState.plots.length)
      : 0;

  const nextWorkerCost =
    effectiveState != null
      ? nextWorkerHireCost(effectiveState.plotWorkers)
      : null;

  const canBuyPlot =
    effectiveState != null && effectiveState.gold >= nextPlotCost;

  const canAffordNextWorker =
    effectiveState != null &&
    nextWorkerCost != null &&
    effectiveState.gold >= nextWorkerCost;

  const growMsEffective =
    effectiveState != null ? carrotGrowMs(effectiveState) : GROW_MS;

  return {
    state: effectiveState,
    now,
    growMs: growMsEffective,
    harvest,
    pickCropForPlot,
    buyNextPlot,
    hireWorkerOnPlot,
    nextPlotCost,
    nextWorkerCost,
    canBuyPlot,
    canAffordNextWorker,
    resetKingdom,
    tutorialNext,
    wizardAcceptFree,
    wizardDismissOffer,
    tryPayWizardReturn,
    spendEnchantedOnPath,
  };
}
