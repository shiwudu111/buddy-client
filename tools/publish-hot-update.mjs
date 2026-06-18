import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const options = parseArgs(args);
const env = options.env ?? "staging";
const version = options.version;
const source = options.source ?? "build/android/data";
const out = options.out ?? `.tmp/hot-update-${version ?? "next"}`;

if (!version) {
  throw new Error("Missing required --version, for example: --version 0.0.65");
}

run("node", [
  "tools/generate-hot-update-manifest.mjs",
  "--env",
  env,
  "--version",
  version,
  "--source",
  source,
  "--out",
  out,
]);

const uploadArgs = [
  "tools/upload-hot-update-oss.mjs",
  "--env",
  env,
  "--dir",
  out,
];

if (options.ossutil) {
  uploadArgs.push("--ossutil", options.ossutil);
}
if (options["ossutil-config"]) {
  uploadArgs.push("--ossutil-config", options["ossutil-config"]);
}

run("node", uploadArgs);

console.log(`Published hot update ${version} to ${env}.`);

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${commandArgs.join(" ")}`);
  }
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
