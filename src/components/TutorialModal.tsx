"use client";

import type { TutorialStep } from "@/lib/game/types";
import { isIntroModalStep } from "@/lib/game/tutorial";
import styles from "./TutorialModal.module.css";

type Props = {
  step: TutorialStep;
  onNext: () => void;
};

function copyForStep(step: TutorialStep): { kicker: string; title: string; body: string } {
  switch (step) {
    case "welcome":
      return {
        kicker: "Welcome, your majesty",
        title: "Your tiny kingdom awaits!",
        body:
          "You rule a cozy little realm with big dreams. Grow your lands, keep your people safe, " +
          "and who knows — maybe you will peek at something sparkly and arcane along the way. " +
          "No pressure… okay, a little pressure. You have got this!",
      };
    case "crop_menu_intro":
      return {
        kicker: "Planting time",
        title: "Pick what to grow",
        body:
          "Tap the little ⋯ button on your field to open the crop menu. For now carrots are your only " +
          "option — more crops will appear as you unlock them. Choose carrots and let the magic soil do its thing!",
      };
    default:
      return { kicker: "", title: "", body: "" };
  }
}

export function TutorialModal({ step, onNext }: Props) {
  if (!isIntroModalStep(step)) return null;
  const { kicker, title, body } = copyForStep(step);
  if (!title) return null;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className={styles.card}>
        <p className={styles.kicker}>{kicker}</p>
        <h2 id="tutorial-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.body}>{body}</p>
        <button type="button" className={styles.btn} onClick={onNext}>
          Next
        </button>
      </div>
    </div>
  );
}
