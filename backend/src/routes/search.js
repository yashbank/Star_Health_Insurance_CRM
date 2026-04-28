import { Router } from "express";
import { pool } from "../db/pool.js";
import { authRequired } from "../middleware/auth.js";
import { renewalTrafficLight } from "../utils/renewalTraffic.js";

const router = Router();
router.use(authRequired);

router.get("/", async (req, res) => {
  const raw = (req.query.q || "").trim();
  if (raw.length < 2) {
    return res.json({ clients: [], policies: [], members: [], claims: [] });
  }
  const q = `%${raw}%`;

  const [clientsR, policiesR, membersR, claimsR] = await Promise.all([
    pool.query(
      `SELECT c.id, c.name, c.phone, c.email, c.sum_insured, c.renewal_date, a.name AS advisor_name
       FROM clients c
       LEFT JOIN advisors a ON a.id = c.advisor_id
       WHERE c.name ILIKE $1 OR c.phone ILIKE $1 OR c.email ILIKE $1
       ORDER BY c.name ASC
       LIMIT 15`,
      [q]
    ),
    pool.query(
      `SELECT p.id, p.policy_number, p.product_name, p.status, p.premium, p.end_date,
              c.id AS client_id, c.name AS client_name, c.phone AS client_phone
       FROM policies p
       JOIN clients c ON c.id = p.client_id
       WHERE p.policy_number ILIKE $1
          OR COALESCE(p.product_name,'') ILIKE $1
          OR COALESCE(p.scheme,'') ILIKE $1
          OR COALESCE(p.advisor_code,'') ILIKE $1
          OR COALESCE(p.intermediary_code,'') ILIKE $1
          OR COALESCE(p.insurance_company,'') ILIKE $1
       ORDER BY p.updated_at DESC
       LIMIT 15`,
      [q]
    ),
    pool.query(
      `SELECT im.id, im.name, im.relation, im.policy_id,
              p.policy_number, c.id AS client_id, c.name AS client_name
       FROM insured_members im
       JOIN policies p ON p.id = im.policy_id
       JOIN clients c ON c.id = p.client_id
       WHERE im.name ILIKE $1 OR COALESCE(im.relation,'') ILIKE $1
       ORDER BY im.name ASC
       LIMIT 15`,
      [q]
    ),
    pool.query(
      `SELECT cl.id, cl.claim_number, cl.status, cl.amount, cl.description,
              c.id AS client_id, c.name AS client_name, p.policy_number
       FROM claims cl
       JOIN clients c ON c.id = cl.client_id
       LEFT JOIN policies p ON p.id = cl.policy_id
       WHERE COALESCE(cl.claim_number,'') ILIKE $1
          OR COALESCE(cl.description,'') ILIKE $1
          OR c.name ILIKE $1
       ORDER BY cl.updated_at DESC
       LIMIT 15`,
      [q]
    ),
  ]);

  const policies = policiesR.rows.map((row) => ({
    ...row,
    renewal_traffic_light: row.end_date ? renewalTrafficLight(row.end_date) : null,
  }));

  res.json({
    clients: clientsR.rows,
    policies,
    members: membersR.rows,
    claims: claimsR.rows,
  });
});

export default router;
