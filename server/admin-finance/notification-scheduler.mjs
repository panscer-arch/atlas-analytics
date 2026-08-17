export function createNotificationScheduler(options = {}) {
  const worker = options.worker;
  if (!worker || typeof worker.runOnce !== "function") throw new TypeError("notification worker is required");
  const intervalMs = Number(options.intervalMs ?? 15_000);
  if (!Number.isSafeInteger(intervalMs) || intervalMs < 1_000 || intervalMs > 300_000) throw new TypeError("notification interval is invalid");
  const setIntervalImpl = options.setIntervalImpl || setInterval;
  const clearIntervalImpl = options.clearIntervalImpl || clearInterval;
  const onError = options.onError || (() => {});
  if (typeof setIntervalImpl !== "function" || typeof clearIntervalImpl !== "function" || typeof onError !== "function") throw new TypeError("notification scheduler dependency is invalid");
  let timer = null;
  let running = false;

  const tick = async () => {
    if (running) return { skipped: "overlap" };
    running = true;
    try {
      return await worker.runOnce();
    } catch (error) {
      onError({ code: String(error?.code || "notification_worker_failed") });
      return { failed: true };
    } finally {
      running = false;
    }
  };

  return Object.freeze({
    tick,
    start() {
      if (timer !== null) return false;
      timer = setIntervalImpl(tick, intervalMs);
      return true;
    },
    stop() {
      if (timer === null) return false;
      clearIntervalImpl(timer);
      timer = null;
      return true;
    },
    get started() { return timer !== null; },
  });
}
