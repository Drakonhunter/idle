import type { GameState } from "./types";
import { SAVE_KEY, STARTING_SEEDS } from "./types";
import { advanceStateToNow, createInitialState } from "./state";

export function loadGame(now: number): GameState {
  if (typeof window === "undefined") return createInitialState(now);
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialState(now);
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.plots)) {
      return createInitialState(now);
    }
    const base: GameState = {
      version: 1,
      gold: Number(parsed.gold) || 0,
      seeds: Number.isFinite(Number(parsed.seeds))
        ? Number(parsed.seeds)
        : STARTING_SEEDS,
      plots: parsed.plots as GameState["plots"],
      lastSavedAt: Number(parsed.lastSavedAt) || now,
    };
    return advanceStateToNow(base, now);
  } catch {
    return createInitialState(now);
  }
}

export function saveGame(state: GameState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    /* quota or private mode */
  }
}
