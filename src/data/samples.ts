import recordings from "./recordings.json" with { type: "json" };
import type {
  LabDefinition,
  ExperimentSession,
  TraceEvent,
} from "../domain/model";
export function sampleSession(
  lab: LabDefinition,
  variant: "problem" | "fixed" = "problem",
): ExperimentSession {
  const entry = (
    recordings as unknown as Record<
      string,
      { problem: TraceEvent[]; fixed: TraceEvent[] }
    >
  )[lab.id];
  return {
    version: 1,
    id: "sample-" + lab.id + "-" + variant,
    labId: lab.id,
    title: lab.short,
    source: variant === "problem" ? lab.source : lab.fixedSource,
    strict: false,
    events: entry?.[variant] || [],
    createdAt: 0,
  };
}
