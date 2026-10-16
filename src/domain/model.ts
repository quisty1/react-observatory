import { z } from "zod";
export const MAX_EVENTS = 1000;
export const MAX_SESSION_BYTES = 8_000_000;
export const kinds = [
  "render",
  "commit",
  "effect",
  "cleanup",
  "snapshot",
  "action",
  "console",
  "error",
] as const;
const jsonValue: z.ZodType<any> = z.lazy(() =>
  z.union([
    z.string().max(10000),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValue).max(100),
    z.record(z.string().max(100), jsonValue),
  ]),
);
export const eventSchema = z
  .object({
    seq: z.number().int().min(0).max(100000),
    time: z.number().min(0).max(86400000),
    kind: z.enum(kinds),
    line: z.number().int().min(1).max(65536).optional(),
    scope: z.string().max(100),
    label: z.string().max(300),
    data: jsonValue,
  })
  .strict();
export type TraceEvent = z.infer<typeof eventSchema>;
export const sessionSchema = z
  .object({
    version: z.literal(1),
    id: z.string().min(1).max(100),
    labId: z.string().min(1).max(100),
    source: z.string().max(65536),
    strict: z.boolean(),
    events: z.array(eventSchema).max(MAX_EVENTS),
    createdAt: z.number().nonnegative(),
    title: z.string().min(1).max(160),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (new TextEncoder().encode(JSON.stringify(s)).length > MAX_SESSION_BYTES)
      ctx.addIssue({
        code: "custom",
        message: "Запись должна быть меньше 8 МБ",
      });
    for (let i = 1; i < s.events.length; i++) {
      if (
        s.events[i].seq <= s.events[i - 1].seq ||
        s.events[i].time < s.events[i - 1].time
      )
        ctx.addIssue({
          code: "custom",
          message: "События должны идти в порядке записи",
          path: ["events", i],
        });
    }
  });
export type ExperimentSession = z.infer<typeof sessionSchema>;
export const briefSchema = z
  .object({
    version: z.literal(1),
    title: z.string().min(1).max(160),
    labId: z.string().max(100),
    source: z.string().max(65536),
    fixedSource: z.string().max(65536),
    events: z.array(eventSchema).max(60),
    comparisonEvents: z.array(eventSchema).max(60).default([]),
    diagram: z
      .array(z.string().max(40))
      .length(3)
      .default(["Событие", "Очередь", "Результат"]),
    question: z.string().max(500),
    explanation: z.string().max(1500),
    solution: z.string().max(1500),
    conclusion: z.string().max(500),
    verified: z.boolean(),
    pace: z.enum(["normal", "slow"]),
    theme: z.enum(["cobalt", "ink"]),
    caption: z.string().max(500),
  })
  .strict();
export type VideoBrief = z.infer<typeof briefSchema>;
export type Task = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};
export type LabDefinition = {
  id: string;
  number: string;
  title: string;
  short: string;
  category: "React" | "Remotion";
  difficulty: string;
  minutes: number;
  color: string;
  tags: string[];
  question: string;
  summary: string;
  explanation: string;
  solution: string;
  conclusion: string;
  source: string;
  fixedSource: string;
  steps: string[];
  tasks: [Task, Task];
  verify: { instruction: string; check: (events: TraceEvent[]) => boolean };
  diagram: string[];
};
export function acceptMessage(
  message: { source: unknown; data: any },
  source: unknown,
  runId: string,
) {
  if (
    message.source !== source ||
    !message.data ||
    message.data.channel !== "observatory" ||
    message.data.runId !== runId
  )
    return false;
  const m = message.data;
  if (m.type === "event") return eventSchema.safeParse(m.event).success;
  return (
    (m.type === "ready" || m.type === "stopped" || m.type === "error") &&
    (m.message === undefined || typeof m.message === "string")
  );
}
export function buildBrief(
  s: ExperimentSession,
  title: string,
  explanation: string,
  solution: string,
  verified: boolean,
  fixedSource = s.source,
): VideoBrief {
  return {
    version: 1,
    title,
    labId: s.labId,
    source: s.source,
    fixedSource,
    events: s.events.slice(0, 60),
    comparisonEvents: [],
    diagram: ["Событие", "Очередь", "Результат"],
    question: verified
      ? s.source === fixedSource
        ? "Почему исправленный вариант работает?"
        : "Предскажите результат. Что произойдёт при запуске?"
      : "Что произошло в этом эксперименте?",
    explanation: verified
      ? s.source === fixedSource
        ? solution
        : explanation
      : "Это запись пользовательского эксперимента. События показывают наблюдаемый результат; объяснение можно добавить в подписи.",
    solution: verified
      ? solution
      : "Сравните значения и последовательность событий. Сформулируйте вывод по результатам запуска.",
    conclusion: verified
      ? "Проверяйте предположение небольшим экспериментом."
      : "Запись помогает проверить гипотезу и обсудить результат.",
    verified,
    pace: "normal",
    theme: "cobalt",
    caption: "",
  };
}
export const sceneLabels = [
  "Вопрос",
  "Исходный код",
  "Наблюдение",
  "Причина",
  "Исправление",
  "Вывод",
];
export function sceneFrames(b: VideoBrief) {
  return b.pace === "slow" ? 300 : 240;
}
export function durationFrames(b: VideoBrief) {
  return 6 * sceneFrames(b);
}
export function sceneAt(b: VideoBrief, frame: number) {
  return Math.max(0, Math.min(5, Math.floor(frame / sceneFrames(b))));
}
export function sceneText(b: VideoBrief, i: number) {
  return [
    b.question,
    "Запустим небольшой пример и проследим за изменениями.",
    b.caption || "Посмотрите на события и значения в записи.",
    b.explanation,
    b.solution,
    b.conclusion,
  ][i];
}
export function stamp(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
}
export function subtitles(b: VideoBrief) {
  const ms = (sceneFrames(b) / 30) * 1000;
  return sceneLabels
    .map(
      (_, i) =>
        `${i + 1}\n${stamp(i * ms)} --> ${stamp((i + 1) * ms)}\n${sceneText(b, i)}\n`,
    )
    .join("\n");
}
export function script(b: VideoBrief) {
  return (
    `# ${b.title}\n\n${b.verified ? "Проверенный учебный разбор" : "Пользовательский видеоотчёт"}\n\n` +
    sceneLabels.map((t, i) => `## ${t}\n\n${sceneText(b, i)}\n`).join("\n")
  );
}
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const eventNames: Record<TraceEvent["kind"], string> = {
  render: "Вызов",
  commit: "Коммит",
  effect: "Эффект",
  cleanup: "Очистка",
  snapshot: "Снимок",
  action: "Действие",
  console: "Консоль",
  error: "Ошибка",
};

export function serializeSession(session: ExperimentSession) {
  return JSON.stringify(sessionSchema.parse(session));
}
