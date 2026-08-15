const API_BASE = (import.meta.env.VITE_CONTENT_API_BASE_URL || "").trim().replace(/\/+$/, "");

function url(path: string) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(url(path), {
    ...options,
    cache: "no-store",
    credentials: "include",
    headers: { Accept: "application/json", ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    const error = new Error(payload?.error || payload?.code || `http_${response.status}`) as Error & {
      status?: number; payload?: Record<string, unknown>;
    };
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function memberHeaders(memberId: string) {
  return memberId ? { "X-Atlas-Member-Id": memberId } : {};
}

export function loadListingsCrm(memberId = "") {
  return request("/api/marketing/listings-crm/bootstrap", { headers: memberHeaders(memberId) });
}

export function createListingsRecord(memberId: string, record: Record<string, unknown>) {
  return request("/api/marketing/listings-crm/records", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...memberHeaders(memberId) },
    body: JSON.stringify(record),
  });
}

export function patchListingsRecord(memberId: string, recordId: string, version: number, changes: Record<string, unknown>) {
  return request(`/api/marketing/listings-crm/records/${encodeURIComponent(recordId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "If-Match": String(version), ...memberHeaders(memberId) },
    body: JSON.stringify(changes),
  });
}

export function archiveListingsRecord(memberId: string, recordId: string, version: number) {
  return request(`/api/marketing/listings-crm/records/${encodeURIComponent(recordId)}/archive`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "If-Match": String(version), ...memberHeaders(memberId) },
    body: JSON.stringify({}),
  });
}

export function generateListingsPlan(memberId: string, date: string) {
  return request("/api/marketing/listings-crm/plan/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...memberHeaders(memberId) },
    body: JSON.stringify({ date }),
  });
}

export function claimListingsTask(memberId: string, taskId: string) {
  return request(`/api/marketing/listings-crm/tasks/${encodeURIComponent(taskId)}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...memberHeaders(memberId) },
    body: JSON.stringify({ memberId }),
  });
}

export function patchListingsTask(memberId: string, taskId: string, version: number, changes: Record<string, unknown>) {
  return request(`/api/marketing/listings-crm/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "If-Match": String(version), ...memberHeaders(memberId) },
    body: JSON.stringify(changes),
  });
}

export function releaseListingsTask(memberId: string, taskId: string, version: number) {
  return request(`/api/marketing/listings-crm/tasks/${encodeURIComponent(taskId)}/release`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "If-Match": String(version), ...memberHeaders(memberId) },
    body: JSON.stringify({}),
  });
}
