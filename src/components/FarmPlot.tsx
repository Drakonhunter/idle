"use client";

import type { CropId, PlotState } from "@/lib/game/types";
import { GROW_MS } from "@/lib/game/types";
import styles from "./FarmPlot.module.css";

type Props = {
  plot: PlotState;
  plotIndex: number;
  now: number;
  hasWorker: boolean;
  onPlantCrop: (plotIndex: number, crop: CropId) => void;
  onHarvest: (i: number) => void;
};

function labelFor(plot: PlotState, now: number): { emoji: string; text: string } {
  if (plot.kind === "empty") return { emoji: "🌱", text: "Choose crop" };
  if (plot.kind === "ready") return { emoji: "🥕", text: "Harvest!" };
  const elapsed = now - plot.plantedAt;
  const pct = Math.min(100, Math.floor((elapsed / GROW_MS) * 100));
  return { emoji: "🌿", text: `${pct}%` };
}

export function FarmPlot({
  plot,
  plotIndex,
  now,
  hasWorker,
  onPlantCrop,
  onHarvest,
}: Props) {
  const { emoji, text } = labelFor(plot, now);
  const growing = plot.kind === "growing";
  const progress =
    growing
      ? Math.min(100, ((now - plot.plantedAt) / GROW_MS) * 100)
      : 0;

  const workerHarvestProgress =
    plot.kind === "ready" && hasWorker
      ? Math.min(
          100,
          ((now - plot.ripenedAt) / GROW_MS) * 100,
        )
      : 0;

  const handleHarvest = () => {
    if (plot.kind === "ready") onHarvest(plotIndex);
  };

  return (
    <div className={styles.plotWrap}>
      {plot.kind === "empty" ? (
        <div className={styles.plot} data-state="empty">
          <span className={styles.inner}>
            <span className={styles.emoji} aria-hidden>
              {emoji}
            </span>
            <span className={styles.chooseLabel}>{text}</span>
            <div className={styles.cropRow}>
              <button
                type="button"
                className={styles.cropBtn}
                onClick={() => onPlantCrop(plotIndex, "carrot")}
              >
                🥕 Carrots
              </button>
            </div>
          </span>
        </div>
      ) : (
        <button
          type="button"
          className={`${styles.plot} ${plot.kind === "ready" ? styles.readyPulse : ""}`}
          onClick={handleHarvest}
          disabled={plot.kind === "growing"}
          aria-label={
            plot.kind === "growing" ? "Crop growing" : "Harvest crop for bonus gold"
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
            {plot.kind === "ready" && hasWorker && (
              <span className={styles.workerLine}>
                <span className={styles.workerLabel}>Worker</span>
                <span className={styles.barWrap}>
                  <span
                    className={styles.barWorker}
                    style={{ width: `${workerHarvestProgress}%` }}
                  />
                </span>
              </span>
            )}
          </span>
        </button>
      )}
    </div>
  );
}
