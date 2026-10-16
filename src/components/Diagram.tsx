import type { TraceEvent } from "../domain/model";
export function Diagram({
  labels = ["Событие", "Очередь обновлений", "Новый снимок"],
  events = [],
  selected = -1,
  compact = false,
}: {
  labels?: string[];
  events?: TraceEvent[];
  selected?: number;
  compact?: boolean;
}) {
  const ev = events[selected < 0 ? events.length - 1 : selected];
  const snap = events
    .slice(0, selected < 0 ? events.length : selected + 1)
    .reverse()
    .find((e) => e.kind === "snapshot");
  const value =
    snap?.data && typeof snap.data === "object"
      ? Object.entries(snap.data)
          .slice(0, 3)
          .map(
            ([k, v]) =>
              `${k}: ${typeof v === "number" ? Math.round(v * 100) / 100 : String(v)}`,
          )
          .join("  ")
      : "Ожидание действия";
  return (
    <svg
      className={`flow-diagram ${compact ? "compact" : ""}`}
      viewBox="0 0 650 230"
      role="img"
      aria-label={`Схема: ${labels.join(", ")}. ${value}`}
    >
      <defs>
        <pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".7" fill="#c9d1e0" />
        </pattern>
        <marker
          id="arrow"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0 0L6 3L0 6" fill="none" stroke="#9caed7" />
        </marker>
      </defs>
      <rect width="650" height="230" fill="url(#dots)" />
      <path
        d="M172 95H244M406 95H478"
        fill="none"
        stroke="#9caed7"
        strokeDasharray="4 4"
        markerEnd="url(#arrow)"
      />
      {[18, 244, 478].map((x, i) => (
        <g key={x}>
          <rect
            x={x}
            y={57}
            width={154}
            height={76}
            rx="10"
            fill={i === 1 ? "#edf2ff" : "white"}
            stroke={i === 1 ? "#9bb2ff" : "#dce2ed"}
          />
          <circle
            cx={x + 20}
            cy={77}
            r="4"
            fill={i === 0 ? "#c2934f" : i === 1 ? "#2955e8" : "#178b7a"}
          />
          <text
            x={x + 16}
            y={112}
            fontSize="13"
            fill="#22324a"
            fontFamily="Onest Variable, sans-serif"
          >
            {labels[i]?.slice(0, 21)}
          </text>
        </g>
      ))}
      <text
        x="325"
        y="174"
        textAnchor="middle"
        fill="#2955e8"
        fontSize="13"
        fontFamily="JetBrains Mono, monospace"
      >
        {value.slice(0, 75)}
      </text>
      <text
        x="325"
        y="201"
        textAnchor="middle"
        fill="#8a94a7"
        fontSize="10"
        fontFamily="Onest Variable, sans-serif"
      >
        {ev
          ? `${ev.scope} / ${ev.label}`
          : "Запустите пример, чтобы увидеть изменения"}
      </text>
    </svg>
  );
}
