export const DEFAULT_UTM_FIELDS = {
  destinationUrl: "https://atlas-system.io/smartcycle-1/",
  source: "bscscan",
  medium: "display",
  campaign: "smartcycle1_launch_aug2026",
  content: "header_text_v1",
  term: "",
  campaignId: "",
};

const UTM_FIELD_TO_QUERY = {
  source: "utm_source",
  medium: "utm_medium",
  campaign: "utm_campaign",
  content: "utm_content",
  term: "utm_term",
  campaignId: "utm_id",
};

export function normalizeUtmValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function buildUtmUrl(fields) {
  const destinationUrl = String(fields?.destinationUrl || "").trim();
  if (!destinationUrl) {
    return { url: "", error: "Укажите адрес страницы." };
  }

  let url;
  try {
    url = new URL(destinationUrl);
  } catch {
    return { url: "", error: "Введите полный адрес, начиная с https://." };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return { url: "", error: "Поддерживаются только ссылки http:// и https://." };
  }

  const requiredFields = [
    ["source", "источник"],
    ["medium", "канал"],
    ["campaign", "название кампании"],
  ];
  const missingField = requiredFields.find(([field]) => !normalizeUtmValue(fields?.[field]));
  if (missingField) {
    return { url: "", error: `Укажите ${missingField[1]} кампании.` };
  }

  Object.entries(UTM_FIELD_TO_QUERY).forEach(([field, queryKey]) => {
    const normalizedValue = normalizeUtmValue(fields?.[field]);
    if (normalizedValue) {
      url.searchParams.set(queryKey, normalizedValue);
    } else {
      url.searchParams.delete(queryKey);
    }
  });

  return { url: url.toString(), error: "" };
}

export function parseUtmUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    const destination = new URL(url.toString());
    Object.values(UTM_FIELD_TO_QUERY).forEach((queryKey) => {
      destination.searchParams.delete(queryKey);
    });
    return {
      destinationUrl: destination.toString(),
      source: url.searchParams.get("utm_source") || "",
      medium: url.searchParams.get("utm_medium") || "",
      campaign: url.searchParams.get("utm_campaign") || "",
      content: url.searchParams.get("utm_content") || "",
      term: url.searchParams.get("utm_term") || "",
      campaignId: url.searchParams.get("utm_id") || "",
    };
  } catch {
    return null;
  }
}
