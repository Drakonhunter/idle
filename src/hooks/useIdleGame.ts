"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buyPlot,
  fieldWorkDrip,
  harvestPlot,
  plantInPlot,
  advanceStateToNow,
} from "@/lib/game/state";
import { loadGame, saveGame } from "@/lib/game/persistence";
import type { GameState } from "@/lib/game/types";
import { GROW_MS, plotPurchaseCost } from "@/lib/game/types";

const TICK_MS = 500;
const SAVE_DEBOUNCE_MS = 400;
const FIELD_WORK_COOLDOWN_MS = 2_500;
const FIELD_WORK_BONUS = 1;

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

  const plant = useCallback(
    (plotIndex: number) => {
      setAndPersist((s) => {
        const t = Date.now();
        return plantInPlot(s, plotIndex, t) ?? s;
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

  const buyNextPlot = useCallback(() => {
    setAndPersist((s) => {
      const t = Date.now();
      const cost = plotPurchaseCost(s.plots.length);
      return buyPlot(s, t, cost) ?? s;
    });
  }, [setAndPersist]);

  const fieldWork = useCallback(() => {
    const t = Date.now();
    setState((s) => {
      if (!s) return s;
      const current = advanceStateToNow(s, t);
      return (
        fieldWorkDrip(
          current,
          t,
          FIELD_WORK_COOLDOWN_MS,
          FIELD_WORK_BONUS,
        ) ?? current
      );
    });
    setNow(t);
  }, []);

  const nextPlotCost =
    effectiveState != null
      ? plotPurchaseCost(effectiveState.plots.length)
      : 0;

  const fieldWorkReady =
    effectiveState != null &&
    now > 0 &&
    (effectiveState.lastFieldWorkAt === 0 ||
      now - effectiveState.lastFieldWorkAt >= FIELD_WORK_COOLDOWN_MS);

  return {
    state: effectiveState,
    now,
    growMs: GROW_MS,
    plant,
    harvest,
    buyNextPlot,
    nextPlotCost,
    fieldWork,
    fieldWorkReady,
    fieldWorkCooldownMs: FIELD_WORK_COOLDOWN_MS,
  };
}
