const CONTENT_API_BASE_URL = (import.meta.env.VITE_CONTENT_API_BASE_URL || "").trim().replace(/\/+$/, "");

function contentApiUrl(key) {
  const path = `/api/content/${encodeURIComponent(key)}`;
  return CONTENT_API_BASE_URL ? `${CONTENT_API_BASE_URL}${path}` : path;
}

function apiUrl(path) {
  return CONTENT_API_BASE_URL ? `${CONTENT_API_BASE_URL}${path}` : path;
}

let marketingAccessPromise = null;

async function ensureMarketingBrowserSession() {
  if (typeof window === "undefined") return true;
  const currentUrl = new URL(window.location.href);
  const code = currentUrl.searchParams.get("marketing_access") || "";
  if (!code) return true;
  if (marketingAccessPromise) return marketingAccessPromise;

  marketingAccessPromise = fetch(apiUrl("/api/marketing/browser-session"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: "include",
    body: JSON.stringify({ code }),
  }).then(async (response) => {
    if (!response.ok) return false;
    currentUrl.searchParams.delete("marketing_access");
    window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
    return true;
  }).catch(() => false);

  return marketingAccessPromise;
}

export async function loadServerContent(key) {
  const result = await loadServerContentResult(key);
  return result.ok && result.exists ? result.value : null;
}

export async function loadServerContentResult(key) {
  try {
    await ensureMarketingBrowserSession();
    const response = await fetch(contentApiUrl(key), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "include",
    });

    if (!response.ok) {
      return { ok: false, exists: false, value: null, status: response.status };
    }

    const payload = await response.json();
    return {
      ok: payload?.ok !== false,
      exists: payload?.exists === true,
      value: payload?.exists ? payload.value : null,
      status: response.status,
    };
  } catch {
    return { ok: false, exists: false, value: null, status: 0 };
  }
}

export async function saveServerContent(key, value) {
  const result = await saveServerContentResult(key, value);
  return result.ok;
}

export async function saveServerContentResult(key, value) {
  try {
    await ensureMarketingBrowserSession();
    const response = await fetch(contentApiUrl(key), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ value }),
    });

    const payload = await response.json().catch(() => ({}));
    return {
      ok: response.ok && payload?.ok !== false,
      status: response.status,
      error: payload?.error || "",
    };
  } catch {
    return { ok: false, status: 0, error: "network_error" };
  }
}

export async function postServerJson(path, value) {
  try {
    const response = await fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      body: JSON.stringify(value),
    });
    const payload = await response.json().catch(() => ({}));
    return { ok: response.ok && payload?.ok !== false, status: response.status, payload };
  } catch (error) {
    return { ok: false, status: 0, payload: { error: error?.message || "network_error" } };
  }
}

export async function getServerJson(path) {
  try {
    const response = await fetch(apiUrl(path), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "include",
    });
    const payload = await response.json().catch(() => ({}));
    return { ok: response.ok && payload?.ok !== false, status: response.status, payload };
  } catch (error) {
    return { ok: false, status: 0, payload: { error: error?.message || "network_error" } };
  }
}
