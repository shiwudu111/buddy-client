import fs from "node:fs";
import path from "node:path";

const OUTPUT_FILE = path.resolve("assets/scripts/core/build-config.generated.ts");
const HOT_UPDATE_ENVS = {
  dev: "https://buddy-hotupdate-zhzhwd1290.oss-cn-shanghai.aliyuncs.com/buddy-hot-update/dev/project.manifest",
  staging:
    "https://buddy-hotupdate-zhzhwd1290.oss-cn-shanghai.aliyuncs.com/buddy-hot-update/staging/project.manifest",
  prod: "https://buddy-hotupdate-zhzhwd1290.oss-cn-shanghai.aliyuncs.com/buddy-hot-update/prod/project.manifest",
};
const args = process.argv.slice(2);
const rawManifestUrl = resolveManifestInput(args[0] ?? "staging");
const currentContent = fs.existsSync(OUTPUT_FILE)
  ? fs.readFileSync(OUTPUT_FILE, "utf8")
  : "";
const apiBaseMatch = currentContent.match(/BUILD_API_BASE_URL\s*=\s*(["'])(.*?)\1/);
const apiBaseUrl = apiBaseMatch?.[2] ?? "";

function normalizeManifestUrl(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    if (!url.pathname.endsWith("/project.manifest")) {
      url.pathname = `${url.pathname.replace(/\/+$/, "")}/project.manifest`;
    }
    return url.toString();
  } catch {
    throw new Error(`Invalid hot update manifest URL: ${input}`);
  }
}

function resolveManifestInput(input) {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }
  return HOT_UPDATE_ENVS[trimmed] ?? trimmed;
}

const normalized = normalizeManifestUrl(rawManifestUrl);
const content = [
  `export const BUILD_API_BASE_URL = ${JSON.stringify(apiBaseUrl)};`,
  `export const BUILD_HOT_UPDATE_MANIFEST_URL = ${JSON.stringify(normalized)};`,
  "",
].join("\n");

fs.writeFileSync(OUTPUT_FILE, content, "utf8");

if (normalized) {
  console.log(`Wrote hot update manifest URL: ${normalized}`);
} else {
  console.log("Cleared hot update manifest URL; runtime hot update is disabled.");
}
