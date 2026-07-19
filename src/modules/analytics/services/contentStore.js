const CONTENT_API_BASE_URL = (import.meta.env.VITE_CONTENT_API_BASE_URL || "").trim().replace(/\/+$/, "");

function contentApiUrl(key) {
  const path = `/api/content/${encodeURIComponent(key)}`;
  return CONTENT_API_BASE_URL ? `${CONTENT_API_BASE_URL}${path}` : path;
}

function apiUrl(path) {
  return CONTENT_API_BASE_URL ? `${CONTENT_API_BASE_URL}${path}` : path;
}

export async function loadServerContent(key) {
  const result = await loadServerContentResult(key);
  return result.ok && result.exists ? result.value : null;
}

export async function loadServerContentResult(key) {
  try {
    const response = await fetch(contentApiUrl(key), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
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
  try {
    const response = await fetch(contentApiUrl(key), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function postServerJson(path, value) {
  try {
    const response = await fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
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
    });
    const payload = await response.json().catch(() => ({}));
    return { ok: response.ok && payload?.ok !== false, status: response.status, payload };
  } catch (error) {
    return { ok: false, status: 0, payload: { error: error?.message || "network_error" } };
  }
}
