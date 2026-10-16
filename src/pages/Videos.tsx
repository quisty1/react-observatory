import { useState } from "react";
import { Play, ArrowUpRight, Download, Film } from "lucide-react";
import { Link } from "react-router-dom";
import { labs } from "../data/labs";
import { Modal } from "../components/UI";
import { VideoComposer } from "../components/VideoComposer";
import { sampleSession } from "../data/samples";
export function Videos() {
  const [selected, setSelected] = useState<string | null>(null),
    [watch, setWatch] = useState<string | null>(null);
  const lab = labs.find((l) => l.id === selected);
  return (
    <div className="page videos-page">
      <div className="page-title-row">
        <div>
          <span className="page-kicker">Из эксперимента — в историю</span>
          <h1>Понятно с первого кадра.</h1>
          <p className="page-description">
            Восемь видеоразборов. Код, наблюдения и объяснение в одном кадре.
          </p>
        </div>
        <Link className="button primary" to="/lab/batching?tab=video">
          <Film size={16} />
          Создать свой разбор
        </Link>
      </div>
      <div className="video-catalog">
        {labs.map((l, i) => (
          <article className="video-card" key={l.id}>
            <button
              className={`video-cover cover-${i % 3}`}
              aria-label={`Смотреть ${l.short}`}
              onClick={() => setWatch(l.id)}
            >
              <div className="video-cover-brand">
                ✳ observatory<span>{l.category}</span>
              </div>
              <h2>{l.title}</h2>
              <div className="cover-code">
                <span>{l.tags[0]}</span>
                <svg viewBox="0 0 160 60" aria-hidden="true">
                  <path
                    d={
                      i % 2
                        ? "M0 55C55 55 45 5 95 10S130 25 160 10"
                        : "M0 50H40L65 20H100L120 35H160"
                    }
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <span className="cover-play">
                <Play size={18} fill="currentColor" />
              </span>
              <span className="cover-duration">00:48</span>
            </button>
            <div className="video-card-info">
              <div>
                <h3>{l.short}</h3>
                <p>6 глав · 1080p · Remotion</p>
              </div>
              <div>
                <button
                  className="icon-button"
                  aria-label={`Настроить ${l.short}`}
                  onClick={() => setSelected(l.id)}
                >
                  <ArrowUpRight size={18} />
                </button>
                <a
                  className="icon-button"
                  href={`/videos/${l.id}.mp4`}
                  download
                  aria-label={`Скачать видео ${l.short}`}
                >
                  <Download size={17} />
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
      {lab && (
        <Modal title={lab.short} onClose={() => setSelected(null)}>
          <VideoComposer lab={lab} session={sampleSession(lab)} />
        </Modal>
      )}
      {watch && (
        <Modal
          title={labs.find((l) => l.id === watch)!.short}
          onClose={() => setWatch(null)}
        >
          <video
            className="ready-video"
            src={`/videos/${watch}.mp4`}
            controls
            autoPlay
            muted
            playsInline
          />
          <p className="muted">
            Готовый видеоразбор на основе записанного эксперимента.
          </p>
          <button
            className="button secondary"
            onClick={() => {
              setSelected(watch);
              setWatch(null);
            }}
          >
            Открыть композицию Remotion <ArrowUpRight size={15} />
          </button>
        </Modal>
      )}
    </div>
  );
}
