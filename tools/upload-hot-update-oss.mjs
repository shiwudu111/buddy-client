import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const HOT_UPDATE_ENVS = {
  dev: {
    bucket: "buddy-hotupdate-zhzhwd1290",
    prefix: "buddy-hot-update/dev/",
    packageUrl:
      "https://buddy-hotupdate-zhzhwd1290.oss-cn-shanghai.aliyuncs.com/buddy-hot-update/dev/",
  },
  staging: {
    bucket: "buddy-hotupdate-zhzhwd1290",
    prefix: "buddy-hot-update/staging/",
    packageUrl:
      "https://buddy-hotupdate-zhzhwd1290.oss-cn-shanghai.aliyuncs.com/buddy-hot-update/staging/",
  },
  prod: {
    bucket: "buddy-hotupdate-zhzhwd1290",
    prefix: "buddy-hot-update/prod/",
    packageUrl:
      "https://buddy-hotupdate-zhzhwd1290.oss-cn-shanghai.aliyuncs.com/buddy-hot-update/prod/",
  },
};

const args = process.argv.slice(2);
const options = parseArgs(args);
const env = options.env ?? "staging";
const envConfig = HOT_UPDATE_ENVS[env];

if (!envConfig) {
  throw new Error(`Unknown hot update env: ${env}. Expected dev, staging, or prod.`);
}

const sourceDir = path.resolve(options.dir ?? ".tmp/hot-update-test");
const bucket = options.bucket ?? envConfig.bucket;
const prefix = normalizePrefix(options.prefix ?? envConfig.prefix);
const ossutil = resolveOssutil(options.ossutil);
const dryRun = Boolean(options["dry-run"]);

if (!fs.existsSync(sourceDir)) {
  throw new Error(`Hot update package directory does not exist: ${sourceDir}`);
}

const projectManifestPath = path.join(sourceDir, "project.manifest");
const versionManifestPath = path.join(sourceDir, "version.manifest");
if (!fs.existsSync(projectManifestPath) || !fs.existsSync(versionManifestPath)) {
  throw new Error(
    `Missing project.manifest or version.manifest in hot update package: ${sourceDir}`
  );
}

const projectManifest = readJson(projectManifestPath);
if (projectManifest.packageUrl !== envConfig.packageUrl) {
  throw new Error(
    [
      "Hot update packageUrl does not match the selected environment.",
      `Expected: ${envConfig.packageUrl}`,
      `Actual: ${projectManifest.packageUrl}`,
      "Regenerate the package with the matching --env before upload.",
    ].join("\n")
  );
}

const files = collectFiles(sourceDir);
if (files.length === 0) {
  throw new Error(`Hot update package has no files: ${sourceDir}`);
}

console.log(`Hot update upload target: oss://${bucket}/${prefix}`);
console.log(`Source directory: ${sourceDir}`);
console.log(`Environment: ${env}`);
console.log(`Files: ${files.length}`);

for (const filePath of files) {
  const relativePath = toOssPath(path.relative(sourceDir, filePath));
  const target = `oss://${bucket}/${prefix}${relativePath}`;
  const commandArgs = ["cp", filePath, target, "--force", "--update"];

  if (dryRun) {
    console.log(`[dry-run] ${ossutil} ${commandArgs.map(quoteArg).join(" ")}`);
    continue;
  }

  const result = spawnSync(ossutil, commandArgs, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    throw new Error(`Upload failed: ${filePath} -> ${target}`);
  }
}

if (dryRun) {
  console.log("Dry run complete. No files were uploaded.");
} else {
  console.log("Hot update package uploaded successfully.");
  console.log(`${envConfig.packageUrl}project.manifest`);
  console.log(`${envConfig.packageUrl}version.manifest`);
}

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
      parsed[key] = true;
      continue;
    }
    parsed[key] = value;
    index += 1;
  }
  return parsed;
}

function normalizePrefix(value) {
  return value.trim().replace(/^\/+/, "").replace(/\/?$/, "/");
}

function resolveOssutil(input) {
  if (input) {
    return input;
  }
  if (process.env.OSSUTIL_PATH) {
    return process.env.OSSUTIL_PATH;
  }

  const localOssutil = path.resolve("..", ".tools", "ossutil", "ossutil.exe");
  if (fs.existsSync(localOssutil)) {
    return localOssutil;
  }

  return "ossutil";
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function collectFiles(rootDir) {
  const files = [];
  walk(rootDir, (filePath) => files.push(filePath));
  files.sort();
  return files;
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

function toOssPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function quoteArg(value) {
  return /\s/.test(value) ? `"${value}"` : value;
}
