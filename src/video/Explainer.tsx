import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  durationFrames,
  sceneAt,
  sceneFrames,
  sceneLabels,
  sceneText,
  type VideoBrief,
} from "../domain/model";
import { Diagram } from "../components/Diagram";
import "@fontsource-variable/onest";
import "@fontsource/jetbrains-mono/400.css";
function Code({
  source,
  active,
  color,
}: {
  source: string;
  active: number;
  color: string;
}) {
  const all = source.split("\n");
  const focus = all.findIndex((l) =>
    /setTimeout|setCount\(count|setCount\(\(n|useEffect\(\(|key=|const data =|UserContext.Provider|const opacity =|const b =/.test(
      l,
    ),
  );
  const offset = Math.max(0, focus - 5);
  const lines = all.slice(offset, offset + 23);
  return (
    <div
      style={{
        background: "#f7f9fd",
        border: "1px solid #dfe5f0",
        borderRadius: 16,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          fontSize: 18,
          padding: "20px 28px",
          borderBottom: "1px solid #e2e7f1",
          color: "#73819a",
          fontFamily: "JetBrains Mono",
        }}
      >
        App.tsx / фрагмент <span style={{ float: "right", color }}>TSX</span>
      </div>
      <pre
        style={{
          fontFamily: "JetBrains Mono",
          fontSize: lines.length > 26 ? 15 : 18,
          lineHeight: 1.6,
          padding: "24px 0",
          margin: 0,
          color: "#273959",
        }}
      >
        {lines.slice(0, 32).map((line, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              background: i === active ? "#e5edff" : "transparent",
              padding: "0 25px",
              whiteSpace: "pre",
            }}
          >
            <span
              style={{
                display: "inline-block",
                color: "#a6afbe",
                width: 40,
                flexShrink: 0,
                userSelect: "none",
              }}
            >
              {offset + i + 1}
            </span>
            <span>
              {line
                .split(
                  /(\b(?:const|return|function|export|default|useState|useEffect|useMemo|memo|setCount|useCallback|interpolate|spring)\b|'.*?'|".*?")/g,
                )
                .map((part, j) => (
                  <span
                    key={j}
                    style={{
                      color: /^(const|return|function|export|default)$/.test(
                        part,
                      )
                        ? "#8b51a2"
                        : /^(use|set|interpolate|spring|memo)/.test(part)
                          ? "#2955e8"
                          : /^["']/.test(part)
                            ? "#178774"
                            : undefined,
                    }}
                  >
                    {part}
                  </span>
                ))}
            </span>
          </div>
        ))}
      </pre>
    </div>
  );
}
export function ExperimentExplainer({ brief }: { brief: VideoBrief }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scene = sceneAt(brief, frame),
    local = frame - scene * sceneFrames(brief);
  const enter = spring({
    frame: local,
    fps,
    config: { damping: 22, stiffness: 100 },
  });
  const end = interpolate(
    local,
    [sceneFrames(brief) - 12, sceneFrames(brief) - 1],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const dark = brief.theme === "ink",
    ink = dark ? "#f1f4fc" : "#17253d",
    accent = dark ? "#a6bdff" : "#2955e8";
  const recordEvents =
    scene === 5 && brief.comparisonEvents.length
      ? brief.comparisonEvents
      : brief.events;
  const index = Math.min(
    recordEvents.length - 1,
    Math.floor(
      interpolate(
        local,
        [20, sceneFrames(brief) - 30],
        [0, recordEvents.length],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      ),
    ),
  );
  const active = recordEvents[index];
  const snapshot = recordEvents
    .slice(0, index + 1)
    .reverse()
    .find((e) => e.kind === "snapshot");
  return (
    <AbsoluteFill
      style={{
        fontFamily: "Onest Variable, sans-serif",
        background: dark ? "#111b30" : "#f7f9fd",
        color: ink,
        padding: "64px 86px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${dark ? "#33415c" : "#dce3ef"}`,
          paddingBottom: 25,
          fontSize: 22,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <span
            style={{
              width: 36,
              height: 36,
              background: accent,
              borderRadius: 11,
              display: "grid",
              placeItems: "center",
              color: dark ? "#111b30" : "white",
            }}
          >
            ✳
          </span>
          <b>observatory</b>
          <span style={{ color: "#8693a8", marginLeft: 18, fontSize: 17 }}>
            React & Remotion lab
          </span>
        </div>
        <span style={{ color: accent, fontSize: 17 }}>
          {brief.verified ? "Видеолаборатория" : "Запись эксперимента"} /{" "}
          {scene + 1} из 6
        </span>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 80,
          opacity: enter * end,
          transform: `translateY(${(1 - enter) * 24}px)`,
        }}
      >
        <div
          style={{
            width: scene === 0 || scene === 5 ? 660 : 530,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
              color: accent,
              fontSize: 20,
              marginBottom: 30,
            }}
          >
            <span style={{ width: 28, height: 2, background: accent }} />
            {sceneLabels[scene]}
          </div>
          <h1
            style={{
              fontSize: scene === 0 ? 70 : scene === 5 ? 64 : 54,
              lineHeight: 1.14,
              letterSpacing: -2.6,
              fontWeight: 550,
              margin: "0 0 32px",
            }}
          >
            {scene === 0 || scene === 5
              ? brief.title
              : scene === 1
                ? "Начнём с кода."
                : scene === 2
                  ? "Посмотрим, что произошло."
                  : scene === 3
                    ? "У каждого события есть причина."
                    : "Изменим подход."}
          </h1>
          <p
            style={{
              fontSize: scene === 0 ? 28 : 25,
              lineHeight: 1.65,
              color: dark ? "#b2c0d8" : "#65738b",
              margin: 0,
            }}
          >
            {sceneText(brief, scene)}
          </p>
          {scene === 5 && (
            <div style={{ marginTop: 40, color: accent, fontSize: 22 }}>
              Изменить → Наблюдать → Объяснить
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {scene === 1 || scene === 4 ? (
            <Code
              source={scene === 4 ? brief.fixedSource : brief.source}
              active={Math.floor(local / 24) % 18}
              color={accent}
            />
          ) : scene === 2 ? (
            <div style={{ display: "grid", gap: 12 }}>
              {recordEvents
                .slice(Math.max(0, index - 4), index + 1)
                .map((e) => (
                  <div
                    key={e.seq}
                    style={{
                      padding: "18px 24px",
                      borderRadius: 12,
                      border: "1px solid #dce4f2",
                      background: dark ? "#1b2b46" : "white",
                      display: "flex",
                      gap: 25,
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "JetBrains Mono",
                        fontSize: 17,
                        color: "#8b9ab3",
                      }}
                    >
                      {(e.time / 1000).toFixed(2)}s
                    </span>
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background:
                          e.kind === "commit"
                            ? "#178b7a"
                            : e.kind === "effect"
                              ? "#9364bc"
                              : accent,
                      }}
                    />
                    <span style={{ fontSize: 22 }}>{e.scope}</span>
                    <span
                      style={{
                        color: "#8491a8",
                        fontSize: 19,
                        marginLeft: "auto",
                      }}
                    >
                      {e.label}
                    </span>
                  </div>
                ))}
              {recordEvents.length === 0 && (
                <div
                  style={{
                    padding: 50,
                    border: "1px solid #dce4f2",
                    fontSize: 26,
                    color: "#8693a8",
                  }}
                >
                  Сначала запишите эксперимент в лаборатории.
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                borderRadius: 24,
                background: dark ? "#1b2b46" : "white",
                border: "1px solid #dfe5f0",
                padding: 38,
              }}
            >
              <div style={{ fontSize: 18, color: "#8793a6", marginBottom: 30 }}>
                {scene === 5 && brief.comparisonEvents.length
                  ? "Контрольный запуск исправления"
                  : "Модель эксперимента"}
              </div>
              <Diagram
                events={recordEvents}
                selected={index}
                labels={
                  scene === 5
                    ? ["Проверка", "Исправление", "Результат"]
                    : brief.diagram
                }
              />
              <div
                style={{
                  padding: "30px 24px",
                  background: dark ? "#263a5a" : "#edf2ff",
                  borderRadius: 12,
                  marginTop: 20,
                  fontFamily: "JetBrains Mono",
                  fontSize: 27,
                  color: accent,
                  overflowWrap: "anywhere",
                }}
              >
                {snapshot
                  ? JSON.stringify(snapshot.data)
                  : active?.label || "Код становится понятнее"}
              </div>
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 17,
          color: "#8793a6",
          paddingTop: 20,
        }}
      >
        <span>Объясняем сложное через эксперимент</span>
        <span>{brief.labId} / 30 fps</span>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 5,
          width: `${((frame + 1) / durationFrames(brief)) * 100}%`,
          background: accent,
        }}
      />
    </AbsoluteFill>
  );
}
