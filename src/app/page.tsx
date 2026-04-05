"use client";

import { useState } from "react";
import { ArcaneTractPanel } from "@/components/ArcaneTractPanel";
import { FarmPlot } from "@/components/FarmPlot";
import { TutorialModal } from "@/components/TutorialModal";
import { TutorialOneParcelPanel } from "@/components/TutorialPanel";
import { WizardArcaneModal } from "@/components/WizardArcaneModal";
import { useIdleGame } from "@/hooks/useIdleGame";
import {
  arcaneTractUnlocked,
  canShowWizardOffer,
  manualCarrotHarvestGold,
  workerCarrotHarvestGold,
  workerCarrotWageAmount,
} from "@/lib/game/arcane";
import {
  plotInteraction,
  tutorialUiLock,
} from "@/lib/game/tutorialInteraction";
import type { TutorialStep } from "@/lib/game/types";
import { WORKER_WAGE_PER_CARROT } from "@/lib/game/types";
import styles from "./page.module.css";

function tutorialBanner(step: TutorialStep): { title: string; body: string } | null {
  switch (step) {
    case "open_crop_menu":
      return {
        title: "Plant something tasty",
        body:
          "Tap the ⋯ on your field (it is wiggling!) and pick carrots. " +
          "That is your only crop for now — more choices unlock later.",
      };
    case "harvest_for_land":
      return {
        title: "Harvest for gold",
        body:
          "Wait for the carrots to finish growing, then tap the field when it says you can harvest. " +
          "Each harvest adds gold to your treasury.",
      };
    case "buy_field":
      return {
        title: "Expand the realm",
        body:
          "You have saved enough for a second field! Tap “Buy field” below — " +
          "the button only wakes up when you can truly afford it.",
      };
    case "plant_second_field":
      return {
        title: "Two fields, twice the charm",
        body:
          "Your new parcel needs a crop too. Use ⋯ on the second field and plant carrots there as well.",
      };
    case "save_for_worker":
      return {
        title: "Dreamy field hands",
        body:
          "Keep farming! When you have enough gold, you can hire a helper who auto-harvests after each ripe crop. " +
          "Fair wages come out of each sale, so the treasury keeps a bit less per carrot than when you harvest yourself — " +
          "but hands never sleep. The + hire button stays sleepy until the treasury is ready.",
      };
    case "hire_worker":
      return {
        title: "Hire your first hand",
        body:
          "Tap the + on either field to hire the next available worker. Their fair wage is " +
          `${WORKER_WAGE_PER_CARROT} gold per carrot from the sale — so the crown still profits, just a little less than when you pick them yourself. ` +
          "They never get tired. Fancy!",
      };
    default:
      return null;
  }
}

