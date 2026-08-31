function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value)
    .sort()
    .reduce((result, key) => ({ ...result, [key]: stableValue(value[key]) }), {});
}

export function isSameContent(left, right) {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

export function resolveSharedContent({ serverResult, localValue, defaultValue }) {
  if (!serverResult?.ok) {
    return { value: localValue, shouldMigrate: false, source: "local-offline" };
  }

  const localIsDefault = isSameContent(localValue, defaultValue);

  if (!serverResult.exists) {
    return localIsDefault
      ? { value: localValue, shouldMigrate: false, source: "default" }
      : { value: localValue, shouldMigrate: true, source: "local" };
  }

  const serverIsDefault = isSameContent(serverResult.value, defaultValue);
  if (!localIsDefault && serverIsDefault) {
    return { value: localValue, shouldMigrate: true, source: "local" };
  }

  return { value: serverResult.value, shouldMigrate: false, source: "server" };
}

export async function hydrateSharedContent({ serverResult, localValue, defaultValue, save }) {
  const resolution = resolveSharedContent({ serverResult, localValue, defaultValue });
  if (!resolution.shouldMigrate) {
    return { value: resolution.value, source: resolution.source, migration: "not-needed" };
  }

  const saved = await save(resolution.value);
  return {
    value: resolution.value,
    source: resolution.source,
    migration: saved ? "saved" : "failed",
  };
}

export function mergeRecordsById(primary, fallback) {
  const result = [];
  const seen = new Set();

  [...(Array.isArray(primary) ? primary : []), ...(Array.isArray(fallback) ? fallback : [])].forEach((record) => {
    const id = String(record?.id || "");
    if (!id || seen.has(id)) return;
    seen.add(id);
    result.push(record);
  });

  return result;
}

export function resolveSharedRecords({ serverResult, localRecords, migrationComplete }) {
  const local = Array.isArray(localRecords) ? localRecords : [];
  if (!serverResult?.ok) {
    return { value: local, shouldMigrate: false, source: "local-offline" };
  }

  if (!serverResult.exists || !Array.isArray(serverResult.value)) {
    return {
      value: local,
      shouldMigrate: local.length > 0,
      source: local.length ? "local" : "default",
    };
  }

  if (migrationComplete) {
    return { value: serverResult.value, shouldMigrate: false, source: "server" };
  }

  const merged = mergeRecordsById(serverResult.value, local);
  return {
    value: merged,
    shouldMigrate: !isSameContent(merged, serverResult.value),
    source: isSameContent(merged, serverResult.value) ? "server" : "merged",
  };
}
