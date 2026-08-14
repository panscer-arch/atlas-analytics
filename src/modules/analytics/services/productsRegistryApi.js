const BASE_URL = "/api/products";

async function request(path = "", options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error(payload?.error || `products_request_failed_${response.status}`);
    error.status = response.status;
    error.current = payload?.current;
    throw error;
  }
  return payload;
}

export function listProducts(params) {
  const queryParams = new URLSearchParams(params instanceof URLSearchParams ? params : params || {});
  queryParams.set("scope", "top");
  const query = queryParams.toString();
  return request(query ? `?${query}` : "");
}

export function getProduct(idOrSlug) {
  return request(`/${encodeURIComponent(idOrSlug)}`);
}

export function createProduct(value) {
  return request("", { method: "POST", body: JSON.stringify(value) });
}

export function updateProduct(id, value, version) {
  return request(`/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "If-Match": `"${version}"` }, body: JSON.stringify({ ...value, version }) });
}

export function addProductEntry(id, value, version) {
  return request(`/${encodeURIComponent(id)}/entries`, { method: "POST", headers: { "If-Match": `"${version}"` }, body: JSON.stringify({ ...value, version }) });
}

export function addProductLink(id, value, version) {
  return request(`/${encodeURIComponent(id)}/links`, { method: "POST", headers: { "If-Match": `"${version}"` }, body: JSON.stringify({ ...value, version }) });
}

export function transitionProduct(id, value, version) {
  return request(`/${encodeURIComponent(id)}/transition`, { method: "POST", headers: { "If-Match": `"${version}"` }, body: JSON.stringify({ ...value, version }) });
}

export function archiveProduct(id, actorName, version) {
  return request(`/${encodeURIComponent(id)}/archive`, { method: "POST", headers: { "If-Match": `"${version}"` }, body: JSON.stringify({ actorName, version }) });
}

export function restoreProduct(id, actorName, version) {
  return request(`/${encodeURIComponent(id)}/restore`, { method: "POST", headers: { "If-Match": `"${version}"` }, body: JSON.stringify({ actorName, version }) });
}

export function restoreProductVersion(id, auditEventId, actorName, version) {
  return request(`/${encodeURIComponent(id)}/restore-version`, { method: "POST", headers: { "If-Match": `"${version}"` }, body: JSON.stringify({ auditEventId, actorName, version }) });
}

export function productExportUrl(idOrSlug) {
  return `${BASE_URL}/${encodeURIComponent(idOrSlug)}/export.md`;
}
