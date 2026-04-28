import "./loadEnv.js";

import express from "express";
import compression from "compression";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import advisorsRoutes from "./routes/advisors.js";
import clientsRoutes from "./routes/clients.js";
import policiesRoutes from "./routes/policies.js";
import renewalsRoutes from "./routes/renewals.js";
import claimsRoutes from "./routes/claims.js";
import tasksRoutes from "./routes/tasks.js";
import notesRoutes from "./routes/notes.js";
import searchRoutes from "./routes/search.js";
import aiRoutes from "./routes/ai.js";
import notificationsRoutes from "./routes/notifications.js";
import usersRoutes from "./routes/users.js";
import reportsRoutes from "./routes/reports.js";
import { uploadsAbsolutePath } from "./middleware/upload.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;
const fromEnv = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowOrigin = Array.from(
  new Set(["http://localhost:5173", "http://127.0.0.1:5173", ...fromEnv])
);
const isProd = process.env.NODE_ENV === "production";

function corsAllowed(origin) {
  if (!origin) return true;
  if (allowOrigin.includes(origin)) return true;
  if (isProd) {
    try {
      const { hostname } = new URL(origin);
      if (hostname === "localhost" || hostname === "127.0.0.1") return true;
      if (hostname.endsWith(".vercel.app")) return true;
    } catch {
      /* ignore */
    }
    return false;
  }
  try {
    const { hostname } = new URL(origin);
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      hostname.endsWith(".localhost")
    ) {
      return true;
    }
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

app.use(compression());
app.use(
  cors({
    origin(origin, callback) {
      callback(null, corsAllowed(origin));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

if (!fs.existsSync(uploadsAbsolutePath)) {
  fs.mkdirSync(uploadsAbsolutePath, { recursive: true });
}
app.use("/uploads", express.static(uploadsAbsolutePath));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/advisors", advisorsRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/policies", policiesRoutes);
app.use("/api/renewals", renewalsRoutes);
app.use("/api/claims", claimsRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/search", searchRoutes);
app.use("/search", searchRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/reports", reportsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

const { bootstrapDevDatabase } = await import("./db/bootstrap.js");
await bootstrapDevDatabase();

app.listen(PORT, () => {
  console.log(`Star Health Insurance CRM API http://localhost:${PORT}`);
});
