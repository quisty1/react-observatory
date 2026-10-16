import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Play,
  RotateCcw,
  Save,
  Download,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Pause,
  Code2,
  Activity,
  FlaskConical,
  Info,
  GripVertical,
  LoaderCircle,
} from "lucide-react";
import { getLab } from "../data/labs";
import { useSandbox } from "../runtime/useSandbox";
import { CodeEditor } from "../components/CodeEditor";
import { Diagram } from "../components/Diagram";
import { TraceList } from "../components/TraceList";
import { Empty } from "../components/UI";
import {
  download,
  serializeSession,
  eventNames,
  type LabDefinition,
  type ExperimentSession,
} from "../domain/model";
import {
  getSetting,
  setSetting,
  saveSession,
  listSessions,
} from "../domain/storage";
const VideoComposer = lazy(() =>
  import("../components/VideoComposer").then((m) => ({
    default: m.VideoComposer,
  })),
);
export function LabRoute() {
  const { id } = useParams();
  const lab = getLab(id || "");
  return lab ? (
    <Lab key={lab.id} lab={lab} />
  ) : (
    <div className="page">
      <Empty
        title="Лаборатория не найдена"
        description="Выберите один из восьми экспериментов в каталоге."
      >
        <Link to="/" className="button primary">
          К лабораториям
        </Link>
      </Empty>
    </div>
  );
}
function Lab({ lab }: { lab: LabDefinition }) {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab") || "live";
  const tab = ["live", "replay", "practice", "video"].includes(requested)
    ? requested
    : "live";
  const [code, setCode] = useState(lab.source),
    [strict, setStrict] = useState(false),
    [loaded, setLoaded] = useState<ExperimentSession | null>(null),
    [selected, setSelected] = useState(-1),
    [filter, setFilter] = useState("all"),
    [message, setMessage] = useState(""),
    [answers, setAnswers] = useState<(number | null)[]>([null, null]),
    [passed, setPassed] = useState<boolean | null>(null),
    [split, setSplit] = useState(51),
    [replaying, setReplaying] = useState(false),
    [initialized, setInitialized] = useState(false);
  const sandbox = useSandbox();
  const grid = useRef<HTMLDivElement>(null),
    sessionId = useRef(params.get("session"));
  useEffect(() => {
    let live = true;
    Promise.all([
      getSetting(`draft:${lab.id}`, { code: lab.source, strict: false }),
      getSetting<(number | null)[]>(`answers:${lab.id}`, [null, null]),
      sessionId.current ? listSessions() : Promise.resolve([]),
    ])
      .then(([draft, quiz, sessions]) => {
        if (!live) return;
        const saved = sessions.find((s) => s.id === sessionId.current);
        const initialCode = draft.code;
        const mode = draft.strict;
        setCode(initialCode);
        setStrict(mode);
        if (Array.isArray(quiz) && quiz.length === 2) setAnswers(quiz);
        if (saved) setLoaded(saved);
        setInitialized(true);
        sandbox.run(initialCode, mode);
      })
      .catch(() => {
        if (live) {
          setMessage("Автосохранение недоступно. Скачайте запись через JSON.");
          setInitialized(true);
          sandbox.run(lab.source, false);
        }
      });
    return () => {
      live = false;
    };
  }, [lab.id, sandbox.run]);
  useEffect(() => {
    if (!initialized) return;
    const t = setTimeout(() => {
      setSetting(`draft:${lab.id}`, { code, strict }).catch(() =>
        setMessage("Не удалось сохранить черновик. Используйте JSON."),
      );
    }, 500);
    return () => clearTimeout(t);
  }, [code, strict, initialized, lab.id]);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 6500);
    return () => clearTimeout(t);
  }, [message]);
  const currentSession = useMemo<ExperimentSession>(
    () => ({
      version: 1,
      id: "current-" + lab.id,
      labId: lab.id,
      title: lab.short,
      source: sandbox.source || code,
      strict: sandbox.strict,
      events: sandbox.events,
      createdAt: Date.now(),
    }),
    [lab, code, sandbox.source, sandbox.events, sandbox.strict],
  );
  const recording = loaded && tab !== "live" ? loaded : currentSession;
  const dirty = code !== sandbox.source || strict !== sandbox.strict;
  const custom = code !== lab.source && code !== lab.fixedSource;
  const cursor =
    selected < 0
      ? Math.max(0, recording.events.length - 1)
      : Math.min(selected, Math.max(0, recording.events.length - 1));
  const active = recording.events[cursor];
  useEffect(() => {
    if (!replaying) return;
    const t = setInterval(
      () =>
        setSelected((i) => {
          if (i >= recording.events.length - 1) {
            setReplaying(false);
            return i;
          }
          return Math.max(0, i + 1);
        }),
      750,
    );
    return () => clearInterval(t);
  }, [replaying, recording.events.length]);
  function runNow(source = code, mode = strict) {
    setLoaded(null);
    setSelected(-1);
    setPassed(null);
    sandbox.run(source, mode);
  }
  async function save() {
    try {
      const s = {
        ...currentSession,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      await saveSession(s);
      setMessage("Эксперимент сохранён в «Мои эксперименты».");
    } catch {
      setMessage("Сохранение недоступно. Скачайте запись через JSON.");
    }
  }
  function chooseVariant(value: string) {
    const next = value === "fixed" ? lab.fixedSource : lab.source;
    setCode(next);
    runNow(next);
  }
  async function answer(i: number, n: number) {
    const next = [...answers];
    next[i] = n;
    setAnswers(next);
    try {
      await setSetting(`answers:${lab.id}`, next);
    } catch {
      setMessage("Ответ сохранён только в этой сессии.");
    }
  }
  function check() {
    const ok = lab.verify.check(sandbox.events);
    setPassed(ok);
    if (ok) setSetting(`complete:${lab.id}`, true).catch(() => {});
  }
  const switchTab = (next: string) => {
    setParams(
      next === "live"
        ? {}
        : { tab: next, ...(loaded ? { session: loaded.id } : {}) },
    );
    setReplaying(false);
  };
  const visibleEvents =
    filter === "all"
      ? sandbox.events
      : sandbox.events.filter((e) => e.kind === filter);
  return (
    <div className="page lab-page">
      <Link className="back-link" to="/">
        <ArrowLeft size={14} />
        Все лаборатории
      </Link>
      <div className="lab-title-row">
        <div>
          <div className="lab-meta">
            <span className="topic-pill" style={{ color: lab.color }}>
              <span className="lab-dot" style={{ background: lab.color }} />
              {lab.category}
            </span>
            <span>{lab.difficulty}</span>
            <span>{lab.minutes} минут</span>
          </div>
          <h1>{lab.title}</h1>
          <p>{lab.summary}</p>
        </div>
        <span className="specimen-number">
          {lab.number}
          <span>/ 08</span>
        </span>
      </div>
      <div className="lab-tabs" role="tablist" aria-label="Режим лаборатории">
        {[
          { id: "live", label: "Эксперимент", icon: FlaskConical },
          { id: "replay", label: "Разбор", icon: Activity },
          { id: "practice", label: "Практика", icon: Code2 },
          { id: "video", label: "Видео", icon: Play },
        ].map((t) => (
          <button
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={"panel-" + t.id}
            id={"tab-" + t.id}
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => switchTab(t.id)}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
        <span className="tabs-spacer" />
        <span className="tabs-note">
          <span className="status-light" />
          Всё остаётся в вашем браузере
        </span>
      </div>
      <div
        id="panel-live"
        role="tabpanel"
        aria-labelledby="tab-live"
        hidden={tab !== "live"}
      >
        <div className="question-banner">
          <span className="question-mark">?</span>
          <span>
            <b>Сначала предположите</b>
            {lab.question}
          </span>
        </div>
        <div className="lab-toolbar">
          <div>
            <select
              aria-label="Вариант примера"
              value={
                custom
                  ? "custom"
                  : code === lab.fixedSource
                    ? "fixed"
                    : "problem"
              }
              onChange={(e) => chooseVariant(e.target.value)}
            >
              <option value="problem">Исходный пример</option>
              <option value="fixed">Исправленный вариант</option>
              {custom && (
                <option value="custom">Пользовательская версия</option>
              )}
            </select>
            <label className="strict-toggle">
              <input
                type="checkbox"
                checked={strict}
                onChange={(e) => setStrict(e.target.checked)}
              />
              Strict Mode
            </label>
          </div>
          <div>
            <button
              className="icon-button"
              title="Вернуть исходный код"
              aria-label="Сбросить код"
              onClick={() => {
                setCode(lab.source);
                runNow(lab.source);
              }}
            >
              <RotateCcw size={16} />
            </button>
            <button
              className="button secondary small"
              onClick={save}
              disabled={!sandbox.events.length}
            >
              <Save size={15} />
              Сохранить
            </button>
            <button
              className="button primary small"
              onClick={() => runNow()}
              disabled={sandbox.status === "compiling"}
            >
              {sandbox.status === "compiling" ? (
                <LoaderCircle size={14} className="spin" />
              ) : (
                <Play size={14} fill="currentColor" />
              )}
              Запустить <kbd>⌘ ↵</kbd>
            </button>
          </div>
        </div>
        <div
          className="experiment-grid"
          ref={grid}
          style={{ gridTemplateColumns: `${split}% 8px minmax(0,1fr)` }}
        >
          <section className="code-panel">
            <div className="panel-heading">
              <span>
                <Code2 size={15} />
                App.tsx
              </span>
              <span>
                {custom ? "Пользовательский код" : "Учебный пример"}
                <span className={`code-status ${dirty ? "dirty" : ""}`} />
              </span>
            </div>
            <CodeEditor
              value={code}
              onChange={setCode}
              onRun={() => runNow()}
            />
            <div className="code-foot">
              <span>TypeScript JSX</span>
              <span>
                {dirty
                  ? "Есть изменения — запустите код"
                  : sandbox.status === "running"
                    ? "Код выполняется"
                    : "Среда выполнения"}
              </span>
            </div>
          </section>
          <div
            className="resize-handle"
            role="separator"
            aria-label="Ширина редактора"
            aria-valuemin={28}
            aria-valuemax={68}
            aria-valuenow={Math.round(split)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setSplit((v) => Math.max(28, v - 2));
              if (e.key === "ArrowRight") setSplit((v) => Math.min(68, v + 2));
            }}
            onPointerDown={(e) =>
              e.currentTarget.setPointerCapture(e.pointerId)
            }
            onPointerMove={(e) => {
              if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
              const box = grid.current!.getBoundingClientRect();
              setSplit(
                Math.max(
                  28,
                  Math.min(68, ((e.clientX - box.left) / box.width) * 100),
                ),
              );
            }}
          >
            <GripVertical size={12} />
          </div>
          <section className="output-panel">
            <div className="panel-heading">
              <span>
                <span className="status-light" />
                Результат
              </span>
              <span>
                {sandbox.status === "compiling"
                  ? "Компиляция…"
                  : sandbox.status === "running"
                    ? "Живая среда"
                    : "Предпросмотр"}
              </span>
            </div>
            <div className="iframe-wrap">
              {sandbox.srcDoc ? (
                <iframe
                  title="Результат React-кода"
                  sandbox="allow-scripts"
                  ref={sandbox.iframe}
                  srcDoc={sandbox.srcDoc}
                />
              ) : (
                <div className="sandbox-loading">
                  {sandbox.status === "compiling" ? (
                    <>
                      <LoaderCircle size={24} className="spin" />
                      Готовим эксперимент…
                    </>
                  ) : (
                    <>
                      <Code2 size={24} />
                      Запустите код для предпросмотра
                    </>
                  )}
                </div>
              )}
            </div>
            {sandbox.error && (
              <div className="runtime-error" role="alert">
                <b>Не удалось выполнить код</b>
                <pre>{sandbox.error}</pre>
                <button className="text-link" onClick={() => runNow()}>
                  Пересоздать среду <RotateCcw size={12} />
                </button>
              </div>
            )}
            <div className="diagram-label">
              <span>Модель эксперимента</span>
              <span>{sandbox.events.length} событий</span>
            </div>
            <Diagram labels={lab.diagram} events={sandbox.events} compact />
          </section>
        </div>
        {sandbox.notice && <p className="alert">{sandbox.notice}</p>}
        <section className="event-panel">
          <div className="panel-heading">
            <span>
              <Activity size={15} />
              Журнал событий{" "}
              <span className="count-pill">{sandbox.events.length}</span>
            </span>
            <div>
              <select
                aria-label="Фильтр событий"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">Все события</option>
                {Object.entries(eventNames).map(([v, n]) => (
                  <option value={v} key={v}>
                    {n}
                  </option>
                ))}
              </select>
              <button
                className="icon-button"
                aria-label="Очистить журнал"
                onClick={() => {
                  sandbox.clear();
                  setSelected(-1);
                }}
              >
                <Trash2 size={14} />
              </button>
              <button className="text-link" onClick={() => switchTab("replay")}>
                Разобрать <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
          <TraceList events={visibleEvents.slice(-100)} />
          {visibleEvents.length > 100 && (
            <div className="small-muted trace-note">
              Последние 100 из {visibleEvents.length} событий. Полная запись
              доступна в разборе и JSON.
            </div>
          )}
        </section>
        <div className="lab-bottom-tip">
          <Info size={15} />
          <span>
            Схемы используют учебные метки. Коммиты фиксирует React Profiler.
            Разбор воспроизводит запись событий.
          </span>
          <button
            className="text-link"
            onClick={() =>
              download(
                lab.id + "-experiment.json",
                serializeSession(currentSession),
              )
            }
          >
            <Download size={14} />
            JSON
          </button>
        </div>
      </div>
      {tab === "replay" && (
        <div id="panel-replay" role="tabpanel" aria-labelledby="tab-replay">
          {recording.events.length === 0 ? (
            <Empty
              title="Сначала нужно что-то наблюдать"
              description="Запустите пример и взаимодействуйте с ним. Затем вернитесь к разбору."
            >
              <button
                className="button primary"
                onClick={() => switchTab("live")}
              >
                К эксперименту
              </button>
            </Empty>
          ) : (
            <>
              <div className="replay-header">
                <div>
                  <h2>
                    {loaded ? "Сохранённый эксперимент" : "Текущий эксперимент"}
                  </h2>
                  <p>
                    {recording.events.length} событий ·{" "}
                    {recording.strict ? "Strict Mode" : "Без Strict Mode"} ·{" "}
                    {recording.source === lab.source ||
                    recording.source === lab.fixedSource
                      ? "Учебный пример"
                      : "Пользовательская версия"}
                  </p>
                </div>
                <button
                  className="button secondary small"
                  onClick={() =>
                    download(lab.id + ".json", serializeSession(recording))
                  }
                >
                  <Download size={15} />
                  Скачать JSON
                </button>
                {loaded && (
                  <button
                    className="button secondary small"
                    onClick={() => {
                      setCode(loaded.source);
                      setStrict(loaded.strict);
                      runNow(loaded.source, loaded.strict);
                      switchTab("live");
                    }}
                  >
                    Продолжить эксперимент <ArrowUpRight size={14} />
                  </button>
                )}
              </div>
              <div className="replay-grid">
                <section className="replay-visual">
                  <Diagram
                    labels={lab.diagram}
                    events={recording.events}
                    selected={cursor}
                  />
                  <div className="snapshot-card">
                    <span className={`event-badge ${active?.kind}`}>
                      {active && eventNames[active.kind]}
                    </span>
                    <h3>{active?.scope}</h3>
                    <p>{active?.label}</p>
                    <pre>{JSON.stringify(active?.data, null, 2)}</pre>
                  </div>
                  <div className="replay-code">
                    <div className="panel-heading">
                      <span>App.tsx</span>
                      <span>
                        {active?.line
                          ? "Строка " + active.line
                          : "У этого события нет учебной метки строки"}
                      </span>
                    </div>
                    <pre>
                      {recording.source
                        .split("\n")
                        .map((line, i) => ({ line, i }))
                        .filter(({ i }) =>
                          active?.line
                            ? Math.abs(i + 1 - active.line) < 5
                            : i < 7,
                        )
                        .map(({ line, i }) => (
                          <div
                            key={i}
                            className={i + 1 === active?.line ? "active" : ""}
                          >
                            <span>{i + 1}</span>
                            {line}
                          </div>
                        ))}
                    </pre>
                  </div>
                  <div className="replay-controls">
                    <button
                      className="icon-button"
                      aria-label="Предыдущее событие"
                      disabled={cursor === 0}
                      onClick={() => setSelected(cursor - 1)}
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      className="button primary small"
                      onClick={() => {
                        if (cursor === recording.events.length - 1)
                          setSelected(0);
                        setReplaying(!replaying);
                      }}
                    >
                      {replaying ? <Pause size={14} /> : <Play size={14} />}
                      Просмотр
                    </button>
                    <button
                      className="icon-button"
                      aria-label="Следующее событие"
                      disabled={cursor === recording.events.length - 1}
                      onClick={() => setSelected(cursor + 1)}
                    >
                      <ChevronRight size={17} />
                    </button>
                    <input
                      aria-label="Позиция в записи"
                      type="range"
                      min={0}
                      max={recording.events.length - 1}
                      value={cursor}
                      onChange={(e) => setSelected(Number(e.target.value))}
                    />
                    <span>
                      {cursor + 1} / {recording.events.length}
                    </span>
                  </div>
                </section>
                <section className="replay-events">
                  <div className="panel-heading">
                    <span>Последовательность событий</span>
                  </div>
                  <TraceList
                    events={recording.events}
                    selected={cursor}
                    onSelect={(i) => {
                      setSelected(i);
                      setReplaying(false);
                    }}
                  />
                </section>
              </div>
              <div className="explanation-grid">
                <section>
                  <span className="small-label">Что произошло</span>
                  <h2>{lab.short}</h2>
                  <p>
                    {recording.source === lab.source ||
                    recording.source === lab.fixedSource
                      ? lab.explanation
                      : "Это пользовательская версия. Сопоставьте записанные события с кодом; готовое объяснение относится к исходному учебному примеру."}
                  </p>
                </section>
                <section>
                  <span className="small-label">Как проверить</span>
                  <ol>
                    {lab.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </section>
              </div>
              <details className="recorded-code">
                <summary>Код этой записи</summary>
                <pre>{recording.source}</pre>
              </details>
            </>
          )}
        </div>
      )}
      {tab === "practice" && (
        <div
          className="practice-panel"
          id="panel-practice"
          role="tabpanel"
          aria-labelledby="tab-practice"
        >
          <div className="practice-intro">
            <span className="hero-tag">
              <Code2 size={16} />
              Закрепим понимание
            </span>
            <h2>Сначала ответ. Потом доказательство.</h2>
            <p>
              Два вопроса о механике и одна проверка поведения в живом примере.
            </p>
          </div>
          <div className="quiz-grid">
            {lab.tasks.map((t, i) => (
              <section className="quiz-card" key={i}>
                <span className="small-label">Вопрос {i + 1} из 2</span>
                <h3>{t.question}</h3>
                <div className="quiz-options">
                  {t.options.map((o, n) => (
                    <button
                      key={o}
                      className={
                        answers[i] === n
                          ? n === t.answer
                            ? "correct"
                            : "incorrect"
                          : ""
                      }
                      onClick={() => answer(i, n)}
                    >
                      <span>
                        {answers[i] === n && n === t.answer ? (
                          <Check size={13} />
                        ) : (
                          String.fromCharCode(65 + n)
                        )}
                      </span>
                      {o}
                    </button>
                  ))}
                </div>
                {answers[i] !== null && (
                  <p
                    className={`quiz-explanation ${answers[i] === t.answer ? "correct" : "incorrect"}`}
                    role="status"
                  >
                    {answers[i] === t.answer
                      ? "Верно. "
                      : "Попробуйте ещё раз. "}
                    {t.explanation}
                  </p>
                )}
              </section>
            ))}
          </div>
          <section className="behavior-check">
            <div>
              <span className="small-label">Проверка действием</span>
              <h3>Пусть результат говорит сам за себя.</h3>
              <p>{lab.verify.instruction}</p>
            </div>
            <div>
              <button
                className="button primary"
                onClick={check}
                disabled={!sandbox.events.length || dirty}
              >
                <Check size={16} />
                Проверить поведение
              </button>
              <button className="text-link" onClick={() => switchTab("live")}>
                Вернуться к коду <ArrowUpRight size={14} />
              </button>
            </div>
            {passed !== null && (
              <p
                className={`check-result ${passed ? "correct" : "incorrect"}`}
                role="status"
              >
                {passed
                  ? "Проверка пройдена: ожидаемое поведение есть в записи."
                  : "Пока не подтверждено. Выполните все действия в инструкции на свежем запуске."}
              </p>
            )}
            {dirty && (
              <p className="small-muted">
                В редакторе есть изменения. Запустите их перед проверкой.
              </p>
            )}
          </section>
          <details className="solution-details">
            <summary>Разобрать решение</summary>
            <p>{lab.solution}</p>
            <button
              className="button secondary small"
              onClick={() => {
                setCode(lab.fixedSource);
                runNow(lab.fixedSource);
                switchTab("live");
              }}
            >
              Открыть исправление <ArrowRight size={14} />
            </button>
          </details>
        </div>
      )}
      {tab === "video" && (
        <div id="panel-video" role="tabpanel" aria-labelledby="tab-video">
          <div className="replay-header">
            <div>
              <h2>Превратите наблюдение в объяснение.</h2>
              <p>
                {recording.events.length} событий в записи · шесть глав
                видеоразбора
              </p>
            </div>
          </div>
          <Suspense fallback={<p>Загружаем видеостудию…</p>}>
            <VideoComposer session={recording} lab={lab} />
          </Suspense>
        </div>
      )}
      {message && (
        <div className="toast" role="status">
          <Info size={17} />
          {message}
        </div>
      )}
    </div>
  );
}
