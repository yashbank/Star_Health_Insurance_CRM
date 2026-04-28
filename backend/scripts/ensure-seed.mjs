/**
 * Run db seed only when there are no users (safe for repeated ./start-live.sh).
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");
dotenv.config({ path: path.join(backendRoot, ".env") });

const { pool } = await import("../src/db/pool.js");

let count = 0;
try {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM users");
  count = rows[0].c;
} catch {
  count = 0;
}
await pool.end();

if (count > 0) {
  process.exit(0);
}

console.error("No demo users in database — running seed…");
const r = spawnSync("bash", [path.join(backendRoot, "scripts", "with-runtime.sh"), "src/db/seed-cli.js"], {
  cwd: backendRoot,
  stdio: "inherit",
  env: process.env,
});
process.exit(r.status ?? 1);
