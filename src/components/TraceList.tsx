import { eventNames, type TraceEvent } from "../domain/model";
export function TraceList({
  events,
  selected,
  onSelect,
}: {
  events: TraceEvent[];
  selected?: number;
  onSelect?: (i: number) => void;
}) {
  return (
    <div className="trace-list" role="list" aria-label="События эксперимента">
      {events.length === 0 ? (
        <div className="empty-inline">
          Здесь появятся события.
          <br />
          <span>Запустите код и попробуйте пример.</span>
        </div>
      ) : (
        events.map((e, i) => (
          <button
            key={e.seq}
            role="listitem"
            className={`trace-row ${selected === i ? "selected" : ""}`}
            onClick={() => onSelect?.(i)}
          >
            <span className="trace-time">{(e.time / 1000).toFixed(2)}s</span>
            <span className={`event-dot ${e.kind}`} />
            <span className="trace-main">
              <b>{e.scope}</b>
              <span>{e.label}</span>
            </span>
            <span className={`event-badge ${e.kind}`}>
              {eventNames[e.kind]}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
