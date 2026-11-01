import { execFileSync, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const frontendRoot = resolve(root, "rydexx");
const socketRoot = resolve(root, "socketServer");

const stagedFiles = execFileSync(
  "git",
  ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
  { cwd: root },
).toString("utf8").split("\0").filter(Boolean);

const frontendSources = stagedFiles
  .filter((file) => file.startsWith("rydexx/") && /\.[cm]?[jt]sx?$/.test(file))
  .map((file) => file.slice("rydexx/".length));
const socketSources = stagedFiles.some(
  (file) => file.startsWith("socketServer/") && /\.[cm]?tsx?$/.test(file),
);

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (frontendSources.length > 0) {
  console.log("Linting staged frontend files...");
  run(process.execPath, [
    resolve(frontendRoot, "node_modules/eslint/bin/eslint.js"),
    ...frontendSources,
  ], frontendRoot);

  console.log("Typechecking frontend...");
  run(process.execPath, [
    resolve(frontendRoot, "node_modules/typescript/bin/tsc"),
    "--noEmit",
  ], frontendRoot);
}

if (socketSources) {
  console.log("Building socket server...");
  run("npm", ["run", "build"], socketRoot);
}

if (frontendSources.length === 0 && !socketSources) {
  console.log("No staged frontend or socket source files to check.");
}
