import fs from "node:fs";
import path from "node:path";

const OUTPUT_FILE = path.resolve("assets/scripts/core/build-config.generated.ts");
const args = process.argv.slice(2);
const rawBaseUrl = args[0] ?? "";
const currentContent = fs.existsSync(OUTPUT_FILE)
  ? fs.readFileSync(OUTPUT_FILE, "utf8")
  : "";
const hotUpdateManifestMatch = currentContent.match(
  /BUILD_HOT_UPDATE_MANIFEST_URL\s*=\s*(["'])(.*?)\1/
);
const hotUpdateManifestUrl = hotUpdateManifestMatch?.[2] ?? "";

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
const content = [
  `export const BUILD_API_BASE_URL = ${JSON.stringify(normalized)};`,
  `export const BUILD_HOT_UPDATE_MANIFEST_URL = ${JSON.stringify(hotUpdateManifestUrl)};`,
  "",
].join("\n");

fs.writeFileSync(OUTPUT_FILE, content, "utf8");

if (normalized) {
  console.log(`Wrote build API base: ${normalized}`);
} else {
  console.log("Cleared build API base; runtime will use local/default or storage override.");
}
