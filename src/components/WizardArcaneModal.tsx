"use client";

import {
  ARCANE_WIZARD_RETURN_COST,
  type GameState,
} from "@/lib/game/types";
import { canPayWizardReturn } from "@/lib/game/arcane";
import styles from "./WizardArcaneModal.module.css";

type Props = {
  mode: "initial_offer" | "return_offer";
  state: GameState;
  onAcceptFree: () => void;
  onDismiss: () => void;
  onPayReturn: () => void;
};

export function WizardArcaneModal({
  mode,
  state,
  onAcceptFree,
  onDismiss,
  onPayReturn,
}: Props) {
  const canPay = canPayWizardReturn(state);
  const initial = mode === "initial_offer";

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-arcane-title"
    >
      <div className={styles.card}>
        <p className={styles.kicker}>A traveler at the gate</p>
        <h2 id="wizard-arcane-title" className={styles.title}>
          {initial ? "The arcane carrot-monger" : "The wizard returns"}
        </h2>
        <p className={styles.body}>
          {initial ? (
            <>
              Word has reached my tower that your soil hums with a faint, stubborn magic. I can
              help you cultivate <strong>enchanted carrots</strong> — rare, sparkling roots that
              hold real power for a ruler who knows what to do with them. May I lend you my craft?
            </>
          ) : (
            <>
              I am still willing to open the arcane path for you — my time is valuable, so the
              crown will owe me <strong>{ARCANE_WIZARD_RETURN_COST} gold</strong> if you refused me
              once and want my help now.
            </>
          )}
        </p>
        <div className={styles.btnCol}>
          {initial ? (
            <>
              <button type="button" className={styles.btnPrimary} onClick={onAcceptFree}>
                Yes, teach me the arcane harvest
              </button>
              <button type="button" className={styles.btnSecondary} onClick={onDismiss}>
                Not now
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={onPayReturn}
                disabled={!canPay}
              >
                Pay {ARCANE_WIZARD_RETURN_COST} gold for his help
              </button>
              {!canPay ? (
                <p className={styles.hint}>Save up — the treasury needs {ARCANE_WIZARD_RETURN_COST} gold.</p>
              ) : null}
              <button type="button" className={styles.btnSecondary} onClick={onDismiss}>
                Maybe later
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
