import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const options = parseArgs(args);
const HOT_UPDATE_ENVS = {
  dev: "https://buddy-hotupdate-zhzhwd1290.oss-cn-shanghai.aliyuncs.com/buddy-hot-update/dev/",
  staging:
    "https://buddy-hotupdate-zhzhwd1290.oss-cn-shanghai.aliyuncs.com/buddy-hot-update/staging/",
  prod: "https://buddy-hotupdate-zhzhwd1290.oss-cn-shanghai.aliyuncs.com/buddy-hot-update/prod/",
};
const version = options.version;
const packageUrl = normalizePackageUrl(options.url ?? envPackageUrl(options.env));
const sourceDir = path.resolve(options.source ?? "build/android-001/data");
const outputDir = path.resolve(options.out ?? ".tmp/hot-update");

if (!version) {
  throw new Error("Missing --version, for example: --version 1.0.1");
}
if (!packageUrl) {
  throw new Error("Missing --url or --env, for example: --env staging");
}
if (!packageUrl.startsWith("https://")) {
  throw new Error(`Hot update package URL must be HTTPS for real-device testing: ${packageUrl}`);
}
if (!fs.existsSync(sourceDir)) {
  throw new Error(`Hot update source directory does not exist: ${sourceDir}`);
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
copyDirectory(sourceDir, outputDir);

const assets = collectAssets(outputDir);
const manifest = {
  packageUrl,
  remoteManifestUrl: `${packageUrl}project.manifest`,
  remoteVersionUrl: `${packageUrl}version.manifest`,
  version,
  assets,
  searchPaths: [],
};
const versionManifest = {
  packageUrl: manifest.packageUrl,
  remoteManifestUrl: manifest.remoteManifestUrl,
  remoteVersionUrl: manifest.remoteVersionUrl,
  version: manifest.version,
};

fs.writeFileSync(
  path.join(outputDir, "project.manifest"),
  JSON.stringify(manifest, null, 2),
  "utf8"
);
fs.writeFileSync(
  path.join(outputDir, "version.manifest"),
  JSON.stringify(versionManifest, null, 2),
  "utf8"
);

console.log(`Generated hot update package: ${outputDir}`);
console.log(`Environment: ${options.env ?? "custom"}`);
console.log(`Version: ${version}`);
console.log(`Package URL: ${packageUrl}`);
console.log(`Assets: ${Object.keys(assets).length}`);

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const value = rawArgs[index + 1];
    if (!value || value.startsWith("--")) {
      parsed[key] = "true";
      continue;
    }
    parsed[key] = value;
    index += 1;
  }
  return parsed;
}

function normalizePackageUrl(input) {
  if (!input) {
    return "";
  }
  return input.trim().replace(/\/?$/, "/");
}

function envPackageUrl(env) {
  if (!env) {
    return "";
  }
  const value = HOT_UPDATE_ENVS[env];
  if (!value) {
    throw new Error(`Unknown hot update env: ${env}. Expected dev, staging, or prod.`);
  }
  return value;
}

function copyDirectory(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(source, target);
    } else if (entry.isFile()) {
      fs.copyFileSync(source, target);
    }
  }
}

function collectAssets(rootDir) {
  const assets = {};
  walk(rootDir, (filePath) => {
    const relativePath = toManifestPath(path.relative(rootDir, filePath));
    if (relativePath === "project.manifest" || relativePath === "version.manifest") {
      return;
    }
    const bytes = fs.readFileSync(filePath);
    assets[relativePath] = {
      size: bytes.length,
      md5: crypto.createHash("md5").update(bytes).digest("hex"),
    };
  });
  return assets;
}

function walk(dir, onFile) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, onFile);
    } else if (entry.isFile()) {
      onFile(fullPath);
    }
  }
}

function toManifestPath(filePath) {
  return filePath.split(path.sep).join("/");
}
