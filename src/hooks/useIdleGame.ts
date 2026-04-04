"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  harvestPlot,
  plantInPlot,
  advanceStateToNow,
  hireWorker,
} from "@/lib/game/state";
import { loadGame, saveGame } from "@/lib/game/persistence";
import type { CropId, GameState } from "@/lib/game/types";
import { GROW_MS, WORKER_HIRE_COST } from "@/lib/game/types";

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

  useEffect(() => {
    if (!state) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [state]);

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

  const plantCrop = useCallback(
    (plotIndex: number, crop: CropId) => {
      setAndPersist((s) => {
        const t = Date.now();
        return plantInPlot(s, plotIndex, crop, t) ?? s;
      });
    },
    [setAndPersist],
  );

  const harvest = useCallback(
    (plotIndex: number) => {
      setAndPersist((s) => {
        const t = Date.now();
        return harvestPlot(s, plotIndex, t) ?? s;
      });
    },
    [setAndPersist],
  );

  const hireFarmWorker = useCallback(() => {
    setAndPersist((s) => {
      const t = Date.now();
      return hireWorker(s, t) ?? s;
    });
  }, [setAndPersist]);

  const canHireWorker =
    effectiveState != null &&
    !effectiveState.hasWorker &&
    effectiveState.gold >= WORKER_HIRE_COST;

  return {
    state: effectiveState,
    now,
    growMs: GROW_MS,
    plantCrop,
    harvest,
    hireFarmWorker,
    canHireWorker,
    workerHireCost: WORKER_HIRE_COST,
  };
}
