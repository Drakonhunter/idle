"use client";

import type { CropId, PlotState } from "@/lib/game/types";
import { cropEmoji, GROW_MS } from "@/lib/game/types";
import styles from "./FarmPlot.module.css";

type Props = {
  plot: PlotState;
  plotIndex: number;
  now: number;
  selectedCrop: CropId;
  hasWorker: boolean;
  workerHireCost: number;
  canAffordWorker: boolean;
  onHarvest: (i: number) => void;
  onHireWorker: (plotIndex: number) => void;
};

function mainEmoji(plot: PlotState, selectedCrop: CropId): string {
  if (plot.kind === "growing" || plot.kind === "ready") {
    return cropEmoji(plot.crop);
  }
  return cropEmoji(selectedCrop);
}

function statusText(plot: PlotState): string {
  if (plot.kind === "ready") return "Harvest!";
  return "";
}

export function FarmPlot({
  plot,
  plotIndex,
  now,
  selectedCrop,
  hasWorker,
  workerHireCost,
  canAffordWorker,
  onHarvest,
  onHireWorker,
}: Props) {
  const growing = plot.kind === "growing";
  const ready = plot.kind === "ready";
  const emoji = mainEmoji(plot, selectedCrop);
  const text = statusText(plot);

  const growProgress = growing
    ? Math.min(100, ((now - plot.plantedAt) / GROW_MS) * 100)
    : 0;

  const workerHarvestProgress =
    ready && hasWorker
      ? Math.min(100, ((now - plot.ripenedAt) / GROW_MS) * 100)
      : 0;

  const handleHarvest = () => {
    if (ready) onHarvest(plotIndex);
  };

  return (
    <div className={styles.plotWrap}>
      <div className={styles.plotChrome}>
        <button
          type="button"
          className={styles.cornerBtn}
          onClick={(e) => e.stopPropagation()}
          title="More crops coming soon — for now this field grows carrots"
          aria-label="Change crop (coming soon)"
        >
          <span className={styles.cornerIcon} aria-hidden>
            {cropEmoji(selectedCrop)}
          </span>
        </button>
        {hasWorker ? (
          <span
            className={styles.workerBadge}
            title="Field hand assigned to this plot"
            aria-label="Field hand on this plot"
          >
            <span aria-hidden>🧑‍🌾</span>
          </span>
        ) : (
          <button
            type="button"
            className={styles.cornerBtn}
            onClick={(e) => {
              e.stopPropagation();
              onHireWorker(plotIndex);
            }}
            disabled={!canAffordWorker}
            title={`Hire a field hand (${workerHireCost} gold) — auto-harvests after ${GROW_MS / 1000}s once ripe`}
            aria-label={`Hire field hand for ${workerHireCost} gold`}
          >
            <span className={styles.hirePlus} aria-hidden>
              +
            </span>
          </button>
        )}
      </div>

      <button
        type="button"
        className={`${styles.plot} ${ready ? styles.readyPulse : ""}`}
        onClick={handleHarvest}
        disabled={!ready}
        aria-label={ready ? "Harvest crop for bonus gold" : "Crop growing"}
      >
        <span className={styles.inner}>
          <span className={styles.emoji} aria-hidden>
            {emoji}
          </span>
          {text ? <span>{text}</span> : null}
          {growing && (
            <span className={styles.barWrap}>
              <span className={styles.bar} style={{ width: `${growProgress}%` }} />
            </span>
          )}
          {ready && hasWorker && (
            <span className={styles.barWrap}>
              <span
                className={styles.barWorker}
                style={{ width: `${workerHarvestProgress}%` }}
              />
            </span>
          )}
        </span>
      </button>
    </div>
  );
}
