import path from "node:path";
import { bundle } from "@remotion/bundler";
import {
  renderMedia,
  selectComposition,
  makeCancelSignal,
} from "@remotion/renderer";
import type { VideoBrief } from "../src/domain/model";
let bundled: Promise<string> | undefined;
export async function getBundle() {
  return (bundled ??= bundle({
    entryPoint: path.resolve("src/video/index.ts"),
  }).catch((e) => {
    bundled = undefined;
    throw e;
  }));
}
export async function renderVideo(
  brief: VideoBrief,
  file: string,
  onProgress: (v: number) => void,
  signal: AbortSignal,
) {
  const serveUrl = await getBundle();
  if (signal.aborted) return;
  const inputProps = { brief };
  const composition = await selectComposition({
    serveUrl,
    id: "ExperimentExplainer",
    inputProps,
  });
  const { cancel, cancelSignal } = makeCancelSignal();
  signal.addEventListener("abort", cancel, { once: true });
  try {
    if (signal.aborted) return;
    await renderMedia({
      serveUrl,
      composition,
      inputProps,
      outputLocation: file,
      codec: "h264",
      crf: 20,
      concurrency: 3,
      cancelSignal,
      onProgress: ({ progress }) => onProgress(progress),
      overwrite: true,
    });
  } finally {
    signal.removeEventListener("abort", cancel);
  }
}

export async function renderTour(
  file: string,
  onProgress: (v: number) => void,
) {
  const serveUrl = await getBundle();
  const composition = await selectComposition({ serveUrl, id: "ProductTour" });
  await renderMedia({
    serveUrl,
    composition,
    outputLocation: file,
    codec: "h264",
    crf: 20,
    concurrency: 3,
    onProgress: ({ progress }) => onProgress(progress),
    overwrite: true,
  });
}
