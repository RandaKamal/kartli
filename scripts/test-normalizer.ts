import { normalizeStoreName, reconcileReceiptLines, parseReceiptNumber } from "../lib/receipt-normalizer";

function assertEqual(actual: any, expected: any, msg: string) {
  if (actual !== expected) {
    console.error(`FAILED: ${msg} -> expected ${expected}, got ${actual}`);
    process.exit(1);
  } else {
    console.log(`PASSED: ${msg}`);
  }
}

// 1. Store name tests
assertEqual(normalizeStoreName("EDEMA"), "EDEKA", "EDEMA -> EDEKA");
assertEqual(normalizeStoreName("edema"), "EDEKA", "edema -> EDEKA");
assertEqual(normalizeStoreName("EDEKA Niemerszein"), "EDEKA", "EDEKA Niemerszein -> EDEKA");
assertEqual(normalizeStoreName("REWE Markt GmbH"), "REWE", "REWE Markt GmbH -> REWE");
assertEqual(normalizeStoreName("REVE"), "REWE", "REVE -> REWE");
assertEqual(normalizeStoreName("ALDI SÜD"), "ALDI Süd", "ALDI SÜD -> ALDI Süd");
assertEqual(normalizeStoreName("ALDI NORD"), "ALDI Nord", "ALDI NORD -> ALDI Nord");
assertEqual(normalizeStoreName("LID1"), "LIDL", "LID1 -> LIDL");
assertEqual(normalizeStoreName("L1DL"), "LIDL", "L1DL -> LIDL");
assertEqual(normalizeStoreName("Netto Marken-Discount"), "NETTO", "Netto Marken-Discount -> NETTO");
assertEqual(normalizeStoreName("dm-drogerie markt"), "dm", "dm-drogerie markt -> dm");
assertEqual(normalizeStoreName("Rossmann Drogeriemarkt"), "ROSSMANN", "Rossmann -> ROSSMANN");
assertEqual(normalizeStoreName("KAUFLANO"), "KAUFLAND", "KAUFLANO -> KAUFLAND");
assertEqual(normalizeStoreName("PENNI"), "PENNY", "PENNI -> PENNY");
assertEqual(normalizeStoreName("ALNATUR"), "ALNATURA", "ALNATUR -> ALNATURA");
assertEqual(normalizeStoreName("NORNA"), "NORMA", "NORNA -> NORMA");
assertEqual(normalizeStoreName("Bäckerei Schmid"), "Bäckerei Schmid", "Independent bakery preserved");
assertEqual(normalizeStoreName("Kebab Haus 24"), "Kebab Haus 24", "Independent kebab preserved");

// 2. Multi-quantity line reconciliation
const multiLine = reconcileReceiptLines([
  { raw_name: "Zwiebeln", quantity: 2, unit_price: 1.29, line_total: 2.58 },
], 2.58);
assertEqual(multiLine.lines[0].quantity, 2, "Qty 2 preserved");
assertEqual(multiLine.lines[0].unit_price, 1.29, "UnitPrice 1.29 preserved");
assertEqual(multiLine.lines[0].line_total, 2.58, "LineTotal 2.58 preserved");
assertEqual(multiLine.lines[0].price, 2.58, "Price equals line_total 2.58");
assertEqual(multiLine.isBalanced, true, "Balanced sum");

// 3. Swapped unit_price / line_total bug fix
const invertedLine = reconcileReceiptLines([
  { raw_name: "Äpfel", quantity: 3, unit_price: 4.50, line_total: 1.50 },
], 4.50);
assertEqual(invertedLine.lines[0].quantity, 3, "Qty 3 preserved");
assertEqual(invertedLine.lines[0].unit_price, 1.50, "Inverted unit_price swapped to 1.50");
assertEqual(invertedLine.lines[0].line_total, 4.50, "Inverted line_total swapped to 4.50");

// 4. Missing unit_price auto-calculated
const missingUnit = reconcileReceiptLines([
  { raw_name: "Bier", quantity: 4, unit_price: null, line_total: 4.80 },
], 4.80);
assertEqual(missingUnit.lines[0].unit_price, 1.20, "Auto-computed unit_price 1.20");

// 5. Pfand & Leergut
const pfand = reconcileReceiptLines([
  { raw_name: "Coca Cola", quantity: 1, unit_price: 1.49, line_total: 1.49 },
  { raw_name: "EINWEGPFAND", quantity: 1, unit_price: 0.25, line_total: 0.25 },
  { raw_name: "LEERGUT", quantity: 1, unit_price: 0.25, line_total: 0.25 },
], 1.49);
assertEqual(pfand.lines[1].line_total, 0.25, "Pfand is +0.25");
assertEqual(pfand.lines[2].line_total, -0.25, "Leergut is -0.25");
assertEqual(pfand.computedSum, 1.49, "Total sum balances to 1.49");
assertEqual(pfand.isBalanced, true, "Pfand receipt is balanced");

// 6. German number parsing
assertEqual(parseReceiptNumber("1,29 € A"), 1.29, "Parse '1,29 € A'");
assertEqual(parseReceiptNumber("-0,50 B"), -0.50, "Parse '-0,50 B'");
assertEqual(parseReceiptNumber("0,450"), 0.45, "Parse '0,450'");

// 7. Store brand inference (when header torn/missing)
import { inferStoreFromLineItems } from "../lib/receipt-normalizer";
assertEqual(
  inferStoreFromLineItems([
    { raw_name: "Kbio.Casheukerne" },
    { raw_name: "KBio.Haferflock" },
    { raw_name: "KLC.MR Schni" },
  ]),
  "KAUFLAND",
  "KBio / KLC items -> KAUFLAND"
);
assertEqual(
  inferStoreFromLineItems([
    { raw_name: "G&G HAE.GESCHNETZ" },
    { raw_name: "GUT & GÜNSTIG MILCH" },
  ]),
  "EDEKA",
  "G&G / Gut & Günstig items -> EDEKA"
);
assertEqual(
  normalizeStoreName("Supermarket", [
    { raw_name: "Kbio.Casheukerne" },
    { raw_name: "KBio.Haferflock" },
  ]),
  "KAUFLAND",
  "Generic Supermarket normalized to KAUFLAND via private label items"
);

console.log("\nALL TEST CASES PASSED SUCCESSFULLY!");
