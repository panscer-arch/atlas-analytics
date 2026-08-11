import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = process.env.ATLAS_PRODUCTS_BACKUP_DIR || "/var/backups/atlas-products";
const databaseUrl = process.env.ATLAS_PRODUCTS_DATABASE_URL || "";
const retentionDays = Math.max(1, Number(process.env.ATLAS_PRODUCTS_BACKUP_RETENTION_DAYS || 30));

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command}_failed_${code}`)));
  });
}

await mkdir(backupDir, { recursive: true });

async function pruneBackups() {
  const cutoff = Date.now() - retentionDays * 86_400_000;
  for (const name of await readdir(backupDir)) {
    if (!/^atlas-products-.*\.(dump|json)$/.test(name)) continue;
    const target = path.join(backupDir, name);
    if ((await stat(target)).mtimeMs < cutoff) await unlink(target);
  }
}

if (databaseUrl) {
  const target = path.join(backupDir, `atlas-products-${timestamp}.dump`);
  await run("pg_dump", ["--format=custom", "--no-owner", `--file=${target}`, databaseUrl]);
  await run("pg_restore", ["--list", target]);
  if (process.env.ATLAS_PRODUCTS_RESTORE_TEST_URL) {
    await run("pg_restore", ["--clean", "--if-exists", "--no-owner", `--dbname=${process.env.ATLAS_PRODUCTS_RESTORE_TEST_URL}`, target]);
  }
  console.log(JSON.stringify({ ok: true, mode: "postgres", target, restoreDrill: Boolean(process.env.ATLAS_PRODUCTS_RESTORE_TEST_URL) }));
} else {
  const storeDir = process.env.ATLAS_PRODUCTS_STORE_DIR
    || path.join(process.env.ATLAS_CONTENT_STORE_DIR || "/var/lib/atlas-analytics-content", "products");
  const source = path.join(storeDir, "products-registry-v1.json");
  const target = path.join(backupDir, `atlas-products-${timestamp}.json`);
  await copyFile(source, target);
  const parsed = JSON.parse(await readFile(target, "utf8"));
  if (!Array.isArray(parsed.products) || !Array.isArray(parsed.auditEvents)) throw new Error("backup_validation_failed");
  console.log(JSON.stringify({ ok: true, mode: "file", target, products: parsed.products.length, auditEvents: parsed.auditEvents.length }));
}

await pruneBackups();
