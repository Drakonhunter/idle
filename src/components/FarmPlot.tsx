"use client";

import { useEffect, useRef, useState } from "react";
import type { CropId, PlotState } from "@/lib/game/types";
import { cropEmoji, GROW_MS } from "@/lib/game/types";
import styles from "./FarmPlot.module.css";

type Props = {
  plot: PlotState;
  plotIndex: number;
  now: number;
  selectedCrop: CropId | null;
  hasWorker: boolean;
  workerHireCost: number | null;
  canAffordWorker: boolean;
  onHarvest: (i: number) => void;
  onHireWorker: (plotIndex: number) => void;
  onPickCrop: (plotIndex: number, crop: CropId) => void;
};

function mainEmoji(plot: PlotState, selectedCrop: CropId | null): string {
  if (plot.kind === "growing" || plot.kind === "ready") {
    return cropEmoji(plot.crop);
  }
  if (selectedCrop != null) return cropEmoji(selectedCrop);
  return "🟫";
}

function statusLabel(
  plot: PlotState,
  hasWorker: boolean,
  selectedCrop: CropId | null,
): string {
  if (plot.kind === "growing") return "Growing";
  if (plot.kind === "ready" && hasWorker) return "Hand harvesting";
  if (plot.kind === "ready") return "Click to harvest!";
  if (selectedCrop == null) return "Fallow";
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
  onPickCrop,
}: Props) {
  const [cropMenuOpen, setCropMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cropMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setCropMenuOpen(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [cropMenuOpen]);

  const growing = plot.kind === "growing";
  const ready = plot.kind === "ready";
  const fallow = plot.kind === "empty";
  const emoji = mainEmoji(plot, selectedCrop);
  const status = statusLabel(plot, hasWorker, selectedCrop);

  const growProgress = growing
    ? Math.min(100, Math.max(0, ((now - plot.plantedAt) / GROW_MS) * 100))
    : 0;

  const workerHarvestProgress =
    ready && hasWorker
      ? Math.min(
          100,
          Math.max(0, ((now - plot.ripenedAt) / GROW_MS) * 100),
        )
      : 0;

  const handleHarvest = () => {
    if (ready) onHarvest(plotIndex);
  };

  const cornerCropIcon =
    selectedCrop != null ? cropEmoji(selectedCrop) : "⋯";

  return (
    <div className={styles.plotWrap} ref={menuRef}>
      <div className={styles.plotChrome}>
        <div className={styles.cornerWrap}>
          <button
            type="button"
            className={styles.cornerBtn}
            onClick={(e) => {
              e.stopPropagation();
              setCropMenuOpen((o) => !o);
            }}
            title="Choose crop for this field"
            aria-expanded={cropMenuOpen}
            aria-haspopup="menu"
            aria-label="Choose crop"
          >
            <span className={styles.cornerIcon} aria-hidden>
              {cornerCropIcon}
            </span>
          </button>
          {cropMenuOpen && (
            <div
              className={styles.cropMenu}
              role="menu"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                className={styles.cropMenuItem}
                onClick={(e) => {
                  e.stopPropagation();
                  onPickCrop(plotIndex, "carrot");
                  setCropMenuOpen(false);
                }}
              >
                🥕 Carrots
              </button>
            </div>
          )}
        </div>
        {hasWorker ? (
          <span
            className={styles.workerBadge}
            title="Field hand on this plot"
            aria-label="Field hand on this plot"
          >
            <span aria-hidden>🧑‍🌾</span>
          </span>
        ) : workerHireCost != null ? (
          <button
            type="button"
            className={styles.cornerBtn}
            onClick={(e) => {
              e.stopPropagation();
              onHireWorker(plotIndex);
            }}
            disabled={!canAffordWorker}
            title={`Hire next field hand (${workerHireCost} gold)`}
            aria-label={`Hire field hand for ${workerHireCost} gold`}
          >
            <span className={styles.hirePlus} aria-hidden>
              +
            </span>
          </button>
        ) : null}
      </div>

      {fallow ? (
        <div className={`${styles.plot} ${styles.plotFallow}`}>
          <span className={styles.inner}>
            <span className={styles.emoji} aria-hidden>
              {emoji}
            </span>
            <span className={styles.statusLine}>{status}</span>
            <span className={styles.hintMuted}>
              Use ⋯ to plant
            </span>
          </span>
        </div>
      ) : (
        <button
          type="button"
          className={`${styles.plot} ${ready ? styles.readyPulse : ""}`}
          onClick={handleHarvest}
          disabled={!ready}
          aria-label={
            ready ? "Harvest crop for bonus gold" : "Crop growing or harvesting"
          }
        >
          <span className={styles.inner}>
            <span className={styles.emoji} aria-hidden>
              {emoji}
            </span>
            <span className={styles.statusLine}>{status}</span>
            {growing && (
              <div
                className={styles.progressBlock}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(growProgress)}
                aria-label="Growing progress"
              >
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      transform: `scaleX(${Math.max(0, growProgress / 100)})`,
                    }}
                  />
                </span>
              </div>
            )}
            {ready && hasWorker && (
              <div
                className={styles.progressBlock}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(workerHarvestProgress)}
                aria-label="Field hand harvest progress"
              >
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFillWorker}
                    style={{
                      transform: `scaleX(${Math.max(0, workerHarvestProgress / 100)})`,
                    }}
                  />
                </span>
              </div>
            )}
          </span>
        </button>
      )}
    </div>
  );
}
