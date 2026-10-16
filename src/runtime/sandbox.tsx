import * as React from "react";
import { createExecutionGuard } from "./guard";
import { createRoot } from "react-dom/client";
import * as Remotion from "remotion";
import * as Player from "@remotion/player";
import * as JSX from "react/jsx-runtime";
const config = (window as any).__OBS_CONFIG__ as {
  runId: string;
  strict: boolean;
};
const realNow = performance.now.bind(performance);
const start = realNow();
let seq = 0;
let stopped = false;
let events = 0;
let recordedBytes = 0;
const send = (type: string, extra: Record<string, unknown> = {}) =>
  parent.postMessage(
    { channel: "observatory", runId: config.runId, type, ...extra },
    "*",
  );
function serial(value: unknown) {
  try {
    return JSON.parse(
      JSON.stringify(value, (_k, v) =>
        typeof v === "bigint"
          ? String(v)
          : typeof v === "function"
            ? "[function]"
            : v,
      ),
    );
  } catch {
    return "[несериализуемое значение]";
  }
}
function emit(
  kind: string,
  scope: string,
  label: string,
  data: unknown = {},
  line?: number,
) {
  if (stopped || events >= 1000) return;
  events++;
  const safe = serial(data);
  const payload = JSON.stringify(safe);
  recordedBytes += new TextEncoder().encode(payload).length + 2000;
  if (recordedBytes > 7_500_000) {
    stopped = true;
    send("stopped", {
      message: "Запись достигла 8 МБ. Сохраните её и начните новый запуск.",
    });
    return;
  }
  send("event", {
    event: {
      seq: seq++,
      time: Math.round(realNow() - start),
      kind,
      ...(line ? { line } : {}),
      scope: String(scope).slice(0, 100),
      label: String(label).slice(0, 300),
      data: payload.length < 10000 ? safe : "[большое значение]",
    },
  });
  if (events === 1000)
    send("stopped", {
      message:
        "Достигнут лимит 1000 событий. Очистите запись и запустите заново.",
    });
}
const trace = {
  render: (scope: string, data: unknown = {}, line?: number) =>
    emit("render", scope, "Вызов компонента", data, line),
  snapshot: (scope: string, data: unknown, line?: number) =>
    emit("snapshot", scope, "Снимок значений", data, line),
  action: (label: string, data: unknown = {}, line?: number) =>
    emit("action", "Пользователь", label, data, line),
  effect: (
    scope: string,
    label = "Эффект запущен",
    data: unknown = {},
    line?: number,
  ) => emit("effect", scope, label, data, line),
  cleanup: (scope: string, label = "Эффект очищен", line?: number) =>
    emit("cleanup", scope, label, {}, line),
  event: (label: string, data: unknown = {}, line?: number) =>
    emit("snapshot", "Эксперимент", label, data, line),
};
function TraceBoundary({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <React.Profiler
      id={name}
      onRender={(id, phase, actualDuration) =>
        emit("commit", id, phase, {
          durationMs: Math.round(actualDuration * 100) / 100,
        })
      }
    >
      {children}
    </React.Profiler>
  );
}
function useSnapshot(scope: string, data: unknown, line?: number) {
  React.useLayoutEffect(() => {
    trace.snapshot(scope, data, line);
  });
}
const sdk = { trace, TraceBoundary, useSnapshot };
const realError = console.error.bind(console);
for (const name of ["log", "warn", "error"] as const) {
  console[name] = (...args: unknown[]) => {
    emit("console", "console", name, { values: args.map(serial) });
    if (name === "error") realError(...args);
  };
}
window.addEventListener("error", (e) => {
  emit("error", "Runtime", e.message);
  send("error", { message: e.message });
});
window.addEventListener("unhandledrejection", (e) =>
  send("error", { message: String(e.reason?.message || e.reason) }),
);
class Boundary extends React.Component<
  { children: React.ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  componentDidCatch(error: Error) {
    send("error", { message: error.message });
  }
  render() {
    return this.state.error ? (
      <div className="runtime-error">{this.state.error}</div>
    ) : (
      this.props.children
    );
  }
}
const modules: Record<string, unknown> = {
  react: React,
  "react/jsx-runtime": JSX,
  "react-dom/client": { createRoot },
  "@observatory/lab": sdk,
  remotion: Remotion,
  "@remotion/player": Player,
};
const guard = createExecutionGuard(realNow);
window.addEventListener(
  "message",
  (e) => {
    if (
      e.source !== parent ||
      e.data?.channel !== "observatory-execute" ||
      e.data.runId !== config.runId
    )
      return;
    try {
      const exports: Record<string, any> = {};
      new Function("require", "exports", "React", "__guard", e.data.code)(
        (name: string) => {
          if (!(name in modules)) throw Error("Недоступный модуль: " + name);
          return modules[name];
        },
        exports,
        React,
        guard,
      );
      const App = exports.default;
      if (!App) throw Error("Добавьте export default для компонента App");
      const tree = (
        <Boundary>
          <TraceBoundary name="Root">
            <App />
          </TraceBoundary>
        </Boundary>
      );
      createRoot(document.getElementById("app")!).render(
        config.strict ? <React.StrictMode>{tree}</React.StrictMode> : tree,
      );
    } catch (error) {
      send("error", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  },
  { once: true },
);
send("ready");
window.addEventListener("pagehide", () => {
  stopped = true;
});
