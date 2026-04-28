import { Router } from "express";
import { pool } from "../db/pool.js";
import { authRequired, requireRoles } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [req.user.sub]
  );
  res.json(rows);
});

router.patch("/:id/read", async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
    [req.params.id, req.user.sub]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

router.post("/sync-renewals", requireRoles("admin"), async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT r.id, r.client_id, r.renewal_date, c.name
     FROM renewals r
     JOIN clients c ON c.id = r.client_id
     WHERE r.renewal_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
       AND r.status NOT IN ('Renewed','Lost')`
  );
  const admins = await pool.query(`SELECT id FROM users WHERE role = 'admin'`);
  let created = 0;
  for (const admin of admins.rows) {
    for (const r of rows) {
      const exists = await pool.query(
        `SELECT 1 FROM notifications WHERE user_id = $1 AND related_type = 'renewal' AND related_id = $2 AND created_at > NOW() - INTERVAL '2 days'`,
        [admin.id, r.id]
      );
      if (exists.rowCount) continue;
      await pool.query(
        `INSERT INTO notifications (user_id, message, read, related_type, related_id) VALUES ($1,$2,false,'renewal',$3)`,
        [admin.id, `Renewal soon (${r.renewal_date}): ${r.name}`, r.id]
      );
      created++;
    }
  }
  res.json({ created });
});

export default router;
