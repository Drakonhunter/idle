"use client";

import styles from "./TutorialModal.module.css";

type Props = {
  screen: 1 | 2 | 3;
  onNext: () => void;
};

function copyForScreen(screen: 1 | 2 | 3): { kicker: string; title: string; body: string; btn: string } {
  switch (screen) {
    case 1:
      return {
        kicker: "The arcane opens",
        title: "Enchanted carrots",
        body:
          "You can now find enchanted carrots when you harvest normal carrots — by hand or with field hands. " +
          "Your very next carrot harvest is guaranteed to yield one. After that, each harvest has a small chance " +
          "for another. They are stored in your vault under Kingdom stats and in the Arcane tract below.",
        btn: "Next",
      };
    case 2:
      return {
        kicker: "Spend wisely",
        title: "Three trees",
        body:
          "Scroll to the Arcane tract at the bottom. Three tabs — Growth, Gold, and Ledgers — are three separate trees. " +
          "Each tree’s first node costs one enchanted carrot. Spend your first carrot on whichever root you want; " +
          "save more enchanted carrots to unlock the other trees later. Higher tiers on each tree will come later.",
        btn: "Next",
      };
    case 3:
      return {
        kicker: "You are set",
        title: "Harvest and choose",
        body:
          "Harvest a ripe carrot to claim your guaranteed enchanted carrot, then scroll to the Arcane tract, open a " +
          "tab (Growth, Gold, or Ledgers), and tap Unlock on one root. Each tree can only unlock its first node once — " +
          "pick the bonus you want to start with.",
        btn: "Got it",
      };
    default:
      return { kicker: "", title: "", body: "", btn: "Next" };
  }
}

export function ArcaneIntroModal({ screen, onNext }: Props) {
  const { kicker, title, body, btn } = copyForScreen(screen);

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="arcane-intro-title">
      <div className={styles.card}>
        <p className={styles.kicker}>{kicker}</p>
        <h2 id="arcane-intro-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.body}>{body}</p>
        <button type="button" className={styles.btn} onClick={onNext}>
          {btn}
        </button>
      </div>
    </div>
  );
}
