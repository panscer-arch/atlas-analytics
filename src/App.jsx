import lottie from "lottie-web";
import { useEffect, useRef, useState } from "react";
import matrixGateAnimation from "./assets/matrix-gate-lottie.json";
import { AnalyticsPage, AnalyticsRestoredPage } from "./modules/analytics";

const ACCESS_STORAGE_KEY = "supersus.access.v1";
const ACCESS_ATTEMPTS_STORAGE_KEY = "supersus.access.attempts.v1";
const ACCESS_PASSWORD_HASH = "734c3a7459ad629c114c70863427e1a5bb9161ae63407963685878e6e1af9c1e";
const ACCESS_MAX_FAILED_ATTEMPTS = 5;
const ACCESS_LOCKOUT_MS = 10 * 60 * 1000;

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getStoredAccess() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(ACCESS_STORAGE_KEY) === ACCESS_PASSWORD_HASH;
  } catch {
    return false;
  }
}

function readAccessAttempts() {
  if (typeof window === "undefined") {
    return { count: 0, lockedUntil: 0 };
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(ACCESS_ATTEMPTS_STORAGE_KEY) || "{}");
    return {
      count: Number.isFinite(parsed.count) ? parsed.count : 0,
      lockedUntil: Number.isFinite(parsed.lockedUntil) ? parsed.lockedUntil : 0,
    };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function saveAccessAttempts(next) {
  window.localStorage.setItem(ACCESS_ATTEMPTS_STORAGE_KEY, JSON.stringify(next));
}

function clearAccessAttempts() {
  window.localStorage.removeItem(ACCESS_ATTEMPTS_STORAGE_KEY);
}

function formatLockoutTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function MatrixGateAnimation() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const animation = lottie.loadAnimation({
      animationData: matrixGateAnimation,
      autoplay: true,
      container: containerRef.current,
      loop: true,
      renderer: "svg",
      rendererSettings: {
        preserveAspectRatio: "xMidYMid slice",
      },
    });

    return () => animation.destroy();
  }, []);

  return (
    <div className="supersus-access-lottie" aria-hidden="true">
      <div ref={containerRef} className="supersus-access-lottie-stage" />
      <div className="supersus-access-lottie-label">
        <span>simulation layer</span>
        <strong>access node</strong>
      </div>
    </div>
  );
}

function AccessGate({ children }) {
  const [hasAccess, setHasAccess] = useState(getStoredAccess);
  const [attempts, setAttempts] = useState(readAccessAttempts);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const lockRemainingMs = Math.max(0, attempts.lockedUntil - now);
  const isLocked = lockRemainingMs > 0;
  const attemptsLeft = Math.max(0, ACCESS_MAX_FAILED_ATTEMPTS - attempts.count);

  useEffect(() => {
    if (!isLocked) {
      if (attempts.lockedUntil) {
        clearAccessAttempts();
        setAttempts({ count: 0, lockedUntil: 0 });
        setError("");
      }

      return undefined;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [attempts.lockedUntil, isLocked]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (isLocked) {
      return;
    }

    setIsChecking(true);
    setError("");

    try {
      const hash = await sha256Hex(password.trim());

      if (hash !== ACCESS_PASSWORD_HASH) {
        const nextCount = attempts.count + 1;
        const shouldLock = nextCount >= ACCESS_MAX_FAILED_ATTEMPTS;
        const nextAttempts = {
          count: shouldLock ? ACCESS_MAX_FAILED_ATTEMPTS : nextCount,
          lockedUntil: shouldLock ? Date.now() + ACCESS_LOCKOUT_MS : 0,
        };

        saveAccessAttempts(nextAttempts);
        setAttempts(nextAttempts);
        setNow(Date.now());
        setError(shouldLock ? "Слишком много попыток. Ввод заблокирован на 10 минут." : "Неверный пароль");
        setPassword("");
        return;
      }

      window.localStorage.setItem(ACCESS_STORAGE_KEY, ACCESS_PASSWORD_HASH);
      clearAccessAttempts();
      setHasAccess(true);
    } catch {
      setError("Не удалось проверить пароль. Обнови страницу и попробуй еще раз.");
    } finally {
      setIsChecking(false);
    }
  }

  if (hasAccess) {
    return children;
  }

  return (
    <main className="supersus-access">
      <form className="supersus-access-card" onSubmit={handleSubmit}>
        <section className="supersus-access-visual">
          <MatrixGateAnimation />
          <div className="supersus-access-signal">
            <span />
            <strong>Simulation gateway</strong>
          </div>
        </section>
        <section className="supersus-access-panel">
          <div className="supersus-access-brand">
            <div className="supersus-access-mark">S</div>
            <div>
              <p className="supersus-access-kicker">SuperSUS System</p>
              <h1>Закрытый доступ</h1>
            </div>
          </div>
          <p className="supersus-access-copy">Введите пароль, чтобы открыть систему на этом устройстве.</p>
          <label className="supersus-access-field">
            <span>Код доступа</span>
            <input
              autoComplete="current-password"
              autoFocus
              disabled={isLocked}
              inputMode="numeric"
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isLocked ? `Повтор через ${formatLockoutTime(lockRemainingMs)}` : "Введите код"}
              type="password"
              value={password}
            />
          </label>
          <div className="supersus-access-meta" aria-live="polite">
            {isLocked ? (
              <span>Ввод заблокирован: {formatLockoutTime(lockRemainingMs)}</span>
            ) : (
              <span>Осталось попыток: {attemptsLeft}</span>
            )}
          </div>
          {error ? <p className="supersus-access-error">{error}</p> : null}
          <button className="supersus-access-button" disabled={isChecking || isLocked || !password.trim()} type="submit">
            {isLocked ? "Доступ временно закрыт" : isChecking ? "Проверяю..." : "Войти"}
          </button>
        </section>
      </form>
    </main>
  );
}

function App() {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const page = pathname === "/legacy" || pathname === "/analytics" ? <AnalyticsRestoredPage /> : <AnalyticsPage />;

  return <AccessGate>{page}</AccessGate>;
}

export default App;
