"use client";

import { FarmPlot } from "@/components/FarmPlot";
import { useIdleGame } from "@/hooks/useIdleGame";
import { PLANT_SEED_COST } from "@/lib/game/types";
import styles from "./page.module.css";

export default function Home() {
  const {
    state,
    now,
    plant,
    harvest,
    buyNextPlot,
    nextPlotCost,
    fieldWork,
    fieldWorkReady,
    fieldWorkCooldownMs,
  } = useIdleGame();

  if (!state) {
    return <p className={styles.loading}>Loading your tiny kingdom…</p>;
  }

  const canPlant = state.seeds >= PLANT_SEED_COST;
  const canBuyPlot = state.gold >= nextPlotCost;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Tiny Kingdom Idle</h1>
        <p className={styles.tagline}>
          Farm gold &amp; seeds — play in bursts or let crops grow while you
          wander off.
        </p>
      </header>

      <div className={styles.panel}>
        <div className={styles.resources} role="status">
          <span className={`${styles.pill} ${styles.pillGold}`}>
            <span aria-hidden>🪙</span>
            <span>{Math.floor(state.gold)} gold</span>
          </span>
          <span className={`${styles.pill} ${styles.pillSeed}`}>
            <span aria-hidden>🌾</span>
            <span>{state.seeds} seeds</span>
          </span>
        </div>

        <h2 className={styles.sectionTitle}>Your farm</h2>
        <div className={styles.plotGrid}>
          {state.plots.map((plot, i) => (
            <FarmPlot
              key={i}
              plotIndex={i}
              plot={plot}
              now={now}
              canPlant={canPlant}
              onPlant={plant}
              onHarvest={harvest}
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
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={fieldWork}
              disabled={!fieldWorkReady}
              title={`Bonus gold every ${fieldWorkCooldownMs / 1000}s while active`}
            >
              Field work (+1 gold)
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
