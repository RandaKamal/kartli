#!/usr/bin/env node
/**
 * generate-assets.mjs
 *
 * Renders the kartli brand assets with a headless Chromium browser:
 *   public/favicon.ico
 *   public/favicon.png
 *   public/apple-touch-icon.png
 *   public/icon.svg
 *   public/icon.png
 *   public/og-image.png
 *   assets/readme/hero-banner.png
 *   assets/readme/spaces-banner.png
 *   assets/readme/feature-pantry.png
 *   assets/readme/feature-ledger.png
 *
 * Usage: npm run generate:assets
 */

import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const README_DIR = path.join(ROOT, "assets", "readme");
const FONT_PATH = path.join(ROOT, "scripts", "assets", "InterVariable.woff2");

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* ------------------------------------------------------------------ */

const T = {
  background: "#09090b",
  backgroundDeep: "#050506",
  surface: "#0d0d10",
  accent: "#10b981",
  accentDeep: "#059669",
  accentSoft: "#34d399",
  amber: "#f59e0b",
  amberSoft: "#fbbf24",
  text: "#fafafa",
  textMuted: "#a1a1aa",
  textDim: "#71717a",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.12)",
  glow: "rgba(16,185,129,0.05)",
  font: `'Inter', 'Inter Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`,
};

let FONT_FACE = "";
if (existsSync(FONT_PATH)) {
  const font = readFileSync(FONT_PATH).toString("base64");
  FONT_FACE = `
    @font-face {
      font-family: 'Inter';
      font-style: normal;
      font-weight: 100 900;
      font-display: block;
      src: url(data:font/woff2;base64,${font}) format('woff2');
    }
  `;
} else {
  console.warn("⚠ scripts/assets/InterVariable.woff2 not found — falling back to system sans-serif.");
}

/* ------------------------------------------------------------------ */
/* Brand mark                                                          */
/* ------------------------------------------------------------------ */

function markSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="kartli">
  <rect width="512" height="512" rx="116" fill="${T.background}"/>
  <rect x="2" y="2" width="508" height="508" rx="114" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="5"/>
  <path d="M172 150 L172 362" fill="none" stroke="#fafafa" stroke-width="44" stroke-linecap="round"/>
  <path d="M204 258 L310 152" fill="none" stroke="#fafafa" stroke-width="44" stroke-linecap="round"/>
  <path d="M204 270 L318 364" fill="none" stroke="#fafafa" stroke-width="44" stroke-linecap="round"/>
  <circle cx="362" cy="140" r="24" fill="${T.accent}"/>
