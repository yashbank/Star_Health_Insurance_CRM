import fs from "fs";
import { Router } from "express";
import { pool } from "../db/pool.js";
import { authRequired, requireAdmin, requireRoles } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { buildPartialUpdate } from "../utils/partialUpdate.js";
import { renewalTrafficLight } from "../utils/renewalTraffic.js";

const router = Router();
router.use(authRequired);

const POLICY_PATCH_KEYS = [
  "policy_number",
  "previous_policy_number",
  "product_name",
  "insurance_company",
  "policy_type",
  "assigned_assistant_id",
  "renewal_date",
  "status",
  "sum_insured",
  "base_sum_insured",
  "bonus_amount",
  "total_coverage",
  "recharge_benefit",
  "premium",
  "start_date",
  "end_date",
  "policy_term",
  "payment_frequency",
  "zone",
  "scheme",
  "advisor_code",
  "intermediary_code",
  "office_name",
  "office_address",
  "details",
  "backoffice_query_notes",
];

router.get("/", async (req, res) => {
  const { status, clientId, from, to } = req.query;
  const cond = [];
  const params = [];
  let i = 1;
  if (req.user.role !== "admin") {
    cond.push(`p.assigned_assistant_id = $${i++}::uuid`);
    params.push(req.user.sub);
  }
  if (status) {
    cond.push(`p.status = $${i++}`);
    params.push(status);
  }
  if (clientId) {
    cond.push(`p.client_id = $${i++}`);
    params.push(clientId);
  }
  if (from) {
    cond.push(`p.created_at::date >= $${i++}::date`);
    params.push(from);
  }
  if (to) {
    cond.push(`p.created_at::date <= $${i++}::date`);
    params.push(to);
  }
  const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT p.*, c.name AS client_name, c.phone AS client_phone, c.renewal_date AS client_renewal_date
     FROM policies p
     JOIN clients c ON c.id = p.client_id
     ${where}
     ORDER BY p.updated_at DESC`,
    params
  );
  const out = rows.map((r) => ({
    ...r,
    expiry_traffic_light: r.end_date
      ? renewalTrafficLight(r.end_date)
      : r.client_renewal_date
        ? renewalTrafficLight(r.client_renewal_date)
        : null,
  }));
  res.json(out);
});

router.post("/import-csv", requireAdmin, upload.single("file"), async (req, res) => {
  if (!req.file?.path) return res.status(400).json({ error: "file required" });
  const raw = fs.readFileSync(req.file.path, "utf8");
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return res.status(400).json({ error: "CSV needs header + rows" });
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (name) => header.indexOf(name);
  const need = ["client_id", "policy_number"];
  for (const n of need) {
    if (idx(n) < 0) return res.status(400).json({ error: `Missing column: ${n}` });
  }
  let inserted = 0;
  const errors = [];
  for (let r = 1; r < lines.length; r++) {
    const cols = lines[r].split(",").map((c) => c.trim());
    const get = (n) => {
      const i = idx(n);
      return i < 0 ? "" : cols[i] || "";
    };
    const client_id = get("client_id");
    const policy_number = get("policy_number");
    if (!client_id || !policy_number) {
      errors.push({ row: r + 1, error: "client_id and policy_number required" });
      continue;
    }
    try {
      const asst = get("assigned_assistant_id");
      await pool.query(
        `INSERT INTO policies (
           client_id, policy_number, insurance_company, policy_type, status, premium,
           assigned_assistant_id, product_name, sum_insured
         ) VALUES ($1,$2,$3,$4,$5,$6,$7::uuid,$8,$9)`,
        [
          client_id,
          policy_number,
          get("insurance_company") || "Star Health",
          get("policy_type") || null,
          get("status") || "Active",
          get("premium") ? Number(get("premium")) : null,
          asst || null,
          get("product_name") || null,
          get("sum_insured") ? Number(get("sum_insured")) : null,
        ]
      );
      inserted++;
    } catch (e) {
      errors.push({ row: r + 1, error: e.message || String(e) });
    }
  }
  res.status(201).json({ inserted, errors });
});

router.get("/:id", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.*, c.name AS client_name, c.phone AS client_phone, c.email AS client_email, c.renewal_date AS client_renewal_date
     FROM policies p
     JOIN clients c ON c.id = p.client_id
     WHERE p.id = $1`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  const policy = rows[0];
  if (req.user.role !== "admin") {
    const mine = policy.assigned_assistant_id && String(policy.assigned_assistant_id) === String(req.user.sub);
    if (!mine) return res.status(403).json({ error: "This policy is not assigned to you" });
  }
  const [members, nominees] = await Promise.all([
    pool.query(
      `SELECT id, name, dob, age, gender, relation, pre_existing_disease, created_at
       FROM insured_members WHERE policy_id = $1 ORDER BY relation, name`,
      [req.params.id]
    ),
    pool.query(
      `SELECT id, name, relation, percentage, created_at FROM policy_nominees WHERE policy_id = $1 ORDER BY name`,
      [req.params.id]
    ),
  ]);
  res.json({
    policy: {
      ...policy,
      expiry_traffic_light: policy.end_date
        ? renewalTrafficLight(policy.end_date)
        : policy.client_renewal_date
          ? renewalTrafficLight(policy.client_renewal_date)
          : null,
    },
    members: members.rows,
    nominees: nominees.rows,
    coverage: {
      base_sum_insured: policy.base_sum_insured,
      bonus_amount: policy.bonus_amount,
      total_coverage: policy.total_coverage,
      recharge_benefit: policy.recharge_benefit,
      sum_insured_legacy: policy.sum_insured,
    },
  });
});

