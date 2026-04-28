import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./pool.js";
import { executeSeed } from "./seed.js";

function envTruthy(name) {
  const v = String(process.env[name] ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}
function envFalsy(name) {
  const v = String(process.env[name] ?? "")
    .trim()
    .toLowerCase();
  return v === "0" || v === "false" || v === "no" || v === "off";
}
const isProd = process.env.NODE_ENV === "production";
const forcePostgres = envFalsy("USE_PGLITE") || process.env.USE_POSTGRES === "1";
const usePglite = envTruthy("USE_PGLITE") ? true : forcePostgres ? false : !isProd;

export async function bootstrapDevDatabase() {
  if (!usePglite) return;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");

  if (typeof pool.exec === "function") {
    await pool.exec(sql);
  } else {
    await pool.query(sql);
  }

  const migPath = path.join(__dirname, "migration_policy_extension.sql");
  if (fs.existsSync(migPath)) {
    const mig = fs.readFileSync(migPath, "utf8");
    if (typeof pool.exec === "function") {
      await pool.exec(mig);
    } else {
      await pool.query(mig);
    }
  }

  const mig2 = path.join(__dirname, "migration_v2_star_workflow.sql");
  if (fs.existsSync(mig2)) {
    const sql2 = fs.readFileSync(mig2, "utf8");
    if (typeof pool.exec === "function") {
      await pool.exec(sql2);
    } else {
      await pool.query(sql2);
    }
  }

  const forceReseed =
    process.env.PGLITE_FORCE_RESEED === "1" ||
    String(process.env.PGLITE_FORCE_RESEED || "").toLowerCase() === "true";

  let needSeed = forceReseed;
  if (!needSeed) {
    try {
      const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM users");
      if (rows[0].c === 0) needSeed = true;
      else {
        const { rows: adminRow } = await pool.query(
          "SELECT 1 AS ok FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
          ["admin@crm.local"]
        );
        if (!adminRow.length) needSeed = true;
      }
    } catch {
      needSeed = true;
    }
  }
  if (!needSeed) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await executeSeed(client);
    await client.query("COMMIT");
    console.log("PGlite: seeded demo users (admin@crm.local / admin123).");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("PGlite seed failed:", e);
  } finally {
    client.release();
  }
}
