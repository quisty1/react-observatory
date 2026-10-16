import { test, expect, type Page, type FrameLocator } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { labs } from "../../src/data/labs";
import { sessionSchema, type ExperimentSession } from "../../src/domain/model";
async function record(page: Page): Promise<ExperimentSession> {
  const waiting = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const dl = await waiting;
  return sessionSchema.parse(
    JSON.parse(await readFile((await dl.path())!, "utf8")),
  );
}
async function ready(page: Page) {
  await expect(page.locator(".output-panel .panel-heading")).toContainText(
    "Живая среда",
  );
  await expect(page.locator(".runtime-error")).toHaveCount(0);
}
async function interact(id: string, f: FrameLocator) {
  if (id === "batching")
    await f.getByRole("button", { name: "Увеличить трижды" }).click();
  if (id === "closures") {
    await f
      .getByRole("button", { name: "+1 через 2 секунды", exact: true })
      .click();
    await f.getByRole("button", { name: "+1 сейчас", exact: true }).click();
    await expect(
      f.getByRole("button", { name: "+1 через 2 секунды", exact: true }),
    ).toBeEnabled();
  }
  if (id === "effects") {
    await expect(f.getByRole("heading", { level: 1 })).toContainText("1");
    await f.getByRole("button", { name: "Скрыть часы" }).click();
  }
  if (id === "keys") {
    await f.getByLabel("Задача a").fill("");
    await f.getByLabel("Задача a").pressSequentially("Мой дизайн");
    await f.getByRole("button", { name: "Перевернуть список" }).click();
  }
  if (id === "memo") {
    await f.getByRole("button", { name: "Обновить панель" }).click();
    await f.getByRole("button", { name: "Обновить панель" }).click();
  }
  if (id === "context") {
    await f.getByRole("button", { name: "Сменить тему" }).click();
    await f.getByRole("button", { name: "Сменить тему" }).click();
  }
  if (id === "frames") await f.getByRole("button", { name: "Кадр 30" }).click();
  if (id === "springs")
    await f.getByRole("button", { name: "Кадр 18" }).click();
}
for (const lab of labs) {
  test(`${lab.id}: real problem, correction, behavior check and portable recording`, async ({
    page,
  }) => {
    await page.goto("/lab/" + lab.id);
    await ready(page);
    const f = page.frameLocator('iframe[title="Результат React-кода"]');
    await expect(f.locator("section").first()).toBeVisible();
    await interact(lab.id, f);
    const problem = await record(page);
    expect(lab.verify.check(problem.events)).toBe(false);
    if (process.env.OBS_CAPTURE) {
      await mkdir("work/captures", { recursive: true });
      await writeFile(
        "work/captures/" + lab.id + "-problem.json",
        JSON.stringify(problem, null, 2),
      );
    }
    await page.getByLabel("Вариант примера").selectOption("fixed");
    await ready(page);
    await interact(lab.id, f);
    await expect
      .poll(async () => lab.verify.check((await record(page)).events))
      .toBe(true);
    const fixed = await record(page);
    await page.getByRole("tab", { name: "Практика", exact: true }).click();
    await page.getByRole("button", { name: "Проверить поведение" }).click();
    await expect(page.getByRole("status")).toContainText("Проверка пройдена");
    if (process.env.OBS_CAPTURE) {
      await mkdir("work/captures", { recursive: true });
      await writeFile(
        "work/captures/" + lab.id + ".json",
        JSON.stringify(fixed, null, 2),
      );
    }
  });
}
test("save, replay, reload, import and JSON export preserve actual events", async ({
  page,
}) => {
  await page.goto("/lab/batching");
  await ready(page);
  await page
    .frameLocator("iframe")
    .getByRole("button", { name: "Увеличить трижды" })
    .click();
  const original = await record(page);
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("сохранён");
  await page
    .getByRole("link", { name: "Мои эксперименты", exact: true })
    .click();
  await expect(page.locator(".session-card")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".session-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Открыть разбор" }).click();
  await expect(
    page.getByRole("heading", { name: "Сохранённый эксперимент" }),
  ).toBeVisible();
  await expect(page.getByLabel("Позиция в записи")).toHaveValue(
    String(original.events.length - 1),
  );
  await page.getByLabel("Позиция в записи").fill("0");
  await expect(page.locator(".snapshot-card h3")).toHaveText(
    original.events[0].scope,
  );
  await page
    .getByRole("link", { name: "Мои эксперименты", exact: true })
    .click();
  await page.locator("input[type=file]").setInputFiles({
    name: "record.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(original)),
  });
  await expect(page.locator(".session-card")).toHaveCount(2);
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{bad}"),
  });
  await expect(page.getByRole("alert")).toContainText("Не удалось открыть");
});
test("custom TSX runs, syntax errors recover and infinite loops stop", async ({
  page,
}) => {
  await page.goto("/lab/batching");
  await ready(page);
  const editor = page.getByRole("textbox", { name: "Редактор App.tsx" });
  await editor.fill(
    'export default function App(){return <button onClick={e=>e.currentTarget.textContent="Работает"}>Мой пример</button>}',
  );
  await page.getByRole("button", { name: /Запустить/ }).click();
  await ready(page);
  await page
    .frameLocator("iframe")
    .getByRole("button", { name: "Мой пример" })
    .click();
  await expect(
    page.frameLocator("iframe").getByRole("button", { name: "Работает" }),
  ).toBeVisible();
  await editor.fill("export default function {");
  await page.getByRole("button", { name: /Запустить/ }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Не удалось выполнить код",
  );
  await editor.fill(
    "export default function App(){while(true){} return <p>Never</p>}",
  );
  await page.getByRole("button", { name: /Запустить/ }).click();
  await expect(page.getByRole("alert")).toContainText("слишком долгий цикл");
  await page.getByRole("button", { name: "Сбросить код" }).click();
  await ready(page);
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("button", { name: "Увеличить трижды" }),
  ).toBeVisible();
});
test("Strict Mode actually adds development effect cleanup; source stays isolated", async ({
  page,
}) => {
  await page.goto("/lab/effects");
  await ready(page);
  await page.getByLabel("Вариант примера").selectOption("fixed");
  await ready(page);
  const ordinary = await record(page);
  await page.getByLabel("Strict Mode", { exact: true }).check();
  await page.getByRole("button", { name: /Запустить/ }).click();
  await ready(page);
  await expect
    .poll(async () => {
      const strict = await record(page);
      return strict.events.filter((e) => e.kind === "effect").length;
    })
    .toBeGreaterThan(ordinary.events.filter((e) => e.kind === "effect").length);
  await expect(page.locator("iframe")).toHaveAttribute(
    "sandbox",
    "allow-scripts",
  );
});
test("video preview, subtitles, script and static mode work", async ({
  page,
}) => {
  await page.goto("/lab/batching");
  await ready(page);
  await page
    .frameLocator("iframe")
    .getByRole("button", { name: "Увеличить трижды" })
    .click();
  await page.getByRole("tab", { name: "Видео", exact: true }).click();
  await expect(page.locator(".video-player")).toBeVisible();
  await expect(page.locator(".render-mode")).toContainText(
    "Локальный рендер доступен",
  );
  for (const name of ["Сценарий", "Субтитры SRT"]) {
    const waiting = page.waitForEvent("download");
    await page.getByRole("button", { name, exact: true }).click();
    const dl = await waiting;
    expect((await readFile((await dl.path())!, "utf8")).length).toBeGreaterThan(
      100,
    );
  }
  await page.route("**/api/health", (r) =>
    r.fulfill({ status: 404, body: "Not found" }),
  );
  await page.reload();
  await expect(page.locator(".render-mode")).toContainText("Режим веб-демо");
  await expect(
    page.getByRole("button", { name: "Экспорт MP4" }),
  ).toBeDisabled();
});
test("responsive routes do not overflow at phone, tablet and desktop", async ({
  page,
}) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["/", "/lab/batching", "/videos", "/sessions"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        route + " " + width,
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({
    path: "docs/observatory-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1512, height: 1000 });
  await page.goto("/");
  await page.screenshot({
    path: "docs/observatory-overview.png",
    fullPage: true,
  });
});
test("a normal Remotion playback can run past the synchronous execution budget", async ({
  page,
}) => {
  await page.goto("/lab/frames");
  await ready(page);
  await page.getByLabel("Вариант примера").selectOption("fixed");
  await ready(page);
  await page
    .frameLocator("iframe")
    .getByRole("button", { name: "Play video", exact: true })
    .click();
  await expect
    .poll(async () => {
      const s = await record(page);
      return s.events.some((e) => e.kind === "snapshot" && e.data?.frame >= 50);
    })
    .toBe(true);
  await expect(page.locator(".runtime-error")).toHaveCount(0);
});
test("render job remains downloadable after closing and reopening the video tab", async ({
  page,
}) => {
  let created = false;
  await page.route("**/api/renders", (r) => {
    created = true;
    return r.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({
        id: "persisted-job",
        status: "queued",
        progress: 0,
      }),
    });
  });
  await page.route("**/api/renders/persisted-job", (r) =>
    r.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: "persisted-job",
        status: "done",
        progress: 1,
      }),
    }),
  );
  await page.goto("/lab/batching");
  await ready(page);
  await page.getByRole("tab", { name: "Видео", exact: true }).click();
  await expect(page.getByRole("button", { name: "Экспорт MP4" })).toBeEnabled();
  await page.getByRole("button", { name: "Экспорт MP4" }).click();
  await expect.poll(() => created).toBe(true);
  await page.getByRole("tab", { name: "Эксперимент", exact: true }).click();
  await page.getByRole("tab", { name: "Видео", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Скачать MP4", exact: true }),
  ).toHaveAttribute("href", "/renders/persisted-job.mp4");
});
test("opening a saved replay preserves a newer editor draft", async ({
  page,
}) => {
  await page.goto("/lab/batching");
  await ready(page);
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("сохранён");
  await page
    .getByRole("textbox", { name: "Редактор App.tsx" })
    .fill("export default function App(){return <h1>Новый черновик B</h1>}");
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const r = indexedDB.open("react-observatory", 1);
          r.onsuccess = () => resolve(r.result);
          r.onerror = reject;
        });
        return new Promise<string>((resolve) => {
          const r = db
            .transaction("settings")
            .objectStore("settings")
            .get("draft:batching");
          r.onsuccess = () => resolve(r.result?.code || "");
        });
      }),
    )
    .toContain("Новый черновик B");
  await page
    .getByRole("link", { name: "Мои эксперименты", exact: true })
    .click();
  await page.getByRole("button", { name: "Открыть разбор" }).click();
  await expect(
    page.getByRole("heading", { name: "Сохранённый эксперимент" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Эксперимент", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Редактор App.tsx" }),
  ).toContainText("Новый черновик B");
});
test("a portable recording larger than 2 MB can be imported", async ({
  page,
}) => {
  await page.goto("/sessions");
  const s = {
    version: 1,
    id: "large",
    labId: "batching",
    title: "Большой эксперимент",
    source: "export default function App(){return <h1>Test</h1>}",
    strict: false,
    createdAt: 1,
    events: Array.from({ length: 250 }, (_, seq) => ({
      seq,
      time: seq,
      kind: "snapshot",
      scope: "Test",
      label: "Value",
      data: { text: "x".repeat(9000) },
    })),
  };
  await page.locator("input[type=file]").setInputFiles({
    name: "large.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(s)),
  });
  await expect(page.locator(".session-card")).toHaveCount(1);
});
