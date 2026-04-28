import { Router } from "express";
import { pool } from "../db/pool.js";
import { buildPartialUpdate } from "../utils/partialUpdate.js";
import { authRequired, requireRoles } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

const renewalLightSql = `CASE
  WHEN r.renewal_date < CURRENT_DATE THEN 'red'
  WHEN r.renewal_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'red'
  WHEN r.renewal_date <= CURRENT_DATE + INTERVAL '60 days' THEN 'yellow'
  ELSE 'green'
END AS renewal_traffic_light`;

router.get("/", async (req, res) => {
  const { status, advisorId, from, to } = req.query;
  const cond = [];
  const params = [];
  let i = 1;
  if (status) {
    cond.push(`r.status = $${i++}`);
    params.push(status);
  }
  if (advisorId) {
    cond.push(`c.advisor_id = $${i++}`);
    params.push(advisorId);
  }
  if (from) {
    cond.push(`r.renewal_date >= $${i++}`);
    params.push(from);
  }
  if (to) {
    cond.push(`r.renewal_date <= $${i++}`);
    params.push(to);
  }
  const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT r.*, c.name AS client_name, c.phone AS client_phone, a.name AS advisor_name,
            ${renewalLightSql}
     FROM renewals r
     JOIN clients c ON c.id = r.client_id
     LEFT JOIN advisors a ON a.id = c.advisor_id
     ${where}
     ORDER BY r.renewal_date ASC`,
    params
  );
  res.json(rows);
});

router.get("/upcoming", async (req, res) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 60));
  const { rows } = await pool.query(
    `SELECT r.*, c.name AS client_name, c.phone AS client_phone,
            ${renewalLightSql}
     FROM renewals r
     JOIN clients c ON c.id = r.client_id
     WHERE r.renewal_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1 * INTERVAL '1 day')
       AND r.status NOT IN ('Renewed','Dropped')
     ORDER BY r.renewal_date ASC`,
    [days]
  );
  res.json(rows);
});

router.post("/", requireRoles("admin", "assistant1", "assistant2"), async (req, res) => {
  const { client_id, renewal_date, status, reminder_date, call_logs } = req.body;
  if (!client_id || !renewal_date) return res.status(400).json({ error: "client_id and renewal_date required" });
  const { rows } = await pool.query(
    `INSERT INTO renewals (client_id, renewal_date, status, reminder_date, call_logs)
     VALUES ($1,$2,$3,$4,$5::jsonb) RETURNING *`,
    [
      client_id,
      renewal_date,
      status || "Not Contacted",
      reminder_date || null,
      JSON.stringify(Array.isArray(call_logs) ? call_logs : []),
    ]
  );
  res.status(201).json(rows[0]);
});

router.patch("/:id", requireRoles("admin", "assistant1", "assistant2"), async (req, res) => {
  const built = buildPartialUpdate("renewals", req.params.id, req.body, ["renewal_date", "status", "reminder_date"]);
  if (!built) return res.status(400).json({ error: "No fields to update" });
  const { rows } = await pool.query(built.sql, built.vals);
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

router.post("/:id/call-log", requireRoles("admin", "assistant1", "assistant2"), async (req, res) => {
  const { note } = req.body;
  if (!note) return res.status(400).json({ error: "note required" });
  const entry = { at: new Date().toISOString(), note };
  const { rows } = await pool.query(
    `UPDATE renewals SET call_logs = call_logs || $1::jsonb, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [JSON.stringify([entry]), req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

router.delete("/:id", requireRoles("admin"), async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM renewals WHERE id = $1", [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

export default router;
