// Windows shells can hand us a cwd whose CASING differs from the on-disk path
// (D:\project vs D:\Project). Node module resolution is case-sensitive, so Next
// then loads its internals twice — one copy per casing — and every prerender
// fails with "Invariant: Expected workStore to be initialized".
//
// This wrapper re-runs the given command (e.g. `next build`) with the cwd set
// to the exactly-cased on-disk path, so npm scripts work from any terminal.
// Usage (package.json): node scripts/run-with-real-cwd.js next build
const { spawnSync } = require("child_process");
const fs = require("fs");

const real = fs.realpathSync.native(process.cwd());
const [cmd, ...args] = process.argv.slice(2);

const result = spawnSync(cmd, args, {
  cwd: real,
  stdio: "inherit",
  // npm puts node_modules/.bin on PATH; the shell resolves `next` from there.
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
