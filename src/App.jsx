import lottie from "lottie-web";
import { useEffect, useRef, useState } from "react";
import matrixGateAnimation from "./assets/matrix-gate-lottie.json";
import { AnalyticsPage, AnalyticsRestoredPage } from "./modules/analytics";

const ACCESS_STORAGE_KEY = "supersus.access.v1";
const ACCESS_PASSWORD_HASH = "734c3a7459ad629c114c70863427e1a5bb9161ae63407963685878e6e1af9c1e";

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
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsChecking(true);
    setError("");

    try {
      const hash = await sha256Hex(password.trim());

      if (hash !== ACCESS_PASSWORD_HASH) {
        setError("Неверный пароль");
        setPassword("");
        return;
      }

      window.localStorage.setItem(ACCESS_STORAGE_KEY, ACCESS_PASSWORD_HASH);
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
        <MatrixGateAnimation />
        <div className="supersus-access-mark">S</div>
        <div>
          <p className="supersus-access-kicker">SuperSUS System</p>
          <h1>Закрытый доступ</h1>
          <p className="supersus-access-copy">Введите пароль, чтобы открыть систему на этом устройстве.</p>
        </div>
        <label className="supersus-access-field">
          <span>Пароль</span>
          <input
            autoComplete="current-password"
            autoFocus
            inputMode="numeric"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Введите код"
            type="password"
            value={password}
          />
        </label>
        {error ? <p className="supersus-access-error">{error}</p> : null}
        <button className="supersus-access-button" disabled={isChecking || !password.trim()} type="submit">
          {isChecking ? "Проверяю..." : "Войти"}
        </button>
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
