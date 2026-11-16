#!/usr/bin/env npx tsx
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import puppeteer from "puppeteer";
import {
  extractReceiptData,
  extractWithGemini,
  GEMINI_CASCADE_CONFIG,
} from "../lib/receipt-extractor";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const envPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(envPath)) {
      for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          const val = (match[2] || "").replace(/^['"](.*)['"]$/, "$1").trim();
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  }
}

async function createSyntheticReceiptPng(): Promise<Buffer> {
  const executablePath = fs.existsSync("/usr/bin/google-chrome")
    ? "/usr/bin/google-chrome"
    : undefined;
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 520, height: 680, deviceScaleFactor: 2 });
    await page.setContent(`
      <html>
        <body style="margin:0;padding:28px;background:#fff;color:#111;font-family:'Courier New',monospace;font-size:16px;line-height:1.5;">
          <div style="text-align:center;font-weight:bold;font-size:22px;margin-bottom:4px;">EDEKA</div>
          <div style="text-align:center;font-size:13px;margin-bottom:16px;">Musterstraße 12 · 10115 Berlin</div>
          <div style="border-top:1px dashed #333;border-bottom:1px dashed #333;padding:10px 0;margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;"><span>BIO VOLLMILCH 3,8%</span><span>1,49 A</span></div>
            <div style="display:flex;justify-content:space-between;"><span>ZWIEBELN 2 x 1,29</span><span>2,58 A</span></div>
            <div style="display:flex;justify-content:space-between;"><span>PFAND EINWEG</span><span>0,25 B</span></div>
            <div style="display:flex;justify-content:space-between;"><span>BUTTER MILDE</span><span>1,99 A</span></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:19px;">
            <span>SUMME EUR</span>
            <span>6,31</span>
          </div>
          <div style="margin-top:14px;font-size:12px;">Datum: 16.11.2026</div>
        </body>
      </html>
    `);
    const screenshot = await page.screenshot({ type: "png" });
    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}

async function main() {
  loadEnv();
  const apiKey = process.env.GEMINI_API_KEY;
  assert.ok(apiKey, "GEMINI_API_KEY must be set in .env or .env.local");

  console.log("1. Generating synthetic German supermarket receipt PNG...");
  const receiptBuffer = await createSyntheticReceiptPng();
  console.log(`   Generated synthetic receipt (${(receiptBuffer.length / 1024).toFixed(1)} KB)`);

  console.log("\n2. Testing full live extractReceiptData() cascade...");
  const liveResult = await extractReceiptData(receiptBuffer, "image/png", {
    geminiApiKey: apiKey,
    stagedItems: [
      { id: "item-1", name: "Milch" },
      { id: "item-2", name: "Butter" },
    ],
  });
  console.log(`   ✅ Provider: ${liveResult.usedProvider}`);
  console.log(`   ✅ Store: ${liveResult.storeName}, Total: ${liveResult.totalReceiptAmount} ${liveResult.currency}`);
  console.log(`   ✅ Lines: ${liveResult.lines.length}, Balanced: ${liveResult.reconciliation.isBalanced}`);
  assert.equal(liveResult.storeName, "EDEKA");
  assert.equal(liveResult.currency, "EUR");
  assert.ok(Math.abs(liveResult.totalReceiptAmount - 6.31) <= 0.02, `Expected ~6.31, got ${liveResult.totalReceiptAmount}`);
  assert.ok(liveResult.lines.length >= 4, `Expected >=4 lines, got ${liveResult.lines.length}`);

  console.log("\n3. Verifying live fallback when primary models fail (503 + Timeout -> live fallback)...");
  let calls: string[] = [];
  const fallbackResult = await extractReceiptData(receiptBuffer, "image/png", {
    geminiApiKey: apiKey,
    stagedItems: [{ id: "item-1", name: "Milch" }],
    generateFn: async (key, model, prompt, mimeType, base64, signal) => {
      calls.push(model);
      if (model === GEMINI_CASCADE_CONFIG[0].model) {
        const err: any = new Error("[503 Service Unavailable] UNAVAILABLE");
        err.status = 503;
        throw err;
      }
      if (model === GEMINI_CASCADE_CONFIG[1].model) {
        const err = new Error("The operation was aborted due to timeout");
        err.name = "TimeoutError";
        throw err;
      }
      return extractWithGemini(key, model, prompt, mimeType, base64, signal);
    },
  });
  console.log(`   ✅ Cascade sequence: ${calls.join(" -> ")}`);
  console.log(`   ✅ Succeeded via: ${fallbackResult.usedProvider} (Total: ${fallbackResult.totalReceiptAmount})`);
  assert.deepEqual(calls, [
    GEMINI_CASCADE_CONFIG[0].model,
    GEMINI_CASCADE_CONFIG[1].model,
    GEMINI_CASCADE_CONFIG[2].model,
  ]);
  assert.equal(fallbackResult.usedProvider, `gemini:${GEMINI_CASCADE_CONFIG[2].model}`);
  assert.ok(Math.abs(fallbackResult.totalReceiptAmount - 6.31) <= 0.02);

  console.log("\n4. Verifying immediate skip on 404 Not Found -> live fallback...");
  calls = [];
  const skip404Result = await extractReceiptData(receiptBuffer, "image/png", {
    geminiApiKey: apiKey,
    generateFn: async (key, model, prompt, mimeType, base64, signal) => {
      calls.push(model);
      if (model === GEMINI_CASCADE_CONFIG[0].model) {
        const err: any = new Error("[404 Not Found] models/test is not found");
        err.status = 404;
        throw err;
      }
      return extractWithGemini(key, model, prompt, mimeType, base64, signal);
    },
  });
  console.log(`   ✅ 404 skipped -> succeeded via: ${skip404Result.usedProvider}`);
  assert.equal(skip404Result.usedProvider, `gemini:${GEMINI_CASCADE_CONFIG[1].model}`);

  console.log("\n5. Verifying timeout vs overload error classification (no false overload on timeouts)...");
  await assert.rejects(
    () =>
      extractReceiptData(receiptBuffer, "image/png", {
        geminiApiKey: apiKey,
        generateFn: async () => {
          const err = new Error("The operation was aborted due to timeout");
          err.name = "TimeoutError";
          throw err;
        },
      }),
    (err: any) => {
      assert.equal(err.errorCategory, "timeout");
      assert.ok(!err.message.includes("überlastet"), "Timeout error must not claim overload");
      return true;
    }
  );
  console.log("   ✅ Timeout classification verified (no false overload)");

  await assert.rejects(
    () =>
      extractReceiptData(receiptBuffer, "image/png", {
        geminiApiKey: apiKey,
        generateFn: async () => {
          const err: any = new Error("[503 Service Unavailable] UNAVAILABLE");
          err.status = 503;
          throw err;
        },
      }),
    (err: any) => {
      assert.equal(err.errorCategory, "overload");
      assert.ok(err.message.includes("überlastet"));
      return true;
    }
  );
  console.log("   ✅ 503 overload classification verified");

  console.log("\nALL GEMINI CASCADE VERIFICATION CHECKS PASSED!");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
