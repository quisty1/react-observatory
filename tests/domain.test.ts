import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sessionSchema,
  eventSchema,
  briefSchema,
  acceptMessage,
  buildBrief,
  durationFrames,
  sceneAt,
  subtitles,
} from "../src/domain/model";
const event = {
  seq: 0,
  time: 0,
  kind: "snapshot",
  scope: "Counter",
  label: "count",
  data: { count: 0 },
};
const session = {
  version: 1,
  id: "test-session",
  labId: "batching",
  source: "export default function App(){}",
  strict: false,
  events: [event],
  createdAt: 1,
  title: "Эксперимент",
};
test("validates portable sessions and rejects duplicates or out-of-order events", () => {
  assert.equal(sessionSchema.safeParse(session).success, true);
  assert.equal(
    sessionSchema.safeParse({ ...session, events: [event, event] }).success,
    false,
  );
  assert.equal(
    sessionSchema.safeParse({ ...session, version: 9 }).success,
    false,
  );
  assert.equal(eventSchema.safeParse({ ...event, time: -1 }).success, false);
});
test("messages from stale or foreign contexts cannot enter a recording", () => {
  const source = {};
  const data = {
    channel: "observatory",
    runId: "current",
    type: "event",
    event,
  };
  assert.equal(acceptMessage({ source, data }, source, "current"), true);
  assert.equal(acceptMessage({ source: {}, data }, source, "current"), false);
  assert.equal(acceptMessage({ source, data }, source, "old"), false);
  assert.equal(
    acceptMessage(
      { source, data: { ...data, event: { ...event, data: { x: () => 0 } } } },
      source,
      "current",
    ),
    false,
  );
});
test("video scenes cover every frame and subtitles end exactly with video", () => {
  const brief = buildBrief(
    sessionSchema.parse(session),
    "Снимок",
    "Причина",
    "Решение",
    true,
  );
  assert.equal(briefSchema.safeParse(brief).success, true);
  assert.equal(sceneAt(brief, 0), 0);
  assert.equal(sceneAt(brief, durationFrames(brief) - 1), 5);
  assert.equal(subtitles(brief).includes("00:00:48,000"), true);
});
test("custom code receives neutral report rather than a verified explanation", () => {
  const brief = buildBrief(
    sessionSchema.parse(session),
    "Снимок",
    "Проверенная причина",
    "Решение",
    false,
  );
  assert.equal(brief.verified, false);
  assert.equal(brief.explanation.includes("Проверенная причина"), false);
  assert.equal(
    briefSchema.safeParse({ ...brief, source: "x".repeat(70000) }).success,
    false,
  );
});
test("already corrected source is explained as a solution rather than the old bug", () => {
  const b = buildBrief(
    sessionSchema.parse(session),
    "Тест",
    "Все вызовы записывают 1",
    "Функции обновления вычисляют 3",
    true,
    session.source,
  );
  assert.equal(b.explanation.includes("Все вызовы записывают 1"), false);
  assert.equal(b.explanation.includes("Функции обновления вычисляют 3"), true);
});
