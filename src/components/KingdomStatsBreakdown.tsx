"use client";

import type { ReactNode } from "react";
import type { KingdomStatsBreakdown } from "@/lib/game/statsBreakdown";
import styles from "./KingdomStatsBreakdown.module.css";

type Props = {
  b: KingdomStatsBreakdown;
  displayWholeGold: (n: number) => number;
};

function Eq({ children }: { children: ReactNode }) {
  return <code className={styles.eq}>{children}</code>;
}

export function KingdomStatsBreakdownView({ b, displayWholeGold }: Props) {
  const { timing, manualGold, workerRemit, wages, enchanted, aggregates } = b;

  return (
    <div className={styles.wrap}>
      <section className={styles.section} aria-labelledby="bd-timing">
        <h3 id="bd-timing" className={styles.h3}>
          Timing (carrots)
        </h3>
        <p className={styles.p}>
          <strong>Base grow time</strong> (plant → ripe):{" "}
          <Eq>{timing.baseGrowMs.toLocaleString()} ms</Eq>
        </p>
        <p className={styles.p}>
          <strong>Modifier:</strong>{" "}
          {timing.hasGrowthUpgrade
            ? "Hastened soil −10% (rounded to integer ms)"
            : "None"}
        </p>
        <p className={styles.p}>
          <strong>Equation:</strong> <Eq>{timing.growthEquation}</Eq>
        </p>
        <p className={styles.p}>
          <strong>Effective grow time:</strong>{" "}
          <Eq>{timing.effectiveGrowDisplay}</Eq>
        </p>
        <p className={styles.pMuted}>{timing.workerHarvestNote}</p>
        <p className={styles.p}>
          <strong>Field-hand harvest time</strong> (ripe → hand finishes):{" "}
          <Eq>{timing.workerHarvestEquation}</Eq>
        </p>
        <p className={styles.pMuted}>
          Manual harvest is instant when you click a ripe field; only workers wait the extra cycle.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="bd-gold">
        <h3 id="bd-gold" className={styles.h3}>
          Gold per carrot (before aggregates)
        </h3>
        <p className={styles.p}>
          <strong>Your harvest</strong> — base <Eq>{manualGold.base}g</Eq>,{" "}
          <span className={styles.mod}>{manualGold.multLabel}</span>
        </p>
        <p className={styles.p}>
          <Eq>{manualGold.equation}</Eq> → <strong>{manualGold.result}g</strong> to treasury each
        </p>
        <p className={styles.p}>
          <strong>Worker remit</strong> — base <Eq>{workerRemit.base}g</Eq>,{" "}
          <span className={styles.mod}>{workerRemit.multLabel}</span>
        </p>
        <p className={styles.p}>
          <Eq>{workerRemit.equation}</Eq> → <strong>{workerRemit.result}g</strong> to treasury each
        </p>
        <p className={styles.p}>
          <strong>Wage ledger</strong> — base <Eq>{wages.base}g</Eq> per worker-sold carrot
          {wages.hasDiscount ? ", Fair ledgers ×0.9 (then round2)" : ""}
        </p>
        <p className={styles.p}>
          <Eq>{wages.equation}</Eq> → <strong>{wages.result}g</strong> accrued per worker carrot
        </p>
      </section>

      <section className={styles.section} aria-labelledby="bd-ench">
        <h3 id="bd-ench" className={styles.h3}>
          Enchanted carrots
        </h3>
        <p className={styles.p}>
          <strong>Harvest unlocked:</strong> {enchanted.harvestUnlocked ? "Yes" : "No"}
        </p>
        {enchanted.harvestUnlocked ? (
          <>
            <p className={styles.p}>
              <strong>Random drop chance:</strong>{" "}
              <Eq>{enchanted.dropChancePct}%</Eq> per carrot harvest (after any guarantee)
            </p>
            <p className={styles.p}>
              <strong>Guaranteed next:</strong> {enchanted.nextHarvestGuaranteed ? "Yes" : "No"}
            </p>
            <p className={styles.pMuted}>{enchanted.dropEquation}</p>
          </>
        ) : null}
      </section>

      <section className={styles.section} aria-labelledby="bd-agg">
        <h3 id="bd-agg" className={styles.h3}>
          Kingdom stats (your totals)
        </h3>
        <p className={styles.p}>
          <strong>Gross gold from carrot sales</strong> (unrounded sum, display rounded below)
        </p>
        <p className={styles.p}>
          <Eq>{aggregates.grossEquation}</Eq> = <strong>{aggregates.grossValue}g</strong> → display{" "}
          <strong>{displayWholeGold(aggregates.grossValue)}g</strong>
        </p>
        <p className={styles.p}>
          <strong>Total wages paid</strong> (ledger, 2dp in save)
        </p>
        <p className={styles.p}>
          <Eq>{aggregates.wagesEquation}</Eq>
        </p>
        <p className={styles.p}>
          <strong>Profit (carrots)</strong>
        </p>
        <p className={styles.p}>
          <Eq>{aggregates.profitEquation}</Eq> = <strong>{aggregates.profitValue}g</strong> → display{" "}
          <strong>{displayWholeGold(aggregates.profitValue)}g</strong>
        </p>
      </section>
    </div>
  );
}
