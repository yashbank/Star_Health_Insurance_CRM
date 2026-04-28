import { Router } from "express";
import { pool } from "../db/pool.js";
import { buildPartialUpdate } from "../utils/partialUpdate.js";
import { authRequired, requireAdmin, requireRoles } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

const CLAIM_PATCH = [
  "description",
  "status",
  "amount",
  "policy_id",
  "claim_number",
  "assistant_notes",
  "timeline",
];

router.get("/", async (req, res) => {
  const { status, clientId, from, to } = req.query;
  const cond = [];
  const params = [];
  let i = 1;
  if (status) {
    cond.push(`cl.status = $${i++}`);
    params.push(status);
  }
  if (clientId) {
    cond.push(`cl.client_id = $${i++}`);
    params.push(clientId);
  }
  if (from) {
    cond.push(`cl.created_at::date >= $${i++}::date`);
    params.push(from);
  }
  if (to) {
    cond.push(`cl.created_at::date <= $${i++}::date`);
    params.push(to);
  }
  const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT cl.*, c.name AS client_name, c.phone AS client_phone, p.policy_number
     FROM claims cl
     JOIN clients c ON c.id = cl.client_id
     LEFT JOIN policies p ON p.id = cl.policy_id
     ${where}
     ORDER BY cl.updated_at DESC`,
    params
  );
  res.json(rows);
});

router.post("/", requireRoles("admin", "assistant1", "assistant2"), async (req, res) => {
  const { client_id, policy_id, claim_number, description, status, amount, assistant_notes } = req.body;
  if (!client_id) return res.status(400).json({ error: "client_id required" });
  const cn = claim_number || `CLM-${Date.now()}`;
  const { rows } = await pool.query(
    `INSERT INTO claims (client_id, policy_id, claim_number, description, status, amount, timeline, assistant_notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8) RETURNING *`,
    [
      client_id,
      policy_id || null,
      cn,
      description || null,
      status || "Filed",
      amount ?? null,
      JSON.stringify([{ at: new Date().toISOString(), note: "Claim filed in CRM" }]),
      assistant_notes || null,
    ]
  );
  res.status(201).json(rows[0]);
});

router.patch("/:id", requireRoles("admin", "assistant1", "assistant2"), async (req, res) => {
  const body = { ...req.body };
  if (body.timeline !== undefined && (Array.isArray(body.timeline) || typeof body.timeline === "object")) {
    body.timeline = JSON.stringify(body.timeline);
  }
  const built = buildPartialUpdate("claims", req.params.id, body, CLAIM_PATCH);
  if (!built) return res.status(400).json({ error: "No fields to update" });
  const { rows } = await pool.query(built.sql, built.vals);
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM claims WHERE id = $1", [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

export default router;
