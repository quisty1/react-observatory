import { chromium, firefox, webkit, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const reports: Record<string, unknown>[] = [];
for (const [name, engine] of [
  ["Chrome", chromium],
  ["Firefox", firefox],
  ["WebKit", webkit],
] as const) {
  let browser;
  try {
    browser = await engine.launch(
      name === "Chrome" ? { channel: "chrome" } : {},
    );
  } catch (e) {
    reports.push({
      browser: name,
      available: false,
      reason: String(e).split("\n")[0],
    });
    console.log(name, "unavailable");
    continue;
  }
  try {
    const page = await browser.newPage({
      viewport: { width: 1360, height: 950 },
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:4174/");
    await page
      .getByRole("link", { name: "Открыть лабораторию", exact: true })
      .click();
    await expect(page).toHaveURL(/#\/lab\/batching/);
    await expect(
      page
        .frameLocator("iframe")
        .getByRole("button", { name: "Увеличить трижды" }),
    ).toBeVisible();
    await page
      .frameLocator("iframe")
      .getByRole("button", { name: "Увеличить трижды" })
      .click();
    await expect(
      page
        .frameLocator("iframe")
        .getByRole("heading", { name: "1", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page
        .frameLocator("iframe")
        .getByRole("button", { name: "Увеличить трижды" }),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Видео", exact: true }).click();
    await expect(page.locator(".render-mode")).toContainText("Режим веб-демо");
    await expect(
      page.getByRole("button", { name: "Экспорт MP4" }),
    ).toBeDisabled();
    await page.getByRole("link", { name: "Видеоразборы", exact: true }).click();
    await page
      .getByRole("button", {
        name: "Смотреть Состояние и пакетные обновления",
        exact: true,
      })
      .click();
    const video = page.locator("video.ready-video");
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState))
      .toBeGreaterThan(1);
    const duration = await video.evaluate((v: HTMLVideoElement) => v.duration);
    expect(duration).toBeGreaterThan(47);
    await video.evaluate((v: HTMLVideoElement) => {
      v.pause();
      v.currentTime = 11;
    });
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.seeking))
      .toBe(false);
    await page.screenshot({ path: `docs/static-${name.toLowerCase()}.png` });
    reports.push({
      browser: name,
      available: true,
      passed: true,
      videoDuration: duration,
      errors,
    });
    expect(errors).toEqual([]);
    console.log(name, "static TSX, reload, demo mode, video playback OK");
  } finally {
    await browser.close();
  }
}
await writeFile(
  "docs/browser-verification.json",
  JSON.stringify(reports, null, 2) + "\n",
);
if (!reports.some((r) => r.passed)) throw Error("No browser verified");
