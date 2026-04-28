import { Router } from "express";
import { pool } from "../db/pool.js";
import { authRequired, requireAdmin } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();
router.use(authRequired);

router.get("/", async (req, res) => {
  try {
    const { advisorId, from, to, search } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
    const offset = (page - 1) * pageSize;

    const cond = [];
    const params = [];
    let i = 1;
    if (advisorId) {
      cond.push(`c.advisor_id = $${i++}`);
      params.push(advisorId);
    }
    if (from) {
      cond.push(`c.renewal_date >= $${i++}`);
      params.push(from);
    }
    if (to) {
      cond.push(`c.renewal_date <= $${i++}`);
      params.push(to);
    }
    if (search) {
      cond.push(`(c.name ILIKE $${i} OR c.phone ILIKE $${i} OR c.email ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }
    const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";
    const lim = params.length + 1;
    const off = params.length + 2;
    const listParams = [...params, pageSize, offset];

    const list = await pool.query(
      `SELECT c.*, a.name AS advisor_name
       FROM clients c
       LEFT JOIN advisors a ON a.id = c.advisor_id
       ${where}
       ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC
       LIMIT $${lim} OFFSET $${off}`,
      listParams
    );
    const cnt = await pool.query(`SELECT COUNT(*)::int AS c FROM clients c ${where}`, params);
    res.json({ items: list.rows, total: cnt.rows[0].c, page, pageSize });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id/full", async (req, res) => {
  const id = req.params.id;
  const client = await pool.query(
    `SELECT c.*, a.name AS advisor_name FROM clients c
     LEFT JOIN advisors a ON a.id = c.advisor_id WHERE c.id = $1`,
    [id]
  );
  if (!client.rows.length) return res.status(404).json({ error: "Not found" });

  const [policies, renewals, claims, notes, documents] = await Promise.all([
    pool.query("SELECT * FROM policies WHERE client_id = $1 ORDER BY created_at DESC", [id]),
    pool.query("SELECT * FROM renewals WHERE client_id = $1 ORDER BY renewal_date ASC", [id]),
    pool.query("SELECT * FROM claims WHERE client_id = $1 ORDER BY created_at DESC", [id]),
    pool.query(
      `SELECT n.*, u.name AS author_name FROM notes n
       LEFT JOIN users u ON u.id = n.user_id
       WHERE n.entity_type = 'client' AND n.entity_id = $1 ORDER BY n.created_at DESC`,
      [id]
    ),
    pool.query("SELECT * FROM documents WHERE owner_type = 'client' AND owner_id = $1 ORDER BY created_at DESC", [id]),
  ]);

  res.json({
    client: client.rows[0],
    policies: policies.rows,
    renewals: renewals.rows,
    claims: claims.rows,
    notes: notes.rows,
    documents: documents.rows,
  });
});

router.post("/", async (req, res) => {
  const { name, phone, email, advisor_id, policy_details, sum_insured, renewal_date } = req.body;
  if (!name || !phone) return res.status(400).json({ error: "Name and phone required" });
  const { rows } = await pool.query(
    `INSERT INTO clients (name, phone, email, advisor_id, policy_details, sum_insured, renewal_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [name, phone, email || null, advisor_id || null, policy_details || null, sum_insured ?? 0, renewal_date || null]
  );
  res.status(201).json(rows[0]);
});

router.patch("/:id", async (req, res) => {
  const { name, phone, email, advisor_id, policy_details, sum_insured, renewal_date, tags, is_high_value } = req.body;
  const { rows } = await pool.query(
    `UPDATE clients SET
      name = COALESCE($1,name),
      phone = COALESCE($2,phone),
      email = COALESCE($3,email),
      advisor_id = COALESCE($4,advisor_id),
      policy_details = COALESCE($5,policy_details),
      sum_insured = COALESCE($6,sum_insured),
      renewal_date = COALESCE($7,renewal_date),
      tags = COALESCE($8,tags),
      is_high_value = COALESCE($9,is_high_value),
      updated_at = NOW()
     WHERE id = $10 RETURNING *`,
    [
      name ?? null,
      phone ?? null,
      email ?? null,
      advisor_id ?? null,
      policy_details ?? null,
      sum_insured ?? null,
      renewal_date ?? null,
      tags ?? null,
      is_high_value ?? null,
      req.params.id,
    ]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM clients WHERE id = $1", [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

router.post("/:id/documents", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file required" });
  const { rows } = await pool.query(
    `INSERT INTO documents (owner_type, owner_id, file_path, original_name)
     VALUES ('client',$1,$2,$3) RETURNING *`,
    [req.params.id, req.file.filename, req.file.originalname]
  );
  res.status(201).json(rows[0]);
});

export default router;
