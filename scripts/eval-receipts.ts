#!/usr/bin/env npx tsx
import fs from "node:fs";
import path from "node:path";
import { extractReceiptData } from "../lib/receipt-extractor";

// Load .env if not loaded
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || "";
        val = val.replace(/^['"](.*)['"]$/, "$1").trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const RECEIPTS_DIR = path.resolve(process.cwd(), "receipts");

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".heic":
      return "image/heic";
    default:
      return "image/jpeg";
  }
}

async function runEval() {
  console.log("================================================================================");
  console.log("           DACH SUPERMARKET RECEIPT OCR EVALUATION HARNESS                      ");
  console.log("================================================================================\n");

  if (!fs.existsSync(RECEIPTS_DIR)) {
    console.error(`Error: Directory "${RECEIPTS_DIR}" does not exist.`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(RECEIPTS_DIR)
    .filter((f) => /\.(jpe?g|png|webp|heic)$/i.test(f))
    .sort();

  if (files.length === 0) {
    console.warn("⚠️  No receipt images found in ./receipts.");
    console.warn("Please place test receipt images (.jpg, .jpeg, .png) into ./receipts to run evaluation.");
    return;
  }

  console.log(`Found ${files.length} receipt image(s) in ./receipts:\n${files.map((f, i) => `  [${i + 1}] ${f}`).join("\n")}\n`);

  let totalReceiptsTested = 0;
  let totalReceiptsBalanced = 0;
  let totalLinesTested = 0;
  let totalMathErrors = 0;

  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    const filePath = path.join(RECEIPTS_DIR, file);
    const mimeType = getMimeType(file);
    const buffer = fs.readFileSync(filePath);

    console.log(`--------------------------------------------------------------------------------`);
    console.log(`Testing [${idx + 1}/${files.length}]: ${file} (${(buffer.length / 1024).toFixed(1)} KB)`);
    console.log(`--------------------------------------------------------------------------------`);

    const start = Date.now();
    try {
      const result = await extractReceiptData(buffer, mimeType);
      const elapsed = Date.now() - start;

      totalReceiptsTested++;
      if (result.reconciliation.isBalanced) {
        totalReceiptsBalanced++;
      }

      console.log(`Provider:    ${result.usedProvider} (${elapsed}ms)`);
      console.log(`Store:       ${result.storeName} (Raw extracted: "${result.rawStoreName}")`);
      console.log(`Date:        ${result.date || "N/A"}`);
      console.log(`Currency:    ${result.currency}`);
      console.log(`Printed Sum: ${result.totalReceiptAmount.toFixed(2)} ${result.currency}`);
      console.log(`Items Sum:   ${result.reconciliation.computedSum.toFixed(2)} ${result.currency}`);
      console.log(
        `Balance:     ${result.reconciliation.isBalanced ? "✅ BALANCED (Difference: 0.00 €)" : `❌ MISMATCH (${result.reconciliation.difference.toFixed(2)} €)`}`
      );

      console.log("\nExtracted Line Items:");
      console.log(
        " # | " +
        "Raw Name".padEnd(30) + " | " +
        "Qty".padStart(4) + " | " +
        "Unit Price".padStart(10) + " | " +
        "Line Total".padStart(10) + " | " +
        "Math Check"
      );
      console.log("-".repeat(80));

      result.lines.forEach((line, i) => {
        totalLinesTested++;
        const lineNum = String(i + 1).padStart(2);
        const name = (line.raw_name.length > 28 ? line.raw_name.slice(0, 27) + "…" : line.raw_name).padEnd(30);
        const qty = String(line.quantity).padStart(4);
        const unit = (line.unit_price !== null ? line.unit_price.toFixed(2) : "—").padStart(10);
        const total = line.line_total.toFixed(2).padStart(10);

        let mathCheck = "OK";
        if (line.quantity > 1 && line.unit_price !== null) {
          const expected = Math.round(line.quantity * line.unit_price * 100) / 100;
          if (Math.abs(expected - line.line_total) > 0.02) {
            mathCheck = `⚠️ MISMATCH (${expected.toFixed(2)} vs ${line.line_total.toFixed(2)})`;
            totalMathErrors++;
          } else {
            mathCheck = `✅ (${line.quantity} × ${line.unit_price.toFixed(2)} = ${line.line_total.toFixed(2)})`;
          }
        } else if (line.quantity === 1) {
          mathCheck = `✅ single`;
        }

        console.log(`${lineNum} | ${name} | ${qty} | ${unit} | ${total} | ${mathCheck}`);
      });

      if (result.reconciliation.warnings.length > 0) {
        console.log("\nWarnings / Notes:");
        result.reconciliation.warnings.forEach((w) => console.log(`  ⚠️  ${w}`));
      }
      console.log("\n");
    } catch (err: any) {
      console.error(`❌ Failed to extract ${file}:`, err.message || err);
      console.log("\n");
    }
  }

  console.log("================================================================================");
  console.log("                           EVALUATION SUMMARY                                   ");
  console.log("================================================================================");
  console.log(`Receipts tested:   ${totalReceiptsTested}`);
  console.log(
    `Balanced receipts: ${totalReceiptsBalanced}/${totalReceiptsTested} (${totalReceiptsTested > 0 ? ((totalReceiptsBalanced / totalReceiptsTested) * 100).toFixed(1) : 0}%)`
  );
  console.log(`Line items tested: ${totalLinesTested}`);
  console.log(`Math discrepancies:${totalMathErrors}`);
  console.log("================================================================================\n");
}

runEval().catch((err) => {
  console.error("Eval runner failed:", err);
  process.exit(1);
});