</svg>`;
}

/* ------------------------------------------------------------------ */
/* Shared page CSS                                                     */
/* ------------------------------------------------------------------ */

function baseCss() {
  return `
    ${FONT_FACE}
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: ${T.background};
    }
    body {
      font-family: ${T.font};
      color: ${T.text};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: geometricPrecision;
    }
    .glow {
      position: absolute;
      inset: 0;
      background: radial-gradient(60% 80% at 50% -18%, ${T.glow} 0%, transparent 68%);
      pointer-events: none;
    }
  `;
}

/* ------------------------------------------------------------------ */
/* Hero banner — 1280 × 360                                            */
/* ------------------------------------------------------------------ */

function heroHtml() {
  const pills = ["Real-time Board", "Bilingual DE/EN", "Fair Ledger"];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  ${baseCss()}

  .hero {
    position: relative;
    width: 1280px;
    height: 360px;
    overflow: hidden;
    background: ${T.background};
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .content {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    transform: translateY(-10px);
  }

  .wordmark {
    color: #ffffff;
    font-size: 48px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.038em;
  }
  .wordmark::after {
    content: "";
    display: inline-block;
    width: 9px;
    height: 9px;
    margin-left: 5px;
    border-radius: 50%;
    background: ${T.accent};
    vertical-align: 0.12em;
  }

  .subline {
    margin: 13px 0 0;
    color: ${T.textMuted};
    font-size: 18px;
    font-weight: 400;
    line-height: 1.4;
    letter-spacing: 0;
  }

  .pills {
    position: absolute;
    z-index: 2;
    left: 50%;
    bottom: 34px;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    height: 26px;
    padding: 0 12px;
    border: 1px solid ${T.border};
    border-radius: 999px;
    background: transparent;
    color: ${T.textMuted};
    font-size: 12px;
    font-weight: 400;
    line-height: 1;
    white-space: nowrap;
  }
</style>
</head>
<body>
  <section class="hero">
    <div class="glow"></div>

    <div class="content">
      <div class="wordmark">kartli</div>
      <p class="subline">The shared kitchen &amp; household operating system.</p>
    </div>

    <div class="pills">
      ${pills.map((label) => `<span class="pill">${label}</span>`).join("")}
    </div>
  </section>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Spaces banner — 1280 × 240                                          */
/* ------------------------------------------------------------------ */

const SPACE_ICONS = {
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>`,
  compass: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
  building: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>`,
};

function spacesHtml() {
  const cards = [
    {
      icon: SPACE_ICONS.users,
      title: "WG / Flatshare",
      desc: "Shared inventory &amp; balances",
    },
    {
      icon: SPACE_ICONS.home,
      title: "Familie",
      desc: "Household supplies &amp; essentials",
    },
    {
      icon: SPACE_ICONS.compass,
      title: "Neutral",
      desc: "Low-friction item tracking",
    },
    {
      icon: SPACE_ICONS.building,
      title: "Office",
      desc: "Team pantry &amp; coffee bar",
    },
  ];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  ${baseCss()}

  .spaces {
    position: relative;
    width: 1280px;
    height: 240px;
    overflow: hidden;
    padding: 24px 40px;
    background: ${T.background};
    display: flex;
    flex-direction: column;
  }

  .head {
    position: relative;
    z-index: 2;
    margin-bottom: 14px;
  }
  .eyebrow {
    color: ${T.accent};
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.2em;
    line-height: 1;
    text-transform: uppercase;
  }
  h1 {
    margin: 7px 0 0;
    color: #f4f4f5;
    font-size: 22px;
    font-weight: 600;
    line-height: 1.15;
    letter-spacing: -0.025em;
  }

  .cards {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    flex: 1;
    min-height: 0;
  }
  .card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 16px;
    border: 1px solid ${T.border};
    border-radius: 12px;
    background: rgba(9, 9, 11, 0.6);
    overflow: hidden;
  }
  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1px solid ${T.border};
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
    color: ${T.accent};
  }
  .icon svg { width: 16px; height: 16px; }

  .title {
    margin-top: 0;
    color: #fafafa;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }
  .desc {
    margin-top: 5px;
    color: ${T.textMuted};
    font-size: 12px;
    font-weight: 400;
    line-height: 1.4;
    letter-spacing: 0;
    white-space: nowrap;
  }
</style>
</head>
<body>
  <section class="spaces">
    <div class="glow"></div>

    <header class="head">
      <div class="eyebrow">Space presets</div>
      <h1>One shared kitchen. Four ways to live.</h1>
    </header>

    <div class="cards">
      ${cards
        .map(
          (card) => `
      <article class="card">
        <div class="icon">${card.icon}</div>
        <div class="card-body">
          <div class="title">${card.title}</div>
          <div class="desc">${card.desc}</div>
        </div>
      </article>`,
        )
        .join("")}
    </div>
  </section>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* OpenGraph image — 1200 × 630                                        */
/* ------------------------------------------------------------------ */

function ogHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  ${baseCss()}

  .og {
    position: relative;
    width: 1200px;
    height: 630px;
    overflow: hidden;
    background: ${T.background};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .content {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    transform: translateY(-18px);
  }

  .glass {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 112px;
    height: 112px;
    border: 1px solid ${T.borderStrong};
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.025);
    box-shadow: 0 24px 64px -32px rgba(0, 0, 0, 0.9);
  }
  .glass svg { display: block; width: 80px; height: 80px; }

  .title {
    margin-top: 28px;
    color: #ffffff;
    font-size: 44px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.04em;
  }
  .title::after {
    content: "";
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-left: 5px;
    border-radius: 50%;
    background: ${T.accent};
    vertical-align: 0.14em;
  }
  .subtitle {
    margin-top: 8px;
    color: ${T.textMuted};
    font-size: 18px;
    font-weight: 400;
    line-height: 1.4;
  }

  .footer {
    position: absolute;
    z-index: 2;
    left: 0;
    right: 0;
    bottom: 54px;
    text-align: center;
    color: ${T.textDim};
    font-size: 13px;
    font-weight: 400;
    letter-spacing: 0.01em;
  }
  .footer .site { color: ${T.textMuted}; }
  .footer .sep { margin: 0 10px; color: #3f3f46; }
</style>
</head>
<body>
  <section class="og">
    <div class="glow"></div>

    <div class="content">
      <div class="glass">${markSvg()}</div>
      <div class="title">kartli</div>
      <div class="subtitle">Shared Kitchens</div>
    </div>

    <div class="footer">
      <span class="site">kartli.de</span><span class="sep">/</span>open-source household ledger
    </div>
  </section>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Feature card — pantry — 800 × 200                                   */
/* ------------------------------------------------------------------ */

function pantryHtml() {
  const tiles = [
    { name: "Knoblauch", status: "Da", state: "stocked" },
    { name: "Lappen", status: "Leer", state: "needed" },
    { name: "Spüli", status: "Da", state: "stocked" },
  ];

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<style>
  ${baseCss()}

  .panel {
    position: relative;
    width: 800px;
    height: 200px;
    overflow: hidden;
    padding: 20px 24px;
    background: ${T.background};
    display: flex;
    flex-direction: column;
  }

  .head {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .head .label {
    color: #f4f4f5;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .head .count {
    color: ${T.textDim};
    font-size: 11px;
    font-weight: 400;
  }

  .tiles {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    flex: 1;
    min-height: 0;
  }
  .tile {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 14px 16px;
    border: 1px solid ${T.border};
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.025);
    overflow: hidden;
  }
  .tile.needed {
    border-color: rgba(245, 158, 11, 0.32);
    background: rgba(245, 158, 11, 0.06);
  }

  .status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 500;
    line-height: 1;
  }
  .status .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex: none;
  }
  .stocked .status { color: ${T.accentSoft}; }
  .stocked .dot {
    background: ${T.accent};
    box-shadow: 0 0 6px rgba(16, 185, 129, 0.5);
  }
  .needed .status { color: ${T.amberSoft}; }
  .needed .dot {
    background: ${T.amber};
    box-shadow: 0 0 6px rgba(245, 158, 11, 0.4);
  }

  .name {
    color: #fafafa;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: -0.01em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
</head>
<body>
  <section class="panel">
    <div class="glow"></div>

    <div class="head">
      <span class="label">Household staples</span>
      <span class="count">3 tracked</span>
    </div>

    <div class="tiles">
      ${tiles
        .map(
          ({ name, status, state }) => `
      <div class="tile ${state}">
        <div class="status"><span class="dot"></span>${status}</div>
        <div class="name">${name}</div>
      </div>`,
        )
        .join("")}
    </div>
  </section>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Feature card — ledger — 800 × 200                                   */
/* ------------------------------------------------------------------ */

function ledgerHtml() {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<style>
  ${baseCss()}

  .panel {
    position: relative;
    width: 800px;
    height: 200px;
    overflow: hidden;
    background: ${T.background};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .eyebrow {
    position: relative;
    z-index: 2;
    margin-bottom: 15px;
    color: ${T.textDim};
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.2em;
    line-height: 1;
    text-transform: uppercase;
  }

  .pill {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 14px;
    height: 62px;
    padding: 0 22px;
    border: 1px solid ${T.border};
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.02);
  }

  .check {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: 1px solid rgba(16, 185, 129, 0.25);
    border-radius: 50%;
    background: rgba(16, 185, 129, 0.1);
    color: ${T.accentSoft};
    flex: none;
  }
  .check svg { width: 13px; height: 13px; }

  .text {
    color: #fafafa;
    font-size: 15.5px;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
  }
  .divider {
    width: 1px;
    height: 20px;
    background: ${T.border};
    flex: none;
  }
  .amount {
    color: ${T.textMuted};
    font-size: 14px;
    font-weight: 400;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
</style>
</head>
<body>
  <section class="panel">
    <div class="glow"></div>

    <div class="eyebrow">Fair Ledger</div>

    <div class="pill">
      <span class="check">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m20 6-11 11-5-5"/></svg>
      </span>
      <span class="text">Alle Ausgaben ausgeglichen</span>
      <span class="divider"></span>
      <span class="amount">0,00 €</span>
    </div>
  </section>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Icon page                                                           */
/* ------------------------------------------------------------------ */

function iconHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  ${baseCss()}
  .icon { width: 100%; height: 100%; }
  .icon svg { display: block; width: 100%; height: 100%; }
</style>
</head>
<body><div class="icon">${markSvg()}</div></body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

function findChrome() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    (() => {
      try {
        return puppeteer.executablePath();
      } catch {
        return null;
      }
    })(),
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

async function render(page, { html, width, height, scale = 2 }) {
  await page.setViewport({ width, height, deviceScaleFactor: scale });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });

  const shot = await page.screenshot({ type: "png" });
  if (scale === 1) return shot;

  const resized = await page.evaluate(
    async ({ base64, targetWidth, targetHeight }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
      return canvas.toDataURL("image/png").split(",")[1];
    },
    { base64: shot.toString("base64"), targetWidth: width, targetHeight: height },
  );

  return Buffer.from(resized, "base64");
}

/** Compose a multi-size .ico from PNG buffers. */
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // icon type
  header.writeUInt16LE(entries.length, 4);

  const directory = Buffer.alloc(16 * entries.length);
  let offset = header.length + directory.length;

  entries.forEach(({ size, data }, i) => {
    const base = i * 16;
    directory.writeUInt8(size >= 256 ? 0 : size, base + 0);
    directory.writeUInt8(size >= 256 ? 0 : size, base + 1);
    directory.writeUInt8(0, base + 2); // palette colours
    directory.writeUInt8(0, base + 3); // reserved
    directory.writeUInt16LE(1, base + 4); // colour planes
    directory.writeUInt16LE(32, base + 6); // bits per pixel
    directory.writeUInt32LE(data.length, base + 8);
    directory.writeUInt32LE(offset, base + 12);
    offset += data.length;
  });

  return Buffer.concat([header, directory, ...entries.map((entry) => entry.data)]);
}

async function main() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.mkdir(README_DIR, { recursive: true });

  const executablePath = findChrome();
  if (executablePath) {
    console.log(`• Chromium: ${executablePath}`);
  } else {
    console.warn("⚠ No system Chrome found — using Puppeteer's bundled browser.");
  }

  let browser;
  const closeBrowser = async () => {
    if (!browser) return;
    try {
      await browser.close();
    } finally {
      browser = null;
    }
  };

  // Ensure a Ctrl+C / kill never leaves a headless Chromium behind.
  const onSignal = (signal) => {
    void closeBrowser().finally(() => process.exit(signal === "SIGINT" ? 130 : 143));
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  try {
    browser = await puppeteer.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--hide-scrollbars",
        "--force-color-profile=srgb",
        "--font-render-hinting=none",
        "--disable-lcd-text",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
      ],
      defaultViewport: null,
    });

    const page = await browser.newPage();
    const written = [];

    const write = async (dir, file, data) => {
      const target = path.join(dir, file);
      await fs.writeFile(target, data);
      written.push(target);
    };

    console.log("• Rendering icon set…");
    const iconPage = { html: iconHtml() };
    const icon32 = await render(page, { ...iconPage, width: 32, height: 32, scale: 8 });
    const icon64 = await render(page, { ...iconPage, width: 64, height: 64, scale: 6 });
    const icon180 = await render(page, { ...iconPage, width: 180, height: 180, scale: 4 });
    const icon512 = await render(page, { ...iconPage, width: 512, height: 512, scale: 2 });

    await write(PUBLIC_DIR, "favicon.png", icon64);
    await write(
      PUBLIC_DIR,
      "favicon.ico",
      buildIco([
        { size: 32, data: icon32 },
        { size: 64, data: icon64 },
      ]),
    );
    await write(PUBLIC_DIR, "apple-touch-icon.png", icon180);
    await write(PUBLIC_DIR, "icon.png", icon512);
    await fs.writeFile(path.join(PUBLIC_DIR, "icon.svg"), `${markSvg()}\n`, "utf8");
    written.push(path.join(PUBLIC_DIR, "icon.svg"));

    console.log("• Rendering social preview…");
    const og = await render(page, {
      html: ogHtml(),
      width: 1200,
      height: 630,
      scale: 2,
    });
    await write(PUBLIC_DIR, "og-image.png", og);

    console.log("• Rendering README banners…");
    const hero = await render(page, {
      html: heroHtml(),
      width: 1280,
      height: 360,
      scale: 2,
    });
    await write(README_DIR, "hero-banner.png", hero);

    const spaces = await render(page, {
      html: spacesHtml(),
      width: 1280,
      height: 240,
      scale: 2,
    });
    await write(README_DIR, "spaces-banner.png", spaces);

    const pantry = await render(page, {
      html: pantryHtml(),
      width: 800,
      height: 200,
      scale: 2,
    });
    await write(README_DIR, "feature-pantry.png", pantry);

    const ledger = await render(page, {
      html: ledgerHtml(),
      width: 800,
      height: 200,
      scale: 2,
    });
    await write(README_DIR, "feature-ledger.png", ledger);

    await page.close();

    console.log("\n✔ Brand assets generated:");
    for (const file of written) {
      const { size } = await fs.stat(file);
      console.log(`  ${path.relative(ROOT, file)}  (${(size / 1024).toFixed(1)} KB)`);
    }
  } finally {
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
    await closeBrowser();
  }
}

main().catch((error) => {
  console.error("\n✖ Asset generation failed:");
  console.error(error);
  process.exitCode = 1;
});
