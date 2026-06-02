import { chromium } from "playwright";

const BASE = process.env.QA_BASE || "http://127.0.0.1:5173";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const logs = [];
page.on("console", (m) => logs.push(`${m.type()}: ${m.text()}`));
page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));

async function shot(path, name) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `qa-${name}.png`, fullPage: true });
}

// Desktop pages
await shot("/", "home");
await shot("/category/forensics", "category");
await shot("/guide/jwt", "guide");
await shot("/guide/binary-digits-image", "guide-example");

// Search interaction
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const input = page.locator(".hero input");
await input.fill("rsa");
await page.waitForTimeout(250);
await page.screenshot({ path: "qa-suggest.png" });
await shot("/search?q=pcap", "search");

// Mobile
await page.setViewportSize({ width: 375, height: 900 });
await shot("/", "home-mobile");
await shot("/guide/jwt", "guide-mobile");

// horizontal-scroll check at 320
await page.setViewportSize({ width: 320, height: 800 });
await page.goto(`${BASE}/guide/binary-digits-image`, { waitUntil: "networkidle" });
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth,
);

await browser.close();
console.log(JSON.stringify({ overflow320: overflow, logs }, null, 2));
