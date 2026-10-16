import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir("public/tour", { recursive: true });
await mkdir("docs", { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const snap = async (name: string, fullPage = false) => {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `public/tour/${name}.png`, fullPage });
};
await page.goto("http://127.0.0.1:5174/");
await snap("overview");
await page.goto("http://127.0.0.1:5174/lab/batching");
await page
  .locator(".output-panel .panel-heading")
  .getByText("Живая среда")
  .waitFor();
await page.getByLabel("Вариант примера").selectOption("fixed");
await page
  .frameLocator("iframe")
  .getByRole("button", { name: "Увеличить трижды" })
  .click();
await snap("laboratory");
await page.screenshot({
  path: "docs/observatory-laboratory.png",
  fullPage: true,
});
await page.getByRole("tab", { name: "Разбор", exact: true }).click();
const slider = page.getByLabel("Позиция в записи");
await slider.fill("0");
await page.getByRole("button", { name: "Следующее событие" }).click();
await snap("replay");
await page.getByRole("tab", { name: "Практика", exact: true }).click();
await page.getByRole("button", { name: "A 1", exact: true }).click();
await page
  .getByRole("button", {
    name: "B Результат предыдущего обновления",
    exact: true,
  })
  .click();
await page.getByRole("button", { name: "Проверить поведение" }).click();
await snap("practice");
await page.getByRole("tab", { name: "Видео", exact: true }).click();
await page.locator(".video-player").waitFor();
await snap("video");
await page.screenshot({ path: "docs/observatory-video.png", fullPage: true });
await page.goto("http://127.0.0.1:5174/videos");
await page.locator(".video-card").first().waitFor();
await snap("collection");
await browser.close();
console.log("Captured six real product screens");
