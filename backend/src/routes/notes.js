import { Router } from "express";
import { pool } from "../db/pool.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

router.post("/", async (req, res) => {
  const { entity_type, entity_id, content } = req.body;
  if (!entity_type || !entity_id || !content) {
    return res.status(400).json({ error: "entity_type, entity_id, content required" });
  }
  if (!["client", "policy", "claim", "renewal"].includes(entity_type)) {
    return res.status(400).json({ error: "invalid entity_type" });
  }
  const { rows } = await pool.query(
    `INSERT INTO notes (entity_type, entity_id, content, user_id) VALUES ($1,$2,$3,$4) RETURNING *`,
    [entity_type, entity_id, content, req.user.sub]
  );
  res.status(201).json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM notes WHERE id = $1", [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

export default router;
