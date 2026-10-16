import { compile } from "./compiler";
self.onmessage = (e: MessageEvent<{ source: string; id: number }>) => {
  try {
    self.postMessage({ id: e.data.id, code: compile(e.data.source) });
  } catch (error) {
    self.postMessage({
      id: e.data.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
