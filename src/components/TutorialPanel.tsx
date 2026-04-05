"use client";

import styles from "./TutorialPanel.module.css";

type Props = {
  onNext: () => void;
};

export function TutorialOneParcelPanel({ onNext }: Props) {
  return (
    <div className={styles.wrap} role="region" aria-label="Tutorial: your first field">
      <p className={styles.kicker}>Look at your farm</p>
      <h3 className={styles.title}>One parcel to rule (for now)</h3>
      <p className={styles.body}>
        That glowing square is your kingdom&apos;s very first field — your starter parcel. Treasure it,
        name it in your heart, then let&apos;s teach it to grow snacks.
      </p>
      <button type="button" className={styles.btn} onClick={onNext}>
        Next
      </button>
    </div>
  );
}
