import { Router } from "express";
import { pool } from "../db/pool.js";
import { authRequired } from "../middleware/auth.js";
import { logActivity } from "../utils/activity.js";
import { buildPartialUpdate } from "../utils/partialUpdate.js";

const router = Router();
router.use(authRequired);

router.get("/", async (req, res) => {
  const { status, assignee } = req.query;
  const cond = [];
  const params = [];
  let i = 1;
  if (status) {
    cond.push(`t.status = $${i++}`);
    params.push(status);
  }
  if (assignee) {
    cond.push(`t.assigned_to = $${i++}`);
    params.push(assignee);
  }
  const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT t.*,
            u1.name AS assignee_name,
            u2.name AS assigner_name
     FROM tasks t
     LEFT JOIN users u1 ON u1.id = t.assigned_to
     LEFT JOIN users u2 ON u2.id = t.assigned_by
     ${where}
     ORDER BY t.created_at DESC`,
    params
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { title, description, assigned_to, due_date } = req.body;
  if (!title) return res.status(400).json({ error: "title required" });
  const { rows } = await pool.query(
    `INSERT INTO tasks (title, description, assigned_to, assigned_by, status, due_date)
     VALUES ($1,$2,$3,$4,'open',$5) RETURNING *`,
    [title, description || null, assigned_to || null, req.user.sub, due_date || null]
  );
  await logActivity(req.user.sub, "task_created", { task_id: rows[0].id });
  res.status(201).json(rows[0]);
});

router.patch("/:id", async (req, res) => {
  const built = buildPartialUpdate("tasks", req.params.id, req.body, [
    "title",
    "description",
    "assigned_to",
    "status",
    "due_date",
  ]);
  if (!built) return res.status(400).json({ error: "No fields to update" });
  const { rows } = await pool.query(built.sql, built.vals);
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  if (req.body.status === "done") await logActivity(req.user.sub, "task_completed", { task_id: req.params.id });
  res.json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM tasks WHERE id = $1", [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

export default router;
