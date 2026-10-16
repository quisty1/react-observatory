import express from "express";
import path from "node:path";
import { mkdir, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { briefSchema, type VideoBrief } from "../src/domain/model";
type Driver = (
  brief: VideoBrief,
  file: string,
  progress: (v: number) => void,
  signal: AbortSignal,
) => Promise<void>;
type Job = {
  id: string;
  status: "queued" | "bundling" | "rendering" | "done" | "error" | "cancelled";
  progress: number;
  createdAt: number;
  error?: string;
};
export function createApp(render: Driver) {
  const app = express();
  const jobs = new Map<string, Job>();
  const pending: {
    job: Job;
    brief: VideoBrief;
    controller: AbortController;
  }[] = [];
  let active: (typeof pending)[number] | undefined;
  const directory = path.resolve(".renders");
  app.use("/api", (req, res, next) => {
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || "")) {
      res.status(403).json({ error: "API доступен только локально" });
      return;
    }
    const origin = req.headers.origin;
    if (
      origin &&
      !/^http:\/\/(localhost|127\.0\.0\.1):(5174|4174|3002)$/.test(origin)
    ) {
      res.status(403).json({ error: "Недопустимый Origin" });
      return;
    }
    next();
  });
  app.use(express.json({ limit: "2mb" }));
  async function pump() {
    if (active) return;
    const item = pending.shift();
    if (!item) return;
    if (item.job.status === "cancelled") {
      void pump();
      return;
    }
    active = item;
    const { job, brief, controller } = item;
    try {
      job.status = "bundling";
      await mkdir(directory, { recursive: true });
      await render(
        brief,
        path.join(directory, job.id + ".mp4"),
        (p) => {
          if (!controller.signal.aborted) {
            job.status = "rendering";
            job.progress = Math.max(job.progress, Math.min(1, p));
          }
        },
        controller.signal,
      );
      if (controller.signal.aborted) {
        job.status = "cancelled";
        await unlink(path.join(directory, job.id + ".mp4")).catch(() => {});
      } else {
        job.status = "done";
        job.progress = 1;
      }
    } catch (e) {
      job.status = controller.signal.aborted ? "cancelled" : "error";
      if (job.status === "error")
        job.error = e instanceof Error ? e.message : "Не удалось создать видео";
      await unlink(path.join(directory, job.id + ".mp4")).catch(() => {});
    } finally {
      active = undefined;
      void pump();
    }
  }
  app.get("/api/health", (_req, res) =>
    res.json({
      service: "observatory-render",
      version: 1,
      active: !!active,
      queued: pending.filter((p) => p.job.status === "queued").length,
    }),
  );
  app.post("/api/renders", (req, res) => {
    const parsed = briefSchema.safeParse(req.body?.brief);
    if (!parsed.success) {
      res.status(400).json({
        error: "Некорректные данные видеоразбора",
        details: parsed.error.issues.slice(0, 3).map((i) => i.message),
      });
      return;
    }
    if (pending.filter((p) => p.job.status === "queued").length >= 3) {
      res
        .status(429)
        .json({ error: "Очередь заполнена. Дождитесь завершения экспорта." });
      return;
    }
    const job: Job = {
      id: randomUUID(),
      status: "queued",
      progress: 0,
      createdAt: Date.now(),
    };
    jobs.set(job.id, job);
    pending.push({
      job,
      brief: parsed.data,
      controller: new AbortController(),
    });
    res.status(202).json(job);
    queueMicrotask(() => void pump());
  });
  app.get("/api/renders/:id", (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) {
      res.status(404).json({
        error: "Экспорт не найден. Возможно, сервер был перезапущен.",
      });
      return;
    }
    res.json(job);
  });
  app.delete("/api/renders/:id", (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) {
      res.status(404).json({ error: "Экспорт не найден" });
      return;
    }
    if (["queued", "bundling", "rendering"].includes(job.status)) {
      job.status = "cancelled";
      const item =
        active?.job.id === job.id
          ? active
          : pending.find((p) => p.job.id === job.id);
      item?.controller.abort();
    }
    res.json(job);
  });
  app.get("/renders/:file", (req, res) => {
    const id = req.params.file.replace(/\.mp4$/, "");
    const job = jobs.get(id);
    if (!job || job.status !== "done" || req.params.file !== id + ".mp4") {
      res.status(404).end();
      return;
    }
    res.download(
      path.join(directory, id + ".mp4"),
      "observatory-" + id + ".mp4",
      { dotfiles: "allow" },
    );
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Маршрут API не найден" }),
  );
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.resolve("dist")));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(path.resolve("dist/index.html")),
    );
  }
  app.use(
    (
      error: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(error.status === 413 ? 413 : 400).json({
        error:
          error.status === 413
            ? "Слишком большой запрос"
            : "Не удалось прочитать запрос",
      });
    },
  );
  const cleanup = setInterval(() => {
    for (const [id, job] of jobs) {
      if (
        Date.now() - job.createdAt > 86400000 &&
        !["queued", "bundling", "rendering"].includes(job.status)
      ) {
        jobs.delete(id);
        void unlink(path.join(directory, id + ".mp4")).catch(() => {});
      }
    }
  }, 3600000);
  cleanup.unref();
  return app;
}
