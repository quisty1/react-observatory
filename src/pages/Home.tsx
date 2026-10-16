import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Play,
  Code2,
  Activity,
  Film,
  Check,
  RotateCcw,
} from "lucide-react";
import { labs } from "../data/labs";
import { listSessions } from "../domain/storage";
function HeroExperiment() {
  const [count, setCount] = useState(0),
    [fixed, setFixed] = useState(false),
    [runs, setRuns] = useState(0);
  return (
    <div className="hero-experiment">
      <div className="experiment-top">
        <span>
          <span className="status-light" />
          Живой эксперимент
        </span>
        <span>useState / 01</span>
      </div>
      <div className="hero-demo-body">
        <div className="demo-queue">
          <div className="queue-caption">Один обработчик. Три обновления.</div>
          {[0, 1, 2].map((i) => (
            <div key={i} className={`queue-line ${runs ? "executed" : ""}`}>
              <span>{i + 1}</span>
              <code>setCount({fixed ? "n => n + 1" : "count + 1"})</code>
              <span className="queue-result">
                {runs ? <Check size={13} /> : "↵"}
              </span>
            </div>
          ))}
        </div>
        <div className="demo-connector">
          <svg viewBox="0 0 64 110">
            <path
              d="M4 12 Q32 12 32 55 M4 55H60 M4 98Q32 98 32 55"
              fill="none"
              stroke="#b9c7e7"
              strokeWidth="1.5"
            />
            <circle cx="58" cy="55" r="3" fill="#2955e8" />
          </svg>
        </div>
        <div className="demo-number">
          <span>Результат</span>
          <strong key={count}>{count}</strong>
          <span>count</span>
        </div>
      </div>
      <div className="hero-demo-footer">
        <button
          className="text-toggle"
          onClick={() => {
            setFixed(!fixed);
            setCount(0);
            setRuns(0);
          }}
        >
          <span className={`mini-switch ${fixed ? "on" : ""}`} />
          Функция обновления
        </button>
        <div>
          <button
            className="icon-button"
            aria-label="Сбросить эксперимент"
            onClick={() => {
              setCount(0);
              setRuns(0);
            }}
          >
            <RotateCcw size={15} />
          </button>
          <button
            className="button primary small"
            onClick={() => {
              if (fixed) {
                setCount((n) => n + 1);
                setCount((n) => n + 1);
                setCount((n) => n + 1);
              } else {
                setCount(count + 1);
                setCount(count + 1);
                setCount(count + 1);
              }
              setRuns((n) => n + 1);
            }}
          >
            <Play size={13} fill="currentColor" />
            Проверить
          </button>
        </div>
      </div>
    </div>
  );
}
function MiniArt({ index }: { index: number }) {
  return (
    <svg viewBox="0 0 140 76" className="mini-art" aria-hidden="true">
      {index % 4 === 0 ? (
        <>
          <path d="M12 38H128" stroke="currentColor" opacity=".25" />
          {[20, 70, 120].map((x, i) => (
            <g key={x}>
              <rect
                x={x - 13}
                y="24"
                width="26"
                height="28"
                rx="6"
                fill="white"
                stroke="currentColor"
                opacity={0.4 + i * 0.25}
              />
              <text
                x={x}
                y="42"
                textAnchor="middle"
                fontSize="12"
                fill="currentColor"
              >
                {i + 1}
              </text>
            </g>
          ))}
        </>
      ) : index % 4 === 1 ? (
        <>
          <circle
            cx="70"
            cy="38"
            r="27"
            fill="none"
            stroke="currentColor"
            opacity=".2"
          />
          <path
            d="M70 17V38L87 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="70" cy="38" r="3" fill="currentColor" />
        </>
      ) : index % 4 === 2 ? (
        <>
          <path
            d="M9 52H31L42 21L56 58L73 31L88 43H132"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="88" cy="43" r="4" fill="white" stroke="currentColor" />
        </>
      ) : (
        <>
          {[0, 1, 2].map((n) => (
            <g key={n}>
              <rect
                x="22"
                y={12 + n * 20}
                width={95 - n * 14}
                height="12"
                rx="3"
                fill="currentColor"
                opacity={0.2 + n * 0.25}
              />
              <circle cx="11" cy={18 + n * 20} r="3" fill="currentColor" />
            </g>
          ))}
        </>
      )}
    </svg>
  );
}
export function Home() {
  const [filter, setFilter] = useState("Все"),
    [saved, setSaved] = useState(0);
  useEffect(() => {
    listSessions()
      .then((s) => setSaved(s.length))
      .catch(() => {});
  }, []);
  return (
    <div className="page home-page">
      <div className="page-title-row">
        <div>
          <span className="page-kicker">Пространство для любопытства</span>
          <h1>React — под наблюдением.</h1>
        </div>
        <Link className="button secondary" to="/sessions">
          <Code2 size={16} />
          Мои эксперименты
          {saved > 0 && <span className="count-pill">{saved}</span>}
        </Link>
      </div>
      <section className="hero-section">
        <div className="hero-copy">
          <div className="hero-tag">
            <span className="small-cross">✳</span>Понять через эксперимент
          </div>
          <h2>
            Не просто читать код.
            <br />
            Видеть, как он работает.
          </h2>
          <p>
            Меняйте условия, наблюдайте за React
            <br className="desktop-br" /> и превращайте открытия в понятные
            видео.
          </p>
          <Link className="button primary" to="/lab/batching">
            Открыть лабораторию <ArrowUpRight size={17} />
          </Link>
          <div className="hero-tech">
            <span>
              <span className="tech-dot" />
              React 19
            </span>
            <span>
              <span className="tech-dot violet" />
              Remotion 4
            </span>
            <span>Без настройки среды</span>
          </div>
        </div>
        <HeroExperiment />
      </section>
      <section className="method-strip" aria-label="Как устроено обучение">
        <div>
          <span className="method-icon blue">
            <Code2 size={19} />
          </span>
          <span>
            <b>Изменить код</b>
            <small>Настоящий TSX в браузере</small>
          </span>
        </div>
        <ArrowRight size={17} />
        <div>
          <span className="method-icon green">
            <Activity size={19} />
          </span>
          <span>
            <b>Увидеть причину</b>
            <small>События, значения и связи</small>
          </span>
        </div>
        <ArrowRight size={17} />
        <div>
          <span className="method-icon violet">
            <Film size={19} />
          </span>
          <span>
            <b>Объяснить другим</b>
            <small>Видеоразбор на Remotion</small>
          </span>
        </div>
      </section>
      <section className="catalog">
        <div className="section-head">
          <div>
            <h2>
              Лаборатории <span className="muted">08</span>
            </h2>
            <p>Один вопрос. Небольшой пример. Понятный вывод.</p>
          </div>
          <div className="segmented" aria-label="Фильтр лабораторий">
            {["Все", "React", "Remotion"].map((v) => (
              <button
                key={v}
                aria-pressed={filter === v}
                className={filter === v ? "active" : ""}
                onClick={() => setFilter(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="lab-grid">
          {labs
            .filter((l) => filter === "Все" || l.category === filter)
            .map((l) => (
              <Link
                className="lab-card"
                key={l.id}
                to={`/lab/${l.id}`}
                style={{ "--lab-color": l.color } as React.CSSProperties}
              >
                <div className="lab-card-top">
                  <span className="lab-topic">
                    <span className="lab-dot" style={{ background: l.color }} />
                    {l.category}
                    <span className="topic-divider">/</span>
                    {l.tags[0]}
                  </span>
                  <span className="lab-duration">
                    {l.minutes} мин <ArrowUpRight size={15} />
                  </span>
                </div>
                <div className="lab-card-body">
                  <div>
                    <h3>{l.title}</h3>
                    <p>{l.short}</p>
                  </div>
                  <MiniArt index={Number(l.number) - 1} />
                </div>
                <div className="lab-card-bottom">
                  <span className="difficulty">
                    <i />
                    <i className={l.difficulty !== "Базовый" ? "filled" : ""} />
                    <i
                      className={l.difficulty === "Продвинутый" ? "filled" : ""}
                    />
                    {l.difficulty}
                  </span>
                  <span>Эксперимент + практика</span>
                </div>
              </Link>
            ))}
        </div>
      </section>
      <section className="bottom-note">
        <div className="note-orbit">
          <Activity size={22} />
        </div>
        <div>
          <h3>Лучшее объяснение начинается с хорошего вопроса.</h3>
          <p>
            У каждого эксперимента есть история. Сохраните свою — и соберите из
            неё видеоразбор.
          </p>
        </div>
        <Link to="/videos" className="text-link">
          К видеоразборам <ArrowUpRight size={16} />
        </Link>
      </section>
      <footer className="page-footer">
        <span>Observatory — место, где код становится понятнее.</span>
        <span>
          Создано на React & Remotion <span className="footer-star">✳</span>
        </span>
      </footer>
    </div>
  );
}
