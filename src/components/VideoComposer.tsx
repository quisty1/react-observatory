import { useEffect, useMemo, useState } from "react";
import { Player } from "@remotion/player";
import {
  Download,
  FileText,
  Subtitles,
  Film,
  Check,
  LoaderCircle,
  Square,
  X,
} from "lucide-react";
import { ExperimentExplainer } from "../video/Explainer";
import {
  buildBrief,
  download,
  durationFrames,
  script,
  subtitles,
  type ExperimentSession,
  type LabDefinition,
  type VideoBrief,
} from "../domain/model";
import { sampleSession } from "../data/samples";
type Job = { id: string; status: string; progress: number; error?: string };
export function VideoComposer({
  session,
  lab,
}: {
  session: ExperimentSession;
  lab: LabDefinition;
}) {
  const [pace, setPace] = useState<VideoBrief["pace"]>("normal"),
    [theme, setTheme] = useState<VideoBrief["theme"]>("cobalt"),
    [caption, setCaption] = useState(""),
    [health, setHealth] = useState<"checking" | "local" | "static">("checking"),
    [job, setJob] = useState<Job | null>(null),
    [error, setError] = useState(""),
    [from, setFrom] = useState(0),
    [to, setTo] = useState(60);
  const verified =
    session.source === lab.source || session.source === lab.fixedSource;
  const brief = useMemo(
    () => ({
      ...buildBrief(
        session,
        lab.short,
        lab.explanation,
        lab.solution,
        verified,
        verified ? lab.fixedSource : session.source,
      ),
      question: verified
        ? session.source === lab.source
          ? lab.question
          : "Почему исправленный вариант работает?"
        : "Что произошло в этом эксперименте?",
      conclusion: verified
        ? lab.conclusion
        : "Сформулируйте вывод по записанным событиям.",
      diagram: lab.diagram,
      comparisonEvents:
        verified && session.source === lab.source
          ? sampleSession(lab, "fixed").events.slice(0, 60)
          : [],
      pace,
      theme,
      caption,
      events: session.events.slice(from, Math.min(to, from + 60)),
    }),
    [session, lab, verified, pace, theme, caption, from, to],
  );
  const inputProps = useMemo(() => ({ brief }), [brief]);
  useEffect(() => {
    if (import.meta.env.VITE_STATIC_DEMO === "true") {
      setHealth("static");
      return;
    }
    const c = new AbortController();
    fetch("/api/health", { signal: c.signal })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || data.service !== "observatory-render") throw Error();
        setHealth("local");
      })
      .catch(() => {
        if (!c.signal.aborted) setHealth("static");
      });
    return () => c.abort();
  }, []);
  const jobKey = "observatory:last-render:" + lab.id;
  useEffect(() => {
    if (health !== "local") return;
    const c = new AbortController();
    let id: string | null = null;
    try {
      id = sessionStorage.getItem(jobKey);
    } catch {}
    if (id)
      fetch("/api/renders/" + encodeURIComponent(id), { signal: c.signal })
        .then(async (r) => {
          if (!r.ok) {
            try {
              sessionStorage.removeItem(jobKey);
            } catch {}
            return;
          }
          setJob(await r.json());
        })
        .catch(() => {});
    return () => c.abort();
  }, [health, jobKey]);
  useEffect(() => {
    if (!job || !["queued", "bundling", "rendering"].includes(job.status))
      return;
    const c = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/renders/" + job.id, { signal: c.signal });
        if (!r.ok) throw Error("Статус экспорта недоступен");
        setJob(await r.json());
      } catch (e) {
        if (!c.signal.aborted) {
          setError(e instanceof Error ? e.message : String(e));
          setJob((j) => (j ? { ...j, status: "error" } : j));
        }
      }
    }, 900);
    return () => {
      c.abort();
      clearTimeout(t);
    };
  }, [job]);
  async function render() {
    setError("");
    try {
      const r = await fetch("/api/renders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "Не удалось начать экспорт");
      setJob(data);
      try {
        sessionStorage.setItem(jobKey, data.id);
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  async function cancel() {
    if (!job) return;
    try {
      const r = await fetch("/api/renders/" + job.id, { method: "DELETE" });
      if (!r.ok) throw Error("Не удалось отменить экспорт");
      setJob(await r.json());
    } catch (e) {
      setError(String(e));
    }
  }
  const busy =
    !!job && ["queued", "bundling", "rendering"].includes(job.status);
  return (
    <div className="video-workspace">
      <div className="video-stage">
        <div className="panel-heading">
          <span>
            <Film size={16} />
            Experiment Explainer
          </span>
          <span>1920 × 1080 · 30 fps</span>
        </div>
        <div className="video-player">
          <Player
            component={ExperimentExplainer}
            inputProps={inputProps}
            durationInFrames={durationFrames(brief)}
            compositionWidth={1920}
            compositionHeight={1080}
            fps={30}
            controls
            initialFrame={30}
            style={{ width: "100%", borderRadius: 8 }}
            acknowledgeRemotionLicense
          />
        </div>
        <div className="video-chapters">
          {[
            "Вопрос",
            "Код",
            "Наблюдение",
            "Причина",
            "Исправление",
            "Вывод",
          ].map((v, i) => (
            <div key={v}>
              <span>
                0:{String(i * (pace === "normal" ? 8 : 10)).padStart(2, "0")}
              </span>
              {v}
            </div>
          ))}
        </div>
        <div className="video-export-actions">
          <button
            className="button secondary"
            onClick={() =>
              download(lab.id + "-script.md", script(brief), "text/markdown")
            }
          >
            <FileText size={16} />
            Сценарий
          </button>
          <button
            className="button secondary"
            onClick={() =>
              download(lab.id + ".srt", subtitles(brief), "text/plain")
            }
          >
            <Subtitles size={16} />
            Субтитры SRT
          </button>
        </div>
      </div>
      <aside className="video-inspector">
        <h3>Настроить разбор</h3>
        <p className="muted">
          {verified
            ? "Проверенный учебный сценарий"
            : "Отчёт по пользовательскому коду"}
        </p>
        <label className="field-label">
          Темп
          <select value={pace} onChange={(e) => setPace(e.target.value as any)}>
            <option value="normal">Обычный · 48 секунд</option>
            <option value="slow">Подробный · 60 секунд</option>
          </select>
        </label>
        <label className="field-label">
          Оформление
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as any)}
          >
            <option value="cobalt">Светлая лаборатория</option>
            <option value="ink">Вечернее наблюдение</option>
          </select>
        </label>
        <label className="field-label">
          Подпись к наблюдению
          <textarea
            value={caption}
            maxLength={500}
            rows={3}
            placeholder="Что зрителю стоит заметить?"
            onChange={(e) => setCaption(e.target.value)}
          />
        </label>
        <div className="range-fields">
          <label className="field-label">
            События от
            <input
              type="number"
              min={1}
              max={Math.max(1, session.events.length)}
              value={from + 1}
              onChange={(e) => {
                const n = Math.max(
                  0,
                  Math.min(
                    session.events.length - 1,
                    Number(e.target.value) - 1,
                  ),
                );
                setFrom(n);
                setTo(Math.max(n + 1, to));
              }}
            />
          </label>
          <label className="field-label">
            до
            <input
              type="number"
              min={from + 1}
              max={Math.max(1, Math.min(session.events.length, from + 60))}
              value={Math.min(to, Math.max(1, session.events.length))}
              onChange={(e) =>
                setTo(
                  Math.max(
                    from + 1,
                    Math.min(
                      from + 60,
                      session.events.length,
                      Number(e.target.value),
                    ),
                  ),
                )
              }
            />
          </label>
        </div>
        <p className="small-muted">
          В видео: {brief.events.length} событий. До 60 за один разбор.
        </p>
        <div className={`render-mode ${health === "local" ? "online" : ""}`}>
          <span className="status-light" />
          <b>
            {health === "checking"
              ? "Проверяем рендер…"
              : health === "local"
                ? "Локальный рендер доступен"
                : "Режим веб-демо"}
          </b>
          <p>
            {health === "local" ? (
              "MP4 создаётся на вашем компьютере."
            ) : (
              <>
                Предпросмотр работает здесь. Для нового MP4 запустите полную
                версию: <code>npm run dev</code>.
              </>
            )}
          </p>
        </div>
        <button
          className="button primary full"
          onClick={render}
          disabled={health !== "local" || busy}
        >
          {busy ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <Download size={16} />
          )}
          Экспорт MP4
        </button>
        {job && (
          <div className="render-progress" role="status">
            <p className="small-muted">Последний экспорт этой лаборатории</p>
            <div>
              <span>
                {job.status === "done"
                  ? "Видео готово"
                  : job.status === "cancelled"
                    ? "Экспорт отменён"
                    : job.status === "error"
                      ? "Ошибка экспорта"
                      : job.status === "queued"
                        ? "В очереди"
                        : job.status === "bundling"
                          ? "Подготовка композиции"
                          : "Создаём видео"}
              </span>
              {busy && (
                <button
                  className="icon-button"
                  aria-label="Отменить экспорт"
                  onClick={cancel}
                >
                  <Square size={12} />
                </button>
              )}
            </div>
            <progress max={1} value={job.progress} />
            {job.status === "done" && (
              <a
                className="button secondary full"
                href={`/renders/${job.id}.mp4`}
                download
              >
                <Check size={15} />
                Скачать MP4
              </a>
            )}
            {job.error && <p className="error-text">{job.error}</p>}
          </div>
        )}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
      </aside>
    </div>
  );
}
