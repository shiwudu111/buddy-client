import fs from "node:fs";
import path from "node:path";

const OUTPUT_FILE = path.resolve("assets/scripts/core/build-config.generated.ts");
const args = process.argv.slice(2);
const rawBaseUrl = args[0] ?? "";

function normalizeApiBaseUrl(input) {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    if (url.pathname === "" || url.pathname === "/") {
      url.pathname = "/api/v1";
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    throw new Error(`Invalid API base URL: ${input}`);
  }
}

const normalized = normalizeApiBaseUrl(rawBaseUrl);
const content = `export const BUILD_API_BASE_URL = ${JSON.stringify(normalized)};\n`;

fs.writeFileSync(OUTPUT_FILE, content, "utf8");

if (normalized) {
  console.log(`Wrote build API base: ${normalized}`);
} else {
  console.log("Cleared build API base; runtime will use local/default or storage override.");
}
