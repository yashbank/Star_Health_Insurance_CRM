import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { signToken, authRequired } from "../middleware/auth.js";
import { logActivity } from "../utils/activity.js";

const router = Router();

function dbUnreachable(err) {
  const code = err?.code;
  if (code === "ECONNREFUSED" || code === "ENOTFOUND") return true;
  const first = err?.errors?.[0]?.code;
  if (first === "ECONNREFUSED" || first === "ENOTFOUND") return true;
  return false;
}

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const { rows } = await pool.query(
      "SELECT id, name, role, email, password_hash FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    if (!rows.length) {
      const { rows: cnt } = await pool.query("SELECT COUNT(*)::int AS c FROM users");
      if (cnt[0]?.c === 0) {
        return res.status(503).json({
          error:
            "Database has no users yet. Stop the API, remove backend/.data/pglite if you use PGlite, then start again so the demo seed runs. Or run: npm run db:seed",
        });
      }
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (!rows[0].password_hash || !bcrypt.compareSync(password, rows[0].password_hash)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const u = rows[0];
    await logActivity(u.id, "login", { email: u.email });
    const token = signToken({ id: u.id, role: u.role, email: u.email, name: u.name });
    res.json({
      token,
      user: { id: u.id, name: u.name, role: u.role, email: u.email },
    });
  } catch (e) {
    console.error(e);
    if (dbUnreachable(e)) {
      return res.status(503).json({
        error:
          "Database unavailable (Postgres not running on port 5432, or wrong DATABASE_URL). Start Postgres or run ./start-live.sh which can start Docker Postgres.",
      });
    }
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/me", authRequired, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, name, role, email, created_at FROM users WHERE id = $1",
    [req.user.sub]
  );
  if (!rows.length) return res.status(404).json({ error: "User not found" });
  res.json(rows[0]);
});

export default router;
