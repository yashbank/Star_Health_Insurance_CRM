import { Router } from "express";
import { pool } from "../db/pool.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

router.get("/", async (req, res) => {
  const q = req.query.search ? `%${req.query.search}%` : null;
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50));
  const offset = (page - 1) * pageSize;

  let where = "";
  const params = [];
  if (q) {
    params.push(q);
    where = `WHERE name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1`;
  }
  params.push(pageSize, offset);
  const list = await pool.query(
    `SELECT a.*, (SELECT COUNT(*)::int FROM clients c WHERE c.advisor_id = a.id) AS client_count
     FROM advisors a ${where}
     ORDER BY a.name ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const countR = await pool.query(`SELECT COUNT(*)::int AS c FROM advisors a ${where}`, q ? [q] : []);
  res.json({ items: list.rows, total: countR.rows[0].c, page, pageSize });
});

router.post("/", async (req, res) => {
  const { name, phone, email } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  const { rows } = await pool.query(
    `INSERT INTO advisors (name, phone, email) VALUES ($1,$2,$3) RETURNING *`,
    [name, phone || null, email || null]
  );
  res.status(201).json(rows[0]);
});

router.patch("/:id", async (req, res) => {
  const { name, phone, email } = req.body;
  const { rows } = await pool.query(
    `UPDATE advisors SET name = COALESCE($1,name), phone = COALESCE($2,phone), email = COALESCE($3,email)
     WHERE id = $4 RETURNING *`,
    [name, phone, email, req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  await pool.query("UPDATE clients SET advisor_id = NULL WHERE advisor_id = $1", [req.params.id]);
  const { rowCount } = await pool.query("DELETE FROM advisors WHERE id = $1", [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

export default router;
