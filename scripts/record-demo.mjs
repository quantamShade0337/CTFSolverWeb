import { mkdir, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const baseUrl = process.env.DEMO_BASE || "http://127.0.0.1:5173";
const outputDir = fileURLToPath(new URL("../assets/demo/", import.meta.url));

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: {
    dir: outputDir,
    size: { width: 1440, height: 900 },
  },
});
const page = await context.newPage();
const video = page.video();

const pause = (ms) => page.waitForTimeout(ms);

await page.goto(baseUrl, { waitUntil: "networkidle" });
await pause(2200);

const search = page.locator(".hero input");
await search.click();
await search.pressSequentially("binary digits", { delay: 90 });
await pause(1600);

const suggestion = page.getByRole("button", {
  name: "Binary digits to image Hidden in a file",
  exact: true,
});
await suggestion.click();
await page.waitForLoadState("networkidle");
await pause(2200);

await page.mouse.wheel(0, 560);
await pause(1800);

const copyButton = page.locator(".cmd-copy").first();
if (await copyButton.isVisible()) {
  await copyButton.click();
}
await pause(1600);

await page.mouse.wheel(0, 680);
await pause(2200);

await context.close();
await browser.close();

const recordedPath = await video.path();
await rename(recordedPath, `${outputDir}ctfsolver-demo.webm`);
