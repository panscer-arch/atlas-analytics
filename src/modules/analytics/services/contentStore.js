export async function loadServerContent(key) {
  try {
    const response = await fetch(`/api/content/${encodeURIComponent(key)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = await response.json();
    return payload?.exists ? payload.value : null;
  } catch {
    return null;
  }
}

export async function saveServerContent(key, value) {
  try {
    const response = await fetch(`/api/content/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
