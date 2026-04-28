import "../loadEnv.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "schema.sql");

async function init() {
  const sql = fs.readFileSync(schemaPath, "utf8");
  if (typeof pool.exec === "function") {
    await pool.exec(sql);
  } else {
    await pool.query(sql);
  }
  console.log("Database schema applied.");

  const migPath = path.join(__dirname, "migration_policy_extension.sql");
  if (fs.existsSync(migPath)) {
    const mig = fs.readFileSync(migPath, "utf8");
    if (typeof pool.exec === "function") {
      await pool.exec(mig);
    } else {
      await pool.query(mig);
    }
    console.log("Policy extension migration applied.");
  }

  const mig2 = path.join(__dirname, "migration_v2_star_workflow.sql");
  if (fs.existsSync(mig2)) {
    const sql2 = fs.readFileSync(mig2, "utf8");
    if (typeof pool.exec === "function") {
      await pool.exec(sql2);
    } else {
      await pool.query(sql2);
    }
    console.log("Star workflow migration (v2) applied.");
  }

  await pool.end();
}

init().catch((e) => {
  console.error(e);
  process.exit(1);
});
