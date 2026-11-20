// Windows: VS Code terminals often start with a lowercase drive letter (c:\...),
// which makes vitest load two copies of itself ("reading 'config'" crash).
// Normalise cwd to the real on-disk casing before handing off to vitest.
import { realpathSync } from "node:fs";
import { spawnSync } from "node:child_process";

const cwd = realpathSync.native(process.cwd());
process.chdir(cwd);
const bin = `${cwd}/node_modules/vitest/vitest.mjs`;
const r = spawnSync(process.execPath, [bin, ...process.argv.slice(2)], { stdio: "inherit", cwd });
process.exit(r.status ?? 1);
