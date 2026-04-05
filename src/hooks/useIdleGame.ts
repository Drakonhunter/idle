"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  advanceStateToNow,
  advanceTutorialIntro,
  buyPlot,
  createInitialState,
  harvestPlot,
  hireWorkerForPlot,
  selectCropForPlot,
} from "@/lib/game/state";
import { clearSavedGame, loadGame, saveGame } from "@/lib/game/persistence";
import type { CropId, GameState } from "@/lib/game/types";
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
      setState((s) => (s ? advanceStateToNow(s, t) : s));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [gameReady]);

  const effectiveState =
    state != null
      ? advanceStateToNow(state, now > 0 ? now : state.lastSavedAt)
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
      return updater(advanceStateToNow(s, t));
    });
  }, []);

  const harvest = useCallback(
    (plotIndex: number) => {
      setAndPersist((s) => {
        const t = Date.now();
        return harvestPlot(s, plotIndex, t) ?? s;
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

  return {
    state: effectiveState,
    now,
    growMs: GROW_MS,
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
  };
}
