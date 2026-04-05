"use client";

import { FarmPlot } from "@/components/FarmPlot";
import { TutorialModal } from "@/components/TutorialModal";
import { TutorialOneParcelPanel } from "@/components/TutorialPanel";
import { useIdleGame } from "@/hooks/useIdleGame";
import {
  plotInteraction,
  tutorialUiLock,
} from "@/lib/game/tutorialInteraction";
import type { TutorialStep } from "@/lib/game/types";
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
          "The + hire button stays sleepy until the treasury is ready.",
      };
    case "hire_worker":
      return {
        title: "Hire your first hand",
        body:
          "Tap the + on either field to hire the next available worker. They collect a little less gold per carrot than you do — " +
          "but they never get tired. Fancy!",
      };
    default:
      return null;
  }
}

export default function Home() {
  const {
    state,
    now,
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

  return (
    <main className={styles.page}>
      {!tut.complete ? (
        <TutorialModal step={tut.step} onNext={tutorialNext} />
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

      <p className={styles.footer} inert={!tut.complete ? true : undefined}>
        Free to play, no ads — progress saves in this browser.
      </p>
    </main>
  );
}
