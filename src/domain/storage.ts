import { openDB } from "idb";
import { sessionSchema, type ExperimentSession } from "./model";
const db = () =>
  openDB("react-observatory", 1, {
    upgrade(d) {
      d.createObjectStore("sessions", { keyPath: "id" });
      d.createObjectStore("settings");
    },
  });
export async function saveSession(session: ExperimentSession) {
  const d = await db();
  await d.put("sessions", sessionSchema.parse(session));
}
export async function listSessions(): Promise<ExperimentSession[]> {
  const d = await db();
  const all = await d.getAll("sessions");
  return all
    .filter((s) => sessionSchema.safeParse(s).success)
    .sort((a, b) => b.createdAt - a.createdAt);
}
export async function removeSession(id: string) {
  const d = await db();
  await d.delete("sessions", id);
}
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const d = await db();
  return (await d.get("settings", key)) ?? fallback;
}
export async function setSetting(key: string, value: unknown) {
  const d = await db();
  await d.put("settings", value, key);
}
