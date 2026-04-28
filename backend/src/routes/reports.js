import { Router } from "express";
import { pool } from "../db/pool.js";
import { authRequired, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

/** CSV export — policies with client (admin). */
router.get("/policies.csv", requireAdmin, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT p.policy_number, p.insurance_company, p.policy_type, p.status, p.premium, p.start_date, p.end_date,
            c.name AS client_name, c.phone AS client_phone
     FROM policies p
     JOIN clients c ON c.id = p.client_id
     ORDER BY p.updated_at DESC`
  );
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = ["policy_number", "insurance_company", "policy_type", "status", "premium", "start_date", "end_date", "client_name", "client_phone"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        esc(r.policy_number),
        esc(r.insurance_company),
        esc(r.policy_type),
        esc(r.status),
        esc(r.premium),
        esc(r.start_date),
        esc(r.end_date),
        esc(r.client_name),
        esc(r.client_phone),
      ].join(",")
    );
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="policies-export.csv"');
  res.send(lines.join("\n"));
});

/** JSON summary for custom PDF tooling (admin). */
router.get("/summary.json", requireAdmin, async (_req, res) => {
  const [policies, claims, renewals, premium] = await Promise.all([
    pool.query(`SELECT status, COUNT(*)::int AS c FROM policies GROUP BY status`),
    pool.query(`SELECT status, COUNT(*)::int AS c FROM claims GROUP BY status`),
    pool.query(`SELECT status, COUNT(*)::int AS c FROM renewals GROUP BY status`),
    pool.query(`SELECT COALESCE(SUM(premium),0)::numeric AS s FROM policies`),
  ]);
  res.json({
    policiesByStatus: policies.rows,
    claimsByStatus: claims.rows,
    renewalsByStatus: renewals.rows,
    totalPremium: Number(premium.rows[0].s),
    generatedAt: new Date().toISOString(),
  });
});

export default router;
