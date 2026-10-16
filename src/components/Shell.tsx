import { NavLink, Link, Outlet, useLocation } from "react-router-dom";
import {
  Orbit,
  LayoutGrid,
  FlaskConical,
  Play,
  FolderOpen,
  ArrowUpRight,
  Command,
  BookOpen,
} from "lucide-react";
import { useState } from "react";
import { labs } from "../data/labs";
import { Modal } from "./UI";
export function Shell() {
  const location = useLocation();
  const [guide, setGuide] = useState(false);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/" aria-label="Observatory — на главную">
          <span className="brand-icon">
            <Orbit size={25} strokeWidth={1.5} />
          </span>
          <span>
            observatory
            <span className="brand-caption">React & Remotion lab</span>
          </span>
        </Link>
        <div className="workspace-label">
          <span className="tiny-orbit" /> Личное пространство
        </div>
        <nav className="main-nav" aria-label="Основная навигация">
          <NavLink to="/" end>
            <LayoutGrid size={18} />
            Обзор
          </NavLink>
          <NavLink
            to="/lab/batching"
            className={location.pathname.startsWith("/lab") ? "active" : ""}
          >
            <FlaskConical size={18} />
            Лаборатория<span className="nav-count">8</span>
          </NavLink>
          <NavLink to="/videos">
            <Play size={18} />
            Видеоразборы
          </NavLink>
          <NavLink to="/sessions">
            <FolderOpen size={18} />
            Мои эксперименты
          </NavLink>
        </nav>
        <div className="sidebar-section">Исследовать</div>
        <nav className="lab-nav" aria-label="Лаборатории">
          {labs.map((l) => (
            <NavLink key={l.id} to={`/lab/${l.id}`}>
              <span className="lab-dot" style={{ background: l.color }} />
              {l.short}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="guide-card">
            <BookOpen size={20} />
            <b>Знакомство за 3 минуты</b>
            <p>
              Один эксперимент.
              <br />
              От вопроса до видео.
            </p>
            <button onClick={() => setGuide(true)}>
              Начать знакомство <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="sidebar-foot">
            <span className="status-light" />
            Все системы готовы<span>v1.0</span>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Рабочее пространство</span>
            <span className="breadcrumb-slash">/</span>
            <span>
              {location.pathname === "/"
                ? "Обзор"
                : location.pathname === "/videos"
                  ? "Видеоразборы"
                  : location.pathname === "/sessions"
                    ? "Мои эксперименты"
                    : "Лаборатория"}
            </span>
          </div>
          <div className="topbar-right">
            <span className="local-indicator">
              <span className="status-light" />
              Без API-ключей
            </span>
            <button
              className="icon-button help"
              aria-label="Краткое руководство"
              onClick={() => setGuide(true)}
            >
              <Command size={16} />
            </button>
            <span className="avatar">RO</span>
          </div>
        </header>
        <Outlet />
      </main>
      {guide && (
        <Modal
          title="От вопроса до видео за 3 минуты"
          onClose={() => setGuide(false)}
        >
          <ol className="guide-steps">
            <li>
              <b>Предскажите результат</b>
              <p>
                Откройте первую лабораторию. Три вызова setCount — что покажет
                счётчик?
              </p>
            </li>
            <li>
              <b>Проверьте гипотезу</b>
              <p>
                Запустите код, нажмите кнопку в примере и посмотрите снимки
                значений.
              </p>
            </li>
            <li>
              <b>Сравните с исправлением</b>
              <p>
                Выберите исправленный вариант. Проверьте результат в разделе
                «Практика».
              </p>
            </li>
            <li>
              <b>Соберите объяснение</b>
              <p>
                Сохраните запись и откройте «Видео». Предпросмотр доступен в
                браузере, MP4 — в локальной версии.
              </p>
            </li>
          </ol>
          <Link
            className="button primary"
            to="/lab/batching"
            onClick={() => setGuide(false)}
          >
            Открыть эксперимент <ArrowUpRight size={16} />
          </Link>
        </Modal>
      )}
    </div>
  );
}
