import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import "@fontsource-variable/onest";
const chapters = [
  {
    image: "overview",
    title: "Сложное становится наглядным.",
    text: "Восемь лабораторий React и Remotion. Начните с вопроса и проверьте своё предположение.",
    tag: "Исследовать",
  },
  {
    image: "laboratory",
    title: "Настоящий код. Живой результат.",
    text: "Измените TSX, запустите пример и наблюдайте за значениями в изолированной среде.",
    tag: "Экспериментировать",
  },
  {
    image: "replay",
    title: "У каждого события есть причина.",
    text: "Пройдите запись по шагам: вызовы, снимки, эффекты и коммиты рядом со строками кода.",
    tag: "Наблюдать",
  },
  {
    image: "practice",
    title: "Понимание можно проверить.",
    text: "Ответьте на вопросы, исправьте пример и подтвердите результат настоящим взаимодействием.",
    tag: "Проверять",
  },
  {
    image: "video",
    title: "Из наблюдения — в объяснение.",
    text: "Одна композиция Remotion для предпросмотра и MP4. Код, события и выводы в шести главах.",
    tag: "Объяснять",
  },
  {
    image: "collection",
    title: "Делиться открытиями.",
    text: "Готовые видеоразборы, сценарии и субтитры. React Observatory — лаборатория понятных идей.",
    tag: "Делиться",
  },
];
function Chapter({ index }: { index: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = chapters[index];
  const enter = spring({ frame, fps, config: { damping: 24, stiffness: 90 } });
  const fade = interpolate(frame, [280, 299], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        fontFamily: "Onest Variable",
        background: "#f1f5ff",
        color: "#1d2b42",
        padding: 65,
        opacity: fade,
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26 }}
      >
        <span
          style={{
            background: "#2955e8",
            color: "white",
            padding: "5px 13px",
            borderRadius: 12,
          }}
        >
          ✳
        </span>
        <b>observatory</b>
        <span style={{ fontSize: 17, color: "#8998b3", marginLeft: 15 }}>
          React & Remotion lab
        </span>
        <span style={{ marginLeft: "auto", fontSize: 17, color: "#8998b3" }}>
          Обзор продукта / {index + 1} из 6
        </span>
      </div>
      <div
        style={{
          display: "flex",
          gap: 50,
          alignItems: "center",
          flex: 1,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 25}px)`,
        }}
      >
        <div style={{ width: 350, flexShrink: 0 }}>
          <div style={{ fontSize: 20, color: "#2955e8", marginBottom: 24 }}>
            {c.tag}
          </div>
          <h1
            style={{
              fontSize: 49,
              fontWeight: 500,
              letterSpacing: -1.7,
              lineHeight: 1.16,
              margin: 0,
            }}
          >
            {c.title}
          </h1>
          <p
            style={{
              fontSize: 22,
              color: "#7c8eac",
              lineHeight: 1.75,
              marginTop: 28,
            }}
          >
            {c.text}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 38 }}>
            {chapters.map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === index ? 32 : 6,
                  height: 6,
                  borderRadius: 5,
                  background: i === index ? "#2955e8" : "#ccd8ee",
                }}
              />
            ))}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            borderRadius: 14,
            border: "1px solid #d8e2f5",
            boxShadow: "0 20px 80px #2c4a8110",
            overflow: "hidden",
            background: "white",
            transform: `scale(${interpolate(frame, [0, 299], [0.99, 1.015])})`,
          }}
        >
          <div
            style={{
              height: 30,
              display: "flex",
              gap: 6,
              alignItems: "center",
              padding: "0 13px",
              background: "#fafcff",
              borderBottom: "1px solid #e6edf8",
            }}
          >
            {["#c6d4ee", "#d3dcf0", "#e0e6f3"].map((v) => (
              <span
                key={v}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: v,
                }}
              />
            ))}
          </div>
          <Img
            src={staticFile(`tour/${c.image}.png`)}
            style={{
              display: "block",
              width: "100%",
              height: 740,
              objectFit: "cover",
              objectPosition: "top",
            }}
          />
        </div>
      </div>
      <div
        style={{
          fontSize: 17,
          color: "#91a1bc",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Изменить. Увидеть. Объяснить.</span>
        <span>React 19 / TypeScript / Remotion 4</span>
      </div>
    </AbsoluteFill>
  );
}
export function ProductTour() {
  return (
    <AbsoluteFill>
      {chapters.map((_, i) => (
        <Sequence key={i} from={i * 300} durationInFrames={300}>
          <Chapter index={i} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
