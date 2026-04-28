/**
 * Load backend/.env before any other app modules so USE_PGLITE and DATABASE_URL
 * are correct even when the process cwd is the monorepo root.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(backendRoot, ".env"), override: true });
dotenv.config({ path: path.join(backendRoot, ".env.local"), override: true });
