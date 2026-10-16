import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Download,
  Upload,
  Trash2,
  ArrowUpRight,
  FolderOpen,
} from "lucide-react";
import { listSessions, removeSession, saveSession } from "../domain/storage";
import {
  download,
  serializeSession,
  MAX_SESSION_BYTES,
  sessionSchema,
  type ExperimentSession,
} from "../domain/model";
import { Empty } from "../components/UI";
export function Sessions() {
  const [sessions, setSessions] = useState<ExperimentSession[]>([]),
    [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const refresh = () =>
    listSessions()
      .then(setSessions)
      .catch(() =>
        setError(
          "Хранилище браузера недоступно. Эксперименты можно переносить через JSON.",
        ),
      )
      .finally(() => setReady(true));
  useEffect(() => {
    refresh();
  }, []);
  async function load(file?: File) {
    if (!file) return;
    try {
      if (file.size > MAX_SESSION_BYTES)
        throw Error("Файл должен быть меньше 8 МБ");
      const s = sessionSchema.parse(JSON.parse(await file.text()));
      await saveSession({
        ...s,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      });
      await refresh();
      setError("");
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("8 МБ")
          ? e.message
          : "Не удалось открыть файл. Нужен JSON эксперимента Observatory версии 1.",
      );
    }
  }
  return (
    <div className="page">
      <div className="page-title-row">
        <div>
          <span className="page-kicker">Возвращайтесь к своим открытиям</span>
          <h1>Мои эксперименты</h1>
          <p className="page-description">
            Код, настройки и события — в одной сохранённой записи.
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() => input.current?.click()}
        >
          <Upload size={16} />
          Открыть JSON
        </button>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            load(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <p role="alert" className="alert error">
          {error}
        </p>
      )}
      {!ready ? (
        <p className="muted">Загружаем эксперименты…</p>
      ) : sessions.length === 0 ? (
        <Empty
          title="Первое открытие ещё впереди"
          description="Запустите лабораторию, попробуйте пример и сохраните запись. Она появится здесь."
        >
          <Link className="button primary" to="/lab/batching">
            Начать эксперимент <ArrowUpRight size={16} />
          </Link>
        </Empty>
      ) : (
        <div className="sessions-grid">
          {sessions.map((s) => (
            <article className="session-card" key={s.id}>
              <span className="session-icon">
                <FolderOpen size={24} />
              </span>
              <span className="session-date">
                {new Date(s.createdAt).toLocaleString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <h2>{s.title}</h2>
              <p>
                {s.events.length} событий ·{" "}
                {s.strict ? "Strict Mode" : "Обычный режим"}
              </p>
              <div className="session-actions">
                <button
                  className="button secondary small"
                  onClick={() =>
                    navigate(`/lab/${s.labId}?session=${s.id}&tab=replay`)
                  }
                >
                  Открыть разбор <ArrowUpRight size={14} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Скачать ${s.title}`}
                  onClick={() =>
                    download(s.labId + ".json", serializeSession(s))
                  }
                >
                  <Download size={16} />
                </button>
                <button
                  className="icon-button danger"
                  aria-label={`Удалить ${s.title}`}
                  onClick={async () => {
                    try {
                      await removeSession(s.id);
                      await refresh();
                    } catch {
                      setError(
                        "Не удалось удалить запись. Попробуйте ещё раз.",
                      );
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
