import { useCallback, useEffect, useRef, useState } from "react";
import { acceptMessage, MAX_EVENTS, type TraceEvent } from "../domain/model";
let runtimePromise: Promise<string> | undefined;
const runtime = () =>
  (runtimePromise ??= fetch("/sandbox-runtime.js")
    .then(async (r) => {
      if (!r.ok) throw Error("Не удалось загрузить среду. Обновите страницу.");
      return r.text();
    })
    .catch((e) => {
      runtimePromise = undefined;
      throw e;
    }));
const style = `*{box-sizing:border-box}body{margin:0;background:#fff;color:#182336;font:14px/1.65 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}#app{padding:30px 28px}section{max-width:600px;margin:auto}h1{font-size:76px;font-weight:500;line-height:1.25;letter-spacing:-4px;margin:22px 0}h1 small{font-size:18px;letter-spacing:0;color:#778295}h2{font-size:26px;line-height:1.3;margin:18px 0}p{color:#778295;font-size:13px;max-width:390px;margin:16px 0 24px}button{border:0;border-radius:7px;background:#2955e8;color:#fff;padding:11px 17px;cursor:pointer;font:600 12px/1.5 inherit;margin:4px 8px 4px 0}button.secondary{background:#eef1f7;color:#182336}button:disabled{opacity:.5}button:focus-visible,input:focus-visible{outline:3px solid #93a8ff;outline-offset:2px}.eyebrow{font-size:11px;color:#7d8797}.task-row{display:flex;gap:12px;align-items:center;margin:10px 0}.task-row span{color:#2955e8}.task-row input{width:100%;padding:10px;border:1px solid #e3e7ef;border-radius:6px;color:#182336;font:inherit}.chart{display:flex;gap:12px;align-items:flex-end;height:165px;margin:18px 0}.chart div{flex:1;background:#8ca5ff;border-radius:5px 5px 0 0}.chart div:nth-child(even){background:#2955e8}.runtime-error{padding:20px;background:#fff0f0;color:#a73444;border-radius:8px}`;
export function useSandbox() {
  const iframe = useRef<HTMLIFrameElement>(null);
  const worker = useRef<Worker | null>(null);
  const current = useRef({ id: "", code: "", serial: 0 });
  const [srcDoc, setSrcDoc] = useState("");
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<
    "idle" | "compiling" | "running" | "error"
  >("idle");
  const [source, setSource] = useState("");
  const [strict, setStrict] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const w = new Worker(new URL("./compiler.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    return () => {
      current.current.id = "";
      w.terminate();
    };
  }, []);
  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (!acceptMessage(e, iframe.current?.contentWindow, current.current.id))
        return;
      const m = e.data;
      if (m.type === "ready") {
        iframe.current?.contentWindow?.postMessage(
          {
            channel: "observatory-execute",
            runId: current.current.id,
            code: current.current.code,
          },
          "*",
        );
        setStatus("running");
      } else if (m.type === "event")
        setEvents((es) => (es.length < MAX_EVENTS ? [...es, m.event] : es));
      else if (m.type === "error") {
        setError(m.message || "Ошибка выполнения");
        setStatus("error");
      } else if (m.type === "stopped") setNotice(m.message);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);
  const run = useCallback(async (code: string, strictMode = false) => {
    const serial = ++current.current.serial;
    current.current.id = crypto.randomUUID();
    setError("");
    setNotice("");
    setEvents([]);
    setStatus("compiling");
    setSource(code);
    setStrict(strictMode);
    setSrcDoc("");
    try {
      const w = worker.current;
      if (!w) throw Error("Среда ещё загружается. Повторите запуск.");
      const compiled = await new Promise<string>((resolve, reject) => {
        const handler = (e: MessageEvent) => {
          if (e.data.id !== serial) return;
          w.removeEventListener("message", handler);
          e.data.error ? reject(Error(e.data.error)) : resolve(e.data.code);
        };
        w.addEventListener("message", handler);
        w.postMessage({ source: code, id: serial });
      });
      const text = await runtime();
      if (serial !== current.current.serial) return;
      current.current.code = compiled;
      setSrcDoc(
        `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none';"><style>${style}</style></head><body><div id="app"></div><script>window.__OBS_CONFIG__=${JSON.stringify({ runId: current.current.id, strict: strictMode })};<\/script><script>${text.replace(/<\/script/gi, "<\\/script")}<\/script></body></html>`,
      );
    } catch (e) {
      if (serial !== current.current.serial) return;
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, []);
  const stop = useCallback(() => {
    current.current.serial++;
    current.current.id = "";
    setSrcDoc("");
    setStatus("idle");
  }, []);
  return {
    iframe,
    srcDoc,
    events,
    error,
    status,
    source,
    strict,
    notice,
    run,
    stop,
    clear: () => setEvents([]),
  };
}
