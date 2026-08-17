export function parseHttpsRpcUrls(value, label = "rpc_urls") {
  const items = String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
  if (!items.length || items.length > 4) throw new Error(`${label}_invalid`);
  return items.map((item) => {
    let url;
    try {
      url = new URL(item);
    } catch {
      throw new Error(`${label}_invalid`);
    }
    if (url.protocol !== "https:" || url.username || url.password || url.hash) {
      throw new Error(`${label}_invalid`);
    }
    return url.toString();
  });
}
