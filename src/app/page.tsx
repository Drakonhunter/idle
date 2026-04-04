"use client";

import { FarmPlot } from "@/components/FarmPlot";
import { useIdleGame } from "@/hooks/useIdleGame";
import { MANUAL_HARVEST_GOLD, WORKER_HARVEST_GOLD } from "@/lib/game/types";
import styles from "./page.module.css";

export default function Home() {
  const {
    state,
    now,
    harvest,
    buyNextPlot,
    hireWorkerOnPlot,
    nextPlotCost,
    nextWorkerCost,
    canBuyPlot,
    canAffordNextWorker,
  } = useIdleGame();

  if (!state) {
    return <p className={styles.loading}>Loading your tiny kingdom…</p>;
  }

  const hiredHands = state.plotWorkers.filter(Boolean).length;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Tiny Kingdom Idle</h1>
        <p className={styles.tagline}>
          Each field remembers its crop — tap to harvest for{" "}
          {MANUAL_HARVEST_GOLD} gold, or tap the + icon to hire a hand for{" "}
          {WORKER_HARVEST_GOLD} gold per auto harvest (pricier each hire).
        </p>
      </header>

      <div className={styles.panel}>
        <div className={styles.resources} role="status">
          <span className={`${styles.pill} ${styles.pillGold}`}>
            <span aria-hidden>🪙</span>
            <span>{Math.floor(state.gold)} gold</span>
          </span>
          {hiredHands > 0 && (
            <span className={`${styles.pill} ${styles.pillWorker}`}>
              <span aria-hidden>🧑‍🌾</span>
              <span>
                {hiredHands} field hand{hiredHands === 1 ? "" : "s"}
              </span>
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
              selectedCrop={state.plotSelectedCrops[i] ?? "carrot"}
              hasWorker={state.plotWorkers[i] ?? false}
              workerHireCost={nextWorkerCost}
              canAffordWorker={canAffordNextWorker}
              onHarvest={harvest}
              onHireWorker={hireWorkerOnPlot}
            />
          ))}
        </div>

        <div className={styles.actions}>
          <div className={styles.btnRow}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={buyNextPlot}
              disabled={!canBuyPlot}
            >
              Buy field ({nextPlotCost} gold)
            </button>
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
