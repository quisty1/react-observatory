// Each event-loop turn gets a fresh budget. A legitimate long animation
// must not spend the same budget across many short frame callbacks.
export function createExecutionGuard(now: () => number, budget = 800) {
  let active = false,
    start = 0;
  return () => {
    if (!active) {
      active = true;
      start = now();
      queueMicrotask(() => {
        active = false;
      });
    }
    if (now() - start > budget)
      throw Error(
        "Выполнение остановлено: слишком долгий цикл. Исправьте код и запустите снова.",
      );
  };
}