router.post("/", requireRoles("admin", "assistant1", "assistant2"), async (req, res) => {
  const b = req.body;
  if (!b.client_id) return res.status(400).json({ error: "client_id required" });
  const assistant =
    b.assigned_assistant_id !== undefined && b.assigned_assistant_id !== "" && b.assigned_assistant_id !== null
      ? b.assigned_assistant_id
      : req.user.role === "admin"
        ? null
        : req.user.sub;
  const { rows } = await pool.query(
    `INSERT INTO policies (
       client_id, policy_number, previous_policy_number, product_name, insurance_company, policy_type,
       renewal_date, assigned_assistant_id, status, sum_insured,
       base_sum_insured, bonus_amount, total_coverage, recharge_benefit, premium,
       start_date, end_date, policy_term, payment_frequency, zone, scheme,
       advisor_code, intermediary_code, office_name, office_address,
       details, backoffice_query_notes
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7::date,$8::uuid,$9,$10,
       $11,$12,$13,$14,$15,$16::date,$17::date,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27
     ) RETURNING *`,
    [
      b.client_id,
      b.policy_number || null,
      b.previous_policy_number || null,
      b.product_name || null,
      b.insurance_company || "Star Health",
      b.policy_type || null,
      b.renewal_date || null,
      assistant,
      b.status || "Active",
      b.sum_insured ?? null,
      b.base_sum_insured ?? null,
      b.bonus_amount ?? null,
      b.total_coverage ?? null,
      b.recharge_benefit || null,
      b.premium ?? null,
      b.start_date || null,
      b.end_date || null,
      b.policy_term || null,
      b.payment_frequency || null,
      b.zone || null,
      b.scheme || null,
      b.advisor_code || null,
      b.intermediary_code || null,
      b.office_name || null,
      b.office_address || null,
      b.details || null,
      b.backoffice_query_notes || null,
    ]
  );
  res.status(201).json(rows[0]);
});

router.patch("/:id", requireRoles("admin", "assistant1", "assistant2"), async (req, res) => {
  if (req.user.role !== "admin") {
    const { rows: pr } = await pool.query(`SELECT assigned_assistant_id FROM policies WHERE id = $1`, [req.params.id]);
    if (!pr.length) return res.status(404).json({ error: "Not found" });
    if (String(pr[0].assigned_assistant_id || "") !== String(req.user.sub)) {
      return res.status(403).json({ error: "Not assigned to you" });
    }
    if (req.body.assigned_assistant_id !== undefined) {
      return res.status(403).json({ error: "Assistants cannot reassign ownership" });
    }
  }
  const built = buildPartialUpdate("policies", req.params.id, req.body, POLICY_PATCH_KEYS);
  if (!built) return res.status(400).json({ error: "No fields to update" });
  const { rows } = await pool.query(built.sql, built.vals);
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

router.post("/:id/documents", requireRoles("admin", "assistant1", "assistant2"), upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file required" });
  if (req.user.role !== "admin") {
    const { rows: pr } = await pool.query(`SELECT assigned_assistant_id FROM policies WHERE id = $1`, [req.params.id]);
    if (!pr.length) return res.status(404).json({ error: "Not found" });
    if (String(pr[0].assigned_assistant_id || "") !== String(req.user.sub)) {
      return res.status(403).json({ error: "Not assigned to you" });
    }
  }
  const nextVer = await pool.query(
    `SELECT COALESCE(MAX(version),0)+1 AS v FROM documents WHERE owner_type = 'policy' AND owner_id = $1::uuid`,
    [req.params.id]
  );
  const v = Number(nextVer.rows[0].v || 1);
  await pool.query(`UPDATE policies SET document_path = $1, updated_at = NOW() WHERE id = $2`, [
    req.file.filename,
    req.params.id,
  ]);
  const { rows } = await pool.query(
    `INSERT INTO documents (owner_type, owner_id, file_path, original_name, version)
     VALUES ('policy',$1,$2,$3,$4) RETURNING *`,
    [req.params.id, req.file.filename, req.file.originalname, v]
  );
  res.status(201).json(rows[0]);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM policies WHERE id = $1", [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

export default router;