export default function Home() {
  const [statsOpen, setStatsOpen] = useState(false);
  const [wizardModal, setWizardModal] = useState<"initial" | "return" | null>(
    null,
  );
  const {
    state,
    now,
    growMs,
    harvest,
    pickCropForPlot,
    buyNextPlot,
    hireWorkerOnPlot,
    nextPlotCost,
    nextWorkerCost,
    canBuyPlot,
    canAffordNextWorker,
    resetKingdom,
    tutorialNext,
    wizardAcceptFree,
    wizardDismissOffer,
    tryPayWizardReturn,
    spendEnchantedOnPath,
  } = useIdleGame();

  if (!state) {
    return <p className={styles.loading}>Loading your tiny kingdom…</p>;
  }

  const hiredHands = state.plotWorkers.filter(Boolean).length;
  const tut = state.tutorial;
  const banner = !tut.complete ? tutorialBanner(tut.step) : null;
  const highlightFirstPlot =
    !tut.complete &&
    (tut.step === "one_parcel" ||
      tut.step === "open_crop_menu" ||
      tut.step === "harvest_for_land");
  const highlightSecondPlot = !tut.complete && tut.step === "plant_second_field";
  const pulseCropOnPlot0 = !tut.complete && tut.step === "open_crop_menu";
  const pulseHireOnPlot0 =
    !tut.complete && tut.step === "hire_worker" && canAffordNextWorker;
  const pulseHireOnPlot1 =
    !tut.complete && tut.step === "hire_worker" && canAffordNextWorker;
  const pulseBuyField = !tut.complete && tut.step === "buy_field" && canBuyPlot;
  const uiLock = tutorialUiLock(tut.step, tut.complete);
  const buyFieldDisabled = !canBuyPlot || (!tut.complete && !uiLock.allowBuyField);

  const {
    manualCarrotsTotal,
    workerCarrotsTotal,
    workerWagesTotalPaid,
    enchantedCarrotsTotal,
  } = state.stats;
  const totalCarrots = manualCarrotsTotal + workerCarrotsTotal;
  const manualGoldEach = manualCarrotHarvestGold(state);
  const workerGoldEach = workerCarrotHarvestGold(state);
  const grossGoldFromCarrots =
    manualCarrotsTotal * manualGoldEach + workerCarrotsTotal * workerGoldEach;
  const profitGoldFromCarrots = grossGoldFromCarrots - workerWagesTotalPaid;
  const arcaneOpen = arcaneTractUnlocked(state);
  const showWizardInitialModal =
    tut.complete &&
    wizardModal !== "return" &&
    wizardModal == null &&
    canShowWizardOffer(state);

  return (
    <main className={styles.page}>
      {!tut.complete ? (
        <TutorialModal step={tut.step} onNext={tutorialNext} />
      ) : null}

      {showWizardInitialModal ? (
        <WizardArcaneModal
          mode="initial_offer"
          state={state}
          onAcceptFree={() => {
            wizardAcceptFree();
            setWizardModal(null);
          }}
          onDismiss={() => {
            wizardDismissOffer();
            setWizardModal(null);
          }}
          onPayReturn={() => {}}
        />
      ) : null}

      {tut.complete && wizardModal === "return" ? (
        <WizardArcaneModal
          mode="return_offer"
          state={state}
          onAcceptFree={() => {}}
          onDismiss={() => setWizardModal(null)}
          onPayReturn={() => {
            if (tryPayWizardReturn()) {
              setWizardModal(null);
            }
          }}
        />
      ) : null}

      <header className={styles.header} inert={!tut.complete ? true : undefined}>
        <h1 className={styles.title}>Tiny Kingdom Idle</h1>
        <p className={styles.tagline}>
          You are the ruler of a pocket-sized kingdom. Grow your fields, guard your borders, and
          maybe — just maybe — flirt with a little arcane mystery along the way.
        </p>
      </header>

      <div className={styles.panel}>
        <div className={styles.resources} role="status">
          <span className={`${styles.pill} ${styles.pillGold}`}>
            <span aria-hidden>🪙</span>
            <span>{Math.floor(state.gold)} gold</span>
          </span>
          {nextWorkerCost != null ? (
            <span
              className={`${styles.pill} ${styles.pillWorker}`}
              title={
                hiredHands > 0
                  ? `${hiredHands} field hand${hiredHands === 1 ? "" : "s"} hired`
                  : undefined
              }
            >
              <span aria-hidden>🧑‍🌾</span>
              <span>Next hand: {nextWorkerCost}g</span>
            </span>
          ) : hiredHands > 0 ? (
            <span className={`${styles.pill} ${styles.pillWorker}`}>
              <span aria-hidden>🧑‍🌾</span>
              <span>
                {hiredHands} hand{hiredHands === 1 ? "" : "s"} · full staff
              </span>
            </span>
          ) : null}
        </div>

        {tut.complete ? (
          <div className={styles.statsBlock}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary} ${styles.statsToggle}`}
              onClick={() => setStatsOpen((o) => !o)}
              aria-expanded={statsOpen}
            >
              {statsOpen ? "Hide kingdom stats" : "Kingdom stats"}
            </button>
            {statsOpen ? (
              <div className={styles.statsPanel} role="region" aria-label="Kingdom statistics">
                <p className={styles.statsHint}>
                  Your harvests pay {manualGoldEach} gold per carrot into the treasury. Field hands remit{" "}
                  {workerGoldEach} gold per carrot; the ledger records{" "}
                  {workerCarrotWageAmount(state)} gold in wages per worker-sold carrot. Arcane upgrades can change
                  these amounts.
                </p>
                <dl className={styles.statsGrid}>
                  <div className={styles.statsRow}>
                    <dt>Carrots you harvested</dt>
                    <dd>{manualCarrotsTotal}</dd>
                  </div>
                  <div className={styles.statsRow}>
                    <dt>Carrots field hands harvested</dt>
                    <dd>{workerCarrotsTotal}</dd>
                  </div>
                  <div className={styles.statsRow}>
                    <dt>Total carrots collected</dt>
                    <dd>{totalCarrots}</dd>
                  </div>
                  <div className={styles.statsRow}>
                    <dt>Gross gold from carrot sales</dt>
                    <dd>{grossGoldFromCarrots} gold</dd>
                  </div>
                  <div className={styles.statsRow}>
                    <dt>Total wages paid</dt>
                    <dd>{Math.floor(workerWagesTotalPaid)} gold</dd>
                  </div>
                  <div className={styles.statsRow}>
                    <dt>Profit to treasury (from carrots)</dt>
                    <dd>{Math.floor(profitGoldFromCarrots)} gold</dd>
                  </div>
                  {arcaneOpen ? (
                    <>
                      <div className={styles.statsRow}>
                        <dt>Enchanted carrots found (lifetime)</dt>
                        <dd>{enchantedCarrotsTotal}</dd>
                      </div>
                      <div className={styles.statsRow}>
                        <dt>Enchanted carrots in vault</dt>
                        <dd>{state.arcane.enchantedCarrotsInventory}</dd>
                      </div>
                    </>
                  ) : null}
                </dl>
              </div>
            ) : null}
          </div>
        ) : null}

        {tut.step === "one_parcel" ? <TutorialOneParcelPanel onNext={tutorialNext} /> : null}

        {banner ? (
          <div className={styles.tutorialBanner}>
            <strong>{banner.title}</strong>
            {banner.body}
          </div>
        ) : null}

        <div
          className={`${styles.farmLockRegion} ${styles.tutorialLockRegion}`}
        >
          <h2 className={styles.sectionTitle}>Your farm</h2>
          <div className={styles.plotGrid}>
            {state.plots.map((plot, i) => (
              <FarmPlot
                key={i}
                plotIndex={i}
                plot={plot}
                now={now}
                growMs={growMs}
                selectedCrop={state.plotSelectedCrops[i] ?? null}
                hasWorker={state.plotWorkers[i] ?? false}
                workerHireCost={nextWorkerCost}
                canAffordWorker={canAffordNextWorker}
                highlightPlot={
                  (i === 0 && highlightFirstPlot) ||
                  (i === 1 && highlightSecondPlot)
                }
                pulseCropButton={i === 0 && pulseCropOnPlot0}
                pulseHireButton={
                  (i === 0 && pulseHireOnPlot0) || (i === 1 && pulseHireOnPlot1)
                }
                interaction={plotInteraction(tut.step, tut.complete, i)}
                onHarvest={harvest}
                onHireWorker={hireWorkerOnPlot}
                onPickCrop={pickCropForPlot}
              />
            ))}
          </div>
          {uiLock.shieldPlotsAndTitle ? (
            <div
              className={styles.tutorialShield}
              aria-hidden
              onClick={(e) => e.preventDefault()}
            />
          ) : null}
        </div>

        <div className={`${styles.actions} ${styles.tutorialLockRegion}`}>
          <div className={styles.btnRow}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary} ${pulseBuyField ? styles.btnPulse : ""}`}
              onClick={buyNextPlot}
              disabled={buyFieldDisabled}
            >
              Buy field ({nextPlotCost} gold)
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnDanger}`}
              disabled={!uiLock.allowReset}
              onClick={() => {
                if (
                  typeof window !== "undefined" &&
                  !window.confirm(
                    "Reset the kingdom? This clears saved progress in this browser.",
                  )
                ) {
                  return;
                }
                resetKingdom();
              }}
              title="Clear save and start fresh (for testing)"
            >
              Reset kingdom
            </button>
          </div>
          {uiLock.shieldActionsRow ? (
            <div
              className={styles.tutorialShield}
              aria-hidden
              onClick={(e) => e.preventDefault()}
            />
          ) : null}
        </div>

        <div className={styles.roadmap} inert={!tut.complete ? true : undefined}>
          <p className={styles.roadmapTitle}>Realm paths</p>
          <div className={styles.tracts}>
            <span className={`${styles.tract} ${styles.tractActive}`}>
              🌻 Farming
            </span>
            <span className={`${styles.tract} ${styles.tractSoon}`}>
              🛡️ Military (soon)
            </span>
            <span
              className={`${styles.tract} ${arcaneOpen ? styles.tractArcane : styles.tractSoon}`}
            >
              {arcaneOpen ? "✨ Arcane" : "✨ Arcane (locked)"}
            </span>
          </div>
          {tut.complete ? (
            <ArcaneTractPanel
              state={state}
              onOpenWizardReturn={() => setWizardModal("return")}
              onSpendEnchanted={spendEnchantedOnPath}
            />
          ) : null}
        </div>
      </div>

      <p className={styles.footer} inert={!tut.complete ? true : undefined}>
        Free to play, no ads — progress saves in this browser.
      </p>
    </main>
  );
}
