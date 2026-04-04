"use client";

import type { PlotState } from "@/lib/game/types";
import { GROW_MS } from "@/lib/game/types";
import styles from "./FarmPlot.module.css";

type Props = {
  plot: PlotState;
  plotIndex: number;
  now: number;
  canPlant: boolean;
  onPlant: (i: number) => void;
  onHarvest: (i: number) => void;
};

function labelFor(plot: PlotState, now: number): { emoji: string; text: string } {
  if (plot.kind === "empty") return { emoji: "🌱", text: "Plant" };
  if (plot.kind === "ready") return { emoji: "🥕", text: "Harvest!" };
  const elapsed = now - plot.plantedAt;
  const pct = Math.min(100, Math.floor((elapsed / GROW_MS) * 100));
  return { emoji: "🌿", text: `${pct}%` };
}

export function FarmPlot({
  plot,
  plotIndex,
  now,
  canPlant,
  onPlant,
  onHarvest,
}: Props) {
  const { emoji, text } = labelFor(plot, now);
  const growing = plot.kind === "growing";
  const progress =
    growing
      ? Math.min(100, ((now - plot.plantedAt) / GROW_MS) * 100)
      : 0;

  const handle = () => {
    if (plot.kind === "empty" && canPlant) onPlant(plotIndex);
    else if (plot.kind === "ready") onHarvest(plotIndex);
  };

  const disabled =
    plot.kind === "growing" || (plot.kind === "empty" && !canPlant);

  return (
    <button
      type="button"
      className={`${styles.plot} ${plot.kind === "ready" ? styles.readyPulse : ""}`}
      onClick={handle}
      disabled={disabled}
      aria-label={
        plot.kind === "empty"
          ? canPlant
            ? "Plant crop"
            : "Need seeds to plant"
          : plot.kind === "growing"
            ? "Crop growing"
            : "Harvest crop"
      }
    >
      <span className={styles.inner}>
        <span className={styles.emoji} aria-hidden>
          {emoji}
        </span>
        <span>{text}</span>
        {growing && (
          <span className={styles.barWrap}>
            <span
              className={styles.bar}
              style={{ width: `${progress}%` }}
            />
          </span>
        )}
      </span>
    </button>
  );
}
