import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const documents = [
  {
    file: "01_GLOBAL_KEYWORD_ARCHITECTURE_RU.md",
    sha256: "540dc694fb851ba682430f18c5b0c9a5b86410302825901507fa38c6ce52515c",
    required: ["## 4. Семантическое ядро: роли", "## 8. YouTube", "## 9. LinkedIn", "## 14. Telegram", "## 15. Внешний web search"],
  },
  {
    file: "02_REGIONAL_LANGUAGE_KEYWORDS_RU.md",
    sha256: "9b1e89d857c08e9ac112fbc1f0b64e81ae681b431a8b4ab4ac7fbf9a02e6899d",
    required: ["`pt-BR`", "`es-419`", "`fr-AF`", "`tr-TR`", "`id-ID`", "Hindi + Hinglish", "Универсальный английский"],
  },
  {
    file: "03_PLATFORM_SEARCH_PLAYBOOK_RU.md",
    sha256: "5d7a27b57a11343572ba4ff14d0cac08cb89f0ba2dc4a593a9725b78c98ef5e4",
    required: ["## 3. YouTube", "## 4. LinkedIn", "## 5. X", "## 6. Facebook", "## 7. Instagram", "## 8. TikTok", "## 9. Telegram", "## 10. Google"],
  },
];

let totalLines = 0;
for (const document of documents) {
  const source = await readFile(path.join(root, "src/modules/analytics/data/listingsKeywords", document.file), "utf8");
  const digest = createHash("sha256").update(source).digest("hex");
  assert.equal(digest, document.sha256, `${document.file} must remain byte-for-byte identical to the reviewed source`);
  for (const marker of document.required) assert.ok(source.includes(marker), `${document.file} is missing ${marker}`);
  totalLines += source.trimEnd().split(/\r?\n/).length;
}

assert.equal(totalLines, 2645, "the embedded keyword library must contain all 2,645 reviewed lines");
console.log("Listings keyword library verified: 3 source packages, 7 language routes, 8 platform routes, 2,645 lines.");
