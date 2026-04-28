import { Router } from "express";
import { pool } from "../db/pool.js";
import { authRequired, requireRoles } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

router.get("/stats", async (req, res) => {
  try {
    const role = req.user.role;
    const isAdmin = role === "admin";

    const [clients, policies, renewals, claims, tasksOpen] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS c FROM clients"),
      pool.query("SELECT COUNT(*)::int AS c FROM policies"),
      pool.query("SELECT COUNT(*)::int AS c FROM renewals"),
      pool.query("SELECT COUNT(*)::int AS c FROM claims"),
      pool.query("SELECT COUNT(*)::int AS c FROM tasks WHERE status != 'done'"),
    ]);

    const renewalSoon = await pool.query(
      `SELECT COUNT(*)::int AS c FROM renewals r
       JOIN clients c ON c.id = r.client_id
       WHERE r.renewal_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
         AND r.status NOT IN ('Renewed','Dropped')`
    );

    const expiringPolicies = await pool.query(
      `SELECT COUNT(*)::int AS c FROM policies p
       WHERE (p.end_date IS NOT NULL AND p.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days')
          OR (p.end_date IS NULL AND EXISTS (
               SELECT 1 FROM clients c2 WHERE c2.id = p.client_id
                 AND c2.renewal_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
             ))`
    );

    const totalPremium = isAdmin
      ? await pool.query(`SELECT COALESCE(SUM(premium), 0)::numeric AS s FROM policies WHERE premium IS NOT NULL`)
      : { rows: [{ s: 0 }] };

    const upsell = isAdmin
      ? await pool.query(
          `SELECT c.id, c.name, c.phone, c.sum_insured, c.policy_details, a.name AS advisor_name
           FROM clients c
           LEFT JOIN advisors a ON a.id = c.advisor_id
           WHERE c.sum_insured < 200000
           ORDER BY c.sum_insured ASC NULLS FIRST
           LIMIT 20`
        )
      : { rows: [] };

    const advisors = isAdmin
      ? await pool.query("SELECT COUNT(*)::int AS c FROM advisors")
      : { rows: [{ c: 0 }] };

    const dailyWeekly = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM activities WHERE created_at >= CURRENT_DATE) AS activities_today,
        (SELECT COUNT(*) FROM activities WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS activities_week,
        (SELECT COUNT(*) FROM policies WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS policies_week,
        (SELECT COUNT(*) FROM renewals WHERE updated_at >= CURRENT_DATE - INTERVAL '7 days') AS renewals_touched_week`
    );

    const payload = {
      role,
      totals: {
        advisors: advisors.rows[0].c,
        clients: clients.rows[0].c,
        policies: policies.rows[0].c,
        renewals: renewals.rows[0].c,
        claims: claims.rows[0].c,
        openTasks: tasksOpen.rows[0].c,
        renewalsDue30d: renewalSoon.rows[0].c,
        expiringPolicies30d: expiringPolicies.rows[0].c,
        ...(isAdmin ? { totalPremium: Number(totalPremium.rows[0].s) } : {}),
      },
      performance: dailyWeekly.rows[0],
      ...(isAdmin ? { upsellOpportunities: upsell.rows } : {}),
    };

    res.json(payload);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/** Task-focused counts for assistants (and summary for admin). */
router.get("/desk", async (req, res) => {
  try {
    const uid = req.user.sub;
    const isAdmin = req.user.role === "admin";
    const polFilter = isAdmin ? "" : "AND p.assigned_assistant_id = $1";
    const params = isAdmin ? [] : [uid];

    const pendingPay = await pool.query(
      `SELECT COUNT(*)::int AS c FROM policies p WHERE p.status = 'Pending Payment' ${polFilter}`,
      params
    );
    const renewalDue = await pool.query(
      `SELECT COUNT(*)::int AS c FROM policies p
       WHERE p.status = 'Renewal Due' OR (p.end_date IS NOT NULL AND p.end_date <= CURRENT_DATE + INTERVAL '45 days')
       ${polFilter}`,
      params
    );
    const claimsProgress = await pool.query(
      `SELECT COUNT(*)::int AS c FROM claims cl
       LEFT JOIN policies p ON p.id = cl.policy_id
       WHERE cl.status IN ('Filed','Under Review')
       ${isAdmin ? "" : "AND (p.assigned_assistant_id = $1 OR p.id IS NULL)"}`,
      params
    );
    const renewalsSoon = await pool.query(
      `SELECT COUNT(*)::int AS c FROM renewals r
       WHERE r.renewal_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
         AND r.status NOT IN ('Renewed','Dropped')`
    );

    res.json({
      policiesPendingPayment: pendingPay.rows[0].c,
      policiesRenewalWindow: renewalDue.rows[0].c,
      claimsInProgress: claimsProgress.rows[0].c,
      renewalsDue30d: renewalsSoon.rows[0].c,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/** Charts + KPIs for admin console only. */
router.get("/analytics", requireRoles("admin"), async (req, res) => {
  try {
    const [mix, premiumMonth, policiesCreated, renewalsTouched] = await Promise.all([
      pool.query(
        `SELECT COALESCE(NULLIF(TRIM(policy_type), ''), NULLIF(TRIM(product_name), ''), 'Other') AS name,
                COUNT(*)::int AS value
         FROM policies
         GROUP BY 1
         ORDER BY value DESC
         LIMIT 12`
      ),
      pool.query(
        `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                COALESCE(SUM(premium),0)::numeric AS premium
         FROM policies
         WHERE created_at >= CURRENT_DATE - INTERVAL '8 months'
         GROUP BY 1
         ORDER BY 1 ASC`
      ),
      pool.query(
        `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
                COUNT(*)::int AS cnt
         FROM policies
         WHERE created_at >= CURRENT_DATE - INTERVAL '8 months'
         GROUP BY 1
         ORDER BY 1 ASC`
      ),
      pool.query(
        `SELECT to_char(date_trunc('month', updated_at), 'YYYY-MM') AS month,
                COUNT(*)::int AS cnt
         FROM renewals
         WHERE updated_at >= CURRENT_DATE - INTERVAL '8 months'
         GROUP BY 1
         ORDER BY 1 ASC`
      ),
    ]);

    const highSi = await pool.query(
      `SELECT COUNT(*)::int AS c FROM clients WHERE sum_insured >= 500000`
    );

    const leadsConversion = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM clients) AS leads,
         (SELECT COUNT(*)::int FROM policies WHERE status = 'Active') AS active_policies`
    );

    res.json({
      policyMix: mix.rows,
      premiumByMonth: premiumMonth.rows.map((r) => ({
        month: r.month,
        premium: Number(r.premium),
      })),
      newPoliciesByMonth: policiesCreated.rows,
      renewalsTouchedByMonth: renewalsTouched.rows,
      highSumInsuredClients: highSi.rows[0].c,
      conversion: leadsConversion.rows[0],
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/activities", requireRoles("admin"), async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const { rows } = await pool.query(
    `SELECT a.*, u.name AS user_name, u.role AS user_role
     FROM activities a
     LEFT JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC
     LIMIT $1`,
    [limit]
  );
  res.json(rows);
});

/** Assistant workload leaderboard (admin). */
router.get("/leaderboard", requireRoles("admin"), async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.role,
            (SELECT COUNT(*)::int FROM policies p WHERE p.assigned_assistant_id = u.id) AS policies_owned,
            (SELECT COUNT(*)::int FROM claims cl
              JOIN policies p ON p.id = cl.policy_id
              WHERE p.assigned_assistant_id = u.id) AS claims_on_desk
     FROM users u
     WHERE u.role IN ('assistant1','assistant2')
     ORDER BY policies_owned DESC`
  );
  res.json(rows);
});

export default router;
