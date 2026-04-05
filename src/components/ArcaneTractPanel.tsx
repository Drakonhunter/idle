"use client";

import { useState } from "react";
import type { ArcanePathId, GameState } from "@/lib/game/types";
import {
  ARCANE_ENCHANTED_DROP_CHANCE,
  ARCANE_WIZARD_RETURN_COST,
} from "@/lib/game/types";
import { arcaneTractUnlocked, canShowWizardOffer } from "@/lib/game/arcane";
import styles from "./ArcaneTractPanel.module.css";

const TREES: {
  id: ArcanePathId;
  tabLabel: string;
  tabEmoji: string;
  treeTitle: string;
  root: { title: string; description: string; emoji: string };
}[] = [
  {
    id: "growth",
    tabLabel: "Growth",
    tabEmoji: "🌱",
    treeTitle: "Hastened soil",
    root: {
      emoji: "🌱",
      title: "Quick roots",
      description: "Carrots grow 10% faster on every field.",
    },
  },
  {
    id: "saleGold",
    tabLabel: "Gold",
    tabEmoji: "🪙",
    treeTitle: "Golden market",
    root: {
      emoji: "🪙",
      title: "Shrewd haggling",
      description: "10% more gold from every carrot sale (you and your hands).",
    },
  },
  {
    id: "cheaperWages",
    tabLabel: "Ledgers",
    tabEmoji: "🧑‍🌾",
    treeTitle: "Fair ledgers",
    root: {
      emoji: "🧑‍🌾",
      title: "Leaner payroll",
      description:
        "Field-hand wages in the ledger are 10% less per carrot sold (5 → 4.5 gold); stats round whole numbers for display.",
    },
  },
];

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
  const [activeTree, setActiveTree] = useState<ArcanePathId>("growth");
  const unlocked = arcaneTractUnlocked(state);
  const a = state.arcane;
  const showReturnCta =
    a.wizardOfferDismissed && !unlocked && !canShowWizardOffer(state);
  const dropPct = Math.round(ARCANE_ENCHANTED_DROP_CHANCE * 100);
  const tree = TREES.find((t) => t.id === activeTree) ?? TREES[0];
  const rootUnlocked = a.pathUpgrades[tree.id];
  const canBuyRoot = a.enchantedCarrotsInventory >= 1 && !rootUnlocked;

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
                Every carrot harvest still rolls a {dropPct}% chance for an enchanted carrot — manual
                or field hand — even after all tree roots are unlocked. Rolls are independent, so dry
                spells are normal. Spend extras in future tree tiers.
              </p>
            ) : null}
          </div>

          <p className={styles.treesIntro}>Three arcane trees — each branch grows over time.</p>

          <div
            className={styles.tabBar}
            role="tablist"
            aria-label="Arcane upgrade trees"
          >
            {TREES.map((t) => {
              const hasRoot = a.pathUpgrades[t.id];
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`arcane-tab-${t.id}`}
                  aria-selected={activeTree === t.id}
                  aria-controls={`arcane-panel-${t.id}`}
                  className={`${styles.tab} ${activeTree === t.id ? styles.tabActive : ""}`}
                  onClick={() => setActiveTree(t.id)}
                >
                  <span className={styles.tabEmoji} aria-hidden>
                    {t.tabEmoji}
                  </span>
                  <span className={styles.tabLabel}>{t.tabLabel}</span>
                  {hasRoot ? (
                    <span className={styles.tabDot} title="Root unlocked" aria-hidden>
                      ●
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`arcane-panel-${tree.id}`}
            aria-labelledby={`arcane-tab-${tree.id}`}
            className={styles.treePanel}
          >
            <h3 className={styles.treeTitle}>{tree.treeTitle}</h3>
            <p className={styles.treeTierLabel}>Tier 1 — root</p>
            <div className={styles.treeCanvas}>
              <div className={styles.nodeStem} aria-hidden />
              <div className={styles.nodeCard}>
                <div className={styles.pathHead}>
                  <span className={styles.pathEmoji} aria-hidden>
                    {tree.root.emoji}
                  </span>
                  <span className={styles.pathTitle}>{tree.root.title}</span>
                </div>
                <p className={styles.pathDesc}>{tree.root.description}</p>
                {rootUnlocked ? (
                  <span className={styles.badgeActive}>Unlocked</span>
                ) : (
                  <button
                    type="button"
                    className={styles.btnPath}
                    disabled={!canBuyRoot}
                    onClick={() => onSpendEnchanted(tree.id)}
                  >
                    Unlock (1 enchanted carrot)
                  </button>
                )}
              </div>
              <p className={styles.futureHint}>Further nodes on this tree will arrive in a later update.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
