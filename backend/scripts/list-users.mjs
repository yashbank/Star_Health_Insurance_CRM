/**
 * Lists users in Postgres (confirms seed). Run from backend folder:
 *   node scripts/list-users.mjs
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const { pool } = await import("../src/db/pool.js");
try {
  const { rows } = await pool.query(
    "SELECT id, email, role FROM users ORDER BY email"
  );
  if (!rows.length) {
    console.log("No users found — run: npm run db:seed (after db:init).");
  } else {
    console.table(rows.map((r) => ({ id: r.id, email: r.email, role: r.role })));
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
