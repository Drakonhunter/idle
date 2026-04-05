"use client";

import type { ArcanePathId, GameState } from "@/lib/game/types";
import {
  ARCANE_ENCHANTED_DROP_CHANCE,
  ARCANE_WIZARD_RETURN_COST,
} from "@/lib/game/types";
import { arcaneTractUnlocked, canShowWizardOffer } from "@/lib/game/arcane";
import styles from "./ArcaneTractPanel.module.css";

const PATH_COPY: Record<
  ArcanePathId,
  { title: string; description: string; emoji: string }
> = {
  growth: {
    emoji: "🌱",
    title: "Hastened soil",
    description: "Carrots grow 10% faster on every field.",
  },
  saleGold: {
    emoji: "🪙",
    title: "Golden market",
    description: "10% more gold from every carrot sale (you and your hands).",
  },
  cheaperWages: {
    emoji: "🧑‍🌾",
    title: "Fairer ledgers",
    description: "10% less gold paid in field-hand wages per carrot they sell.",
  },
};

type Props = {
  state: GameState;
  onOpenWizardReturn: () => void;
  onSpendEnchanted: (path: ArcanePathId) => void;
};

export function ArcaneTractPanel({
  state,
  onOpenWizardReturn,
  onSpendEnchanted,
}: Props) {
  const unlocked = arcaneTractUnlocked(state);
  const a = state.arcane;
  const showReturnCta =
    a.wizardOfferDismissed && !unlocked && !canShowWizardOffer(state);
  const dropPct = Math.round(ARCANE_ENCHANTED_DROP_CHANCE * 100);

  return (
    <div className={styles.wrap}>
      <p className={styles.sectionKicker}>Arcane tract</p>
      {!unlocked ? (
        <div className={styles.locked}>
          <p className={styles.lockedBody}>
            {showReturnCta
              ? "The wizard will still help — for a price — if you open his offer again."
              : "Grow 25 carrots to meet a wandering wizard who senses magic in your soil."}
          </p>
          {showReturnCta ? (
            <button type="button" className={styles.btnWizard} onClick={onOpenWizardReturn}>
              Summon the wizard ({ARCANE_WIZARD_RETURN_COST} gold)
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className={styles.statusCard}>
            <p className={styles.statusLine}>
              <span className={styles.sparkle} aria-hidden>
                ✨
              </span>
              Enchanted carrots in vault:{" "}
              <strong>{a.enchantedCarrotsInventory}</strong>
            </p>
            {a.enchantedHarvestUnlocked ? (
              <p className={styles.statusHint}>
                Each carrot harvest has a {dropPct}% chance to yield an enchanted carrot (manual
                or field hand).
              </p>
            ) : null}
          </div>
          <p className={styles.pathsTitle}>Spend your first enchanted carrot</p>
          <p className={styles.pathsSub}>
            Choose one branch for now — the others will wait for future growth.
          </p>
          <ul className={styles.pathList}>
            {(Object.keys(PATH_COPY) as ArcanePathId[]).map((id) => {
              const info = PATH_COPY[id];
              const taken = a.pathUpgrades[id];
              const anyPathTaken = Object.values(a.pathUpgrades).some(Boolean);
              const canBuy =
                a.enchantedCarrotsInventory >= 1 && !taken && !anyPathTaken;
              const lockedOther = anyPathTaken && !taken;
              return (
                <li key={id} className={styles.pathCard}>
                  <div className={styles.pathHead}>
                    <span className={styles.pathEmoji} aria-hidden>
                      {info.emoji}
                    </span>
                    <span className={styles.pathTitle}>{info.title}</span>
                  </div>
                  <p className={styles.pathDesc}>{info.description}</p>
                  {taken ? (
                    <span className={styles.badgeActive}>Active</span>
                  ) : lockedOther ? (
                    <span className={styles.badgeLocked}>Locked for now — branches later</span>
                  ) : (
                    <button
                      type="button"
                      className={styles.btnPath}
                      disabled={!canBuy}
                      onClick={() => onSpendEnchanted(id)}
                    >
                      Unlock (1 enchanted carrot)
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
