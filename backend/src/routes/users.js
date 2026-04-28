import { Router } from "express";
import { pool } from "../db/pool.js";
import { authRequired, requireRoles } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

router.get("/", requireRoles("admin"), async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, role, email, created_at FROM users ORDER BY role, name`
  );
  res.json(rows);
});

export default router;
