import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..", "..");
const envFile = path.join(backendRoot, ".env");
dotenv.config({ path: envFile, override: true });
dotenv.config({ path: path.join(backendRoot, ".env.local"), override: true });

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

function noop() {}

/** @type {import("@electric-sql/pglite").PGlite | null} */
let pgliteInstance = null;

async function getPglite() {
  if (!pgliteInstance) {
    const { PGlite } = await import("@electric-sql/pglite");
    const dataDir = process.env.PGLITE_DATA_DIR || path.join(backendRoot, ".data", "pglite");
    fs.mkdirSync(dataDir, { recursive: true });
    pgliteInstance = new PGlite(dataDir);
    await pgliteInstance.waitReady;
  }
  return pgliteInstance;
}

function createPglitePool() {
  return {
    async exec(sql) {
      const db = await getPglite();
      await db.exec(sql);
      return { rows: [], rowCount: 0 };
    },
    async query(text, params) {
      const db = await getPglite();
      return db.query(text, params ?? []);
    },
    async connect() {
      const db = await getPglite();
      return {
        query: (t, p) => db.query(t, p ?? []),
        release: noop,
      };
    },
    async end() {
      if (pgliteInstance) {
        await pgliteInstance.close();
        pgliteInstance = null;
      }
    },
    on: noop,
  };
}

async function createPgPool() {
  const { default: pg } = await import("pg");
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
  });
  pool.on("error", (err) => {
    console.error("Unexpected PG client error", err);
  });
  return pool;
}

if (usePglite) {
  console.log("[star-health-insurance-crm] Database: PGlite (embedded) —", path.join(backendRoot, ".data", "pglite"));
} else {
  const masked = String(process.env.DATABASE_URL || "").replace(/:([^:@/]+)@/, ":****@");
  console.log("[star-health-insurance-crm] Database: PostgreSQL —", masked || "(DATABASE_URL not set)");
}

export const pool = usePglite ? createPglitePool() : await createPgPool();
