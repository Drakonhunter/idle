"use client";

import { FarmPlot } from "@/components/FarmPlot";
import { useIdleGame } from "@/hooks/useIdleGame";
import { MANUAL_HARVEST_GOLD, WORKER_HARVEST_GOLD } from "@/lib/game/types";
import styles from "./page.module.css";

export default function Home() {
  const {
    state,
    now,
    plantCrop,
    harvest,
    hireFarmWorker,
    canHireWorker,
    workerHireCost,
  } = useIdleGame();

  if (!state) {
    return <p className={styles.loading}>Loading your tiny kingdom…</p>;
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Tiny Kingdom Idle</h1>
        <p className={styles.tagline}>
          Tap to harvest for {MANUAL_HARVEST_GOLD} gold per crop, or hire a
          worker for {WORKER_HARVEST_GOLD} gold while you are away — active play
          pays better for now.
        </p>
      </header>

      <div className={styles.panel}>
        <div className={styles.resources} role="status">
          <span className={`${styles.pill} ${styles.pillGold}`}>
            <span aria-hidden>🪙</span>
            <span>{Math.floor(state.gold)} gold</span>
          </span>
          {state.hasWorker && (
            <span className={`${styles.pill} ${styles.pillWorker}`}>
              <span aria-hidden>🧑‍🌾</span>
              <span>Worker hired</span>
            </span>
          )}
        </div>

        <h2 className={styles.sectionTitle}>Your farm</h2>
        <div className={styles.plotGrid}>
          {state.plots.map((plot, i) => (
            <FarmPlot
              key={i}
              plotIndex={i}
              plot={plot}
              now={now}
              hasWorker={state.hasWorker}
              onPlantCrop={plantCrop}
              onHarvest={harvest}
            />
          ))}
        </div>

        <div className={styles.actions}>
          <div className={styles.btnRow}>
            {!state.hasWorker && (
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={hireFarmWorker}
                disabled={!canHireWorker}
                title={`Auto-harvests ripe crops after the same time they took to grow (${WORKER_HARVEST_GOLD} gold each)`}
              >
                Hire worker ({workerHireCost} gold)
              </button>
            )}
          </div>
        </div>

        <div className={styles.roadmap}>
          <p className={styles.roadmapTitle}>Coming later</p>
          <div className={styles.tracts}>
            <span className={`${styles.tract} ${styles.tractActive}`}>
              🌻 Farming
            </span>
            <span className={`${styles.tract} ${styles.tractSoon}`}>
              🛡️ Military (soon)
            </span>
            <span className={`${styles.tract} ${styles.tractSoon}`}>
              ✨ Arcane (soon)
            </span>
          </div>
        </div>
      </div>

      <p className={styles.footer}>
        Free to play, no ads — progress saves in this browser.
      </p>
    </main>
  );
}
