import bcrypt from "bcryptjs";

const hash = (p) => bcrypt.hashSync(p, 10);

/** Volume targets (50–100 per major entity). */
const COUNTS = {
  advisors: 55,
  clients: 85,
  policies: 92,
  claims: 88,
  renewals: 82,
  tasks: 72,
  notes: 65,
  activities: 58,
  notifications: 52,
};

const FIRST_NAMES = [
  "Aarav", "Aditya", "Ananya", "Arjun", "Diya", "Ishaan", "Kavya", "Krishna", "Meera", "Neha", "Pari", "Rahul", "Riya", "Rohan", "Saanvi",
  "Sneha", "Tanvi", "Vikram", "Yash", "Zara", "Dev", "Ira", "Kabir", "Laksh", "Mira", "Nikhil", "Ojas", "Priya", "Reyaan", "Sia",
];
const LAST_NAMES = [
  "Mehta", "Sharma", "Patel", "Iyer", "Reddy", "Nair", "Kulkarni", "Desai", "Singh", "Kapoor", "Malhotra", "Bose", "Chatterjee", "Menon", "Rao",
  "Verma", "Agarwal", "Joshi", "Pillai", "Banerjee", "Ghosh", "Das", "Khanna", "Grover", "Sethi", "Bhatia", "Kaur", "Chopra", "Sen", "Dutta",
];

const POLICY_TYPES = [
  "Family Floater",
  "Senior Care Red Carpet",
  "Comprehensive Motor",
  "Young Star",
  "Super Surplus",
  "Diabetes Care",
  "Cardiac Care",
  "Women Care",
];

const CLAIM_STATUSES = ["Filed", "Under Review", "Approved", "Rejected", "Closed"];
const POLICY_STATUSES = ["Active", "Pending Payment", "Lapsed", "Renewal Due"];
const RENEWAL_STATUSES = ["Not Contacted", "Contacted", "Renewed", "Dropped"];

function padNum(n, w) {
  return String(n).padStart(w, "0");
}

function renewalDateForIndex(i) {
  const d = 1 + (i % 28);
  const m = 4 + Math.floor((i / 30) % 8);
  const y = 2026;
  return `${y}-${padNum(m, 2)}-${padNum(d, 2)}`;
}

/** Run demo seed inside an existing transaction (BEGIN already issued). */
export async function executeSeed(client) {
  await client.query(
    "TRUNCATE activities, notifications, documents, notes, tasks, claims, renewals, policy_nominees, insured_members, policies, clients, advisors, users CASCADE"
  );

  const users = await client.query(
    `INSERT INTO users (name, role, email, password_hash) VALUES
     ('Priya Sharma', 'admin', 'admin@crm.local', $1),
     ('Rahul Verma', 'assistant1', 'assistant1@crm.local', $2),
     ('Anita Desai', 'assistant2', 'assistant2@crm.local', $3)
     RETURNING id, role, email`,
    [hash("admin123"), hash("assist123"), hash("assist123")]
  );

  const adminId = users.rows.find((r) => r.role === "admin").id;
  const a1 = users.rows.find((r) => r.role === "assistant1").id;
  const a2 = users.rows.find((r) => r.role === "assistant2").id;

  const advisorIds = [];
  for (let i = 1; i <= COUNTS.advisors; i++) {
    const r = await client.query(
      `INSERT INTO advisors (name, phone, email) VALUES ($1, $2, $3) RETURNING id`,
      [
        `Star Advisor ${padNum(i, 3)}`,
        `9${String(700000000 + i).slice(0, 9)}`,
        `adv${padNum(i, 3)}@star-health-desk.local`,
      ]
    );
    advisorIds.push(r.rows[0].id);
  }

  const clientIds = [];
  const featured = [
    {
      name: "Vikram Mehta",
      phone: "9876543210",
      email: "vikram@email.com",
      sum: 550000,
      renewal: "2026-06-15",
      policy: "Star Health — Family Floater",
      tags: "high-value,family-floater",
      high: true,
    },
    {
      name: "Sneha Kulkarni",
      phone: "9123456789",
      email: "sneha@email.com",
      sum: 150000,
      renewal: "2026-05-20",
      policy: "Star Health — Comprehensive Motor",
      tags: "motor",
      high: false,
    },
    {
      name: "Arjun Rao",
      phone: "9988776655",
      email: "arjun@email.com",
      sum: 2500000,
      renewal: "2026-08-20",
      policy: "Star Health — Super Surplus",
      tags: "sum-insured-upgrade",
      high: true,
    },
    {
      name: "Meera Iyer",
      phone: "9090909090",
      email: "meera@email.com",
      sum: 80000,
      renewal: "2026-05-01",
      policy: "Star Health — Senior Care",
      tags: "senior",
      high: false,
    },
    {
      name: "Karan Singh",
      phone: "9811122233",
      email: "karan@email.com",
      sum: 120000,
      renewal: "2026-07-30",
      policy: "Star Health — Young Star",
      tags: "young-star",
      high: false,
    },
  ];

  for (let i = 0; i < featured.length; i++) {
    const c = featured[i];
    const adv = advisorIds[i % advisorIds.length];
    const r = await client.query(
      `INSERT INTO clients (name, phone, email, advisor_id, policy_details, sum_insured, renewal_date, tags, is_high_value)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [c.name, c.phone, c.email, adv, c.policy, c.sum, c.renewal, c.tags, c.high]
    );
    clientIds.push(r.rows[0].id);
  }

  const bulkClients = COUNTS.clients - featured.length;
  for (let i = 1; i <= bulkClients; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const ln = LAST_NAMES[(i * 3) % LAST_NAMES.length];
    const name = `${fn} ${ln} ${padNum(i, 3)}`;
    const phone = `9${String(6000000000 + (i % 999999999)).slice(0, 9)}`;
    const email = `client${padNum(i, 4)}@demo.star-crm.local`;
    const adv = advisorIds[i % advisorIds.length];
    const sum = 100000 + (i % 50) * 25000;
    const renewal = renewalDateForIndex(i + 20);
    const tags = i % 7 === 0 ? "high-value,priority" : i % 5 === 0 ? "renewal-watch" : "standard";
    const high = i % 11 === 0;
    const r = await client.query(
      `INSERT INTO clients (name, phone, email, advisor_id, policy_details, sum_insured, renewal_date, tags, is_high_value)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [name, phone, email, adv, `Star Health portfolio #${i}`, sum, renewal, tags, high]
    );
    clientIds.push(r.rows[0].id);
  }

  const polMotor = await client.query(
    `INSERT INTO policies (
       client_id, policy_number, insurance_company, policy_type, status, sum_insured, premium,
       start_date, end_date, renewal_date, assigned_assistant_id, details, product_name
     ) VALUES (
       $1,'SH-MOT-88421','Star Health','Motor – Private Car','Pending Payment',150000,14200,
       '2025-06-01','2026-05-31','2026-05-15',$2,'NCB proof pending — desk follow-up','Comprehensive Motor'
     ) RETURNING id`,
    [clientIds[1], a1]
  );

  const polLife = await client.query(
    `INSERT INTO policies (
       client_id, policy_number, insurance_company, policy_type, status, sum_insured, premium,
       start_date, end_date, renewal_date, assigned_assistant_id, details, product_name
     ) VALUES (
       $1,'SH-TRM-99201','Star Health','Term Life','Active',2500000,28900,
       '2024-08-01','2026-07-31','2026-07-20',$2,'Underwriting clean case','Super Surplus Term'
     ) RETURNING id`,
    [clientIds[2], a2]
  );

  const docPolicy = await client.query(
    `INSERT INTO policies (
       client_id, policy_number, previous_policy_number, product_name, insurance_company, policy_type,
       status, sum_insured, base_sum_insured, bonus_amount, total_coverage, recharge_benefit, premium,
       start_date, end_date, renewal_date, policy_term, payment_frequency, zone, scheme,
       advisor_code, intermediary_code, office_name, office_address,
       assigned_assistant_id, details, backoffice_query_notes
     ) VALUES (
       $1,
       'UHIH-2604-8841201',
       'UHIH-2504-7720392',
       'Family Floater Health Shield Plus',
       'Star Health',
       'Family Floater',
       'Active',
       550000,
       500000,
       50000,
       550000,
       '100% of base SI (aggregate recharge as per policy wording)',
       32580,
       '2026-04-01',
       '2027-03-31',
       '2027-03-15',
       '1 year',
       'Annual',
       'Zone II',
       'Gold',
       'ADV-MUM-0142',
       'INT-STAR-88291',
       'Star Health — Mumbai Regional Servicing',
       'Tower A, 5th Floor, BKC, Bandra East, Mumbai 400051',
       $2,
       'Sample schedule aligned to CRM extended fields.',
       ''
     ) RETURNING id`,
    [clientIds[0], a1]
  );
  const samplePolicyId = docPolicy.rows[0].id;

  await client.query(
    `INSERT INTO insured_members (policy_id, name, dob, age, gender, relation, pre_existing_disease) VALUES
     ($1,'Vikram Mehta','1985-03-12',41,'Male','Self','None declared'),
     ($1,'Anjali Mehta','1988-07-22',37,'Female','Spouse','None declared'),
     ($1,'Aarav Mehta','2016-11-05',9,'Male','Child','None declared')`,
    [samplePolicyId]
  );

  await client.query(
    `INSERT INTO policy_nominees (policy_id, name, relation, percentage) VALUES
     ($1,'Anjali Mehta','Spouse',60),
     ($1,'Aarav Mehta','Child',40)`,
    [samplePolicyId]
  );

  await client.query(
    `INSERT INTO documents (owner_type, owner_id, file_path, original_name, version) VALUES
     ('policy',$1,'/demo/sample-id-card.pdf','ID Proof — primary proposer.pdf',1)`,
    [samplePolicyId]
  );

  const policyIds = [polMotor.rows[0].id, polLife.rows[0].id, samplePolicyId];
  const extraPolicies = COUNTS.policies - 3;
  for (let i = 1; i <= extraPolicies; i++) {
    const cid = clientIds[i % clientIds.length];
    const asst = i % 2 === 0 ? a1 : a2;
    const ptype = POLICY_TYPES[i % POLICY_TYPES.length];
    const st = POLICY_STATUSES[i % POLICY_STATUSES.length];
    const prem = 8000 + (i % 40) * 900;
    const sum = 300000 + (i % 60) * 15000;
    const pn = `SH-DEMO-${padNum(i, 5)}`;
    const start = `2025-${padNum((i % 9) + 1, 2)}-10`;
    const end = `2026-${padNum((i % 9) + 1, 2)}-09`;
    const r = await client.query(
      `INSERT INTO policies (
         client_id, policy_number, insurance_company, policy_type, status, sum_insured, premium,
         start_date, end_date, renewal_date, assigned_assistant_id, details, product_name
       ) VALUES ($1,$2,'Star Health',$3,$4,$5,$6,$7::date,$8::date,$9::date,$10,$11,$12) RETURNING id`,
      [
        cid,
        pn,
        ptype,
        st,
        sum,
        prem,
        start,
        end,
        renewalDateForIndex(i + 3),
        asst,
        `Auto-seeded policy ${i} for desk training.`,
        `${ptype} — retail`,
      ]
    );
    policyIds.push(r.rows[0].id);
  }

  for (let i = 0; i < COUNTS.renewals; i++) {
    const cid = clientIds[(i * 7) % clientIds.length];
    const rd = renewalDateForIndex(i + 5);
    const st = RENEWAL_STATUSES[i % RENEWAL_STATUSES.length];
    await client.query(
      `INSERT INTO renewals (client_id, renewal_date, status, reminder_date, call_logs)
       VALUES ($1,$2,$3,$4,$5::jsonb)`,
      [
        cid,
        rd,
        st,
        i % 3 === 0 ? rd : null,
        JSON.stringify([{ at: "2026-03-15", note: `Sample renewal note #${i + 1}` }]),
      ]
    );
  }

  const { rows: claimPolicies } = await client.query(
    `SELECT id, client_id, policy_number FROM policies ORDER BY policy_number LIMIT $1`,
    [COUNTS.claims]
  );
  for (let i = 0; i < claimPolicies.length; i++) {
    const p = claimPolicies[i];
    const st = CLAIM_STATUSES[i % CLAIM_STATUSES.length];
    const amt = 5000 + (i % 45) * 3200;
    const cn = `CLM-2026-${padNum(i + 1, 5)}`;
    await client.query(
      `INSERT INTO claims (client_id, policy_id, claim_number, description, status, amount, timeline, assistant_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
      [
        p.client_id,
        p.id,
        cn,
        `Claim linked to ${p.policy_number} — ${st.toLowerCase()} stage (sample).`,
        st,
        amt,
        JSON.stringify([{ at: "2026-02-01", by: "desk", note: `Intake #${i + 1}` }]),
        st === "Under Review" ? "Awaiting insurer / TPA response." : "Demo assistant note.",
      ]
    );
  }

  for (let i = 0; i < COUNTS.tasks; i++) {
    const assignee = i % 3 === 0 ? a1 : i % 3 === 1 ? a2 : adminId;
    const st = i % 4 === 0 ? "done" : i % 3 === 0 ? "in_progress" : "open";
    await client.query(
      `INSERT INTO tasks (title, description, assigned_to, assigned_by, status, due_date) VALUES ($1,$2,$3,$4,$5, CURRENT_DATE + ($6::integer))`,
      [
        `Task ${i + 1}: Star follow-up`,
        `Bulk-seeded operational task for CRM training.`,
        assignee,
        adminId,
        st,
        (i % 14) + 1,
      ]
    );
  }

  const { rows: claimIdRows } = await client.query(`SELECT id FROM claims ORDER BY created_at`);
  const claimIdsList = claimIdRows.map((r) => r.id);
  const { rows: renewalIdRows } = await client.query(`SELECT id FROM renewals ORDER BY created_at`);
  const renewalIdsList = renewalIdRows.map((r) => r.id);

  for (let i = 0; i < COUNTS.notes; i++) {
    const types = ["client", "policy", "claim", "renewal"];
    const t = types[i % types.length];
    let eid;
    if (t === "client") eid = clientIds[i % clientIds.length];
    else if (t === "policy") eid = policyIds[i % policyIds.length];
    else if (t === "claim") eid = claimIdsList[i % Math.max(1, claimIdsList.length)] ?? clientIds[0];
    else eid = renewalIdsList[i % Math.max(1, renewalIdsList.length)] ?? clientIds[0];
    await client.query(`INSERT INTO notes (entity_type, entity_id, content, user_id) VALUES ($1,$2,$3,$4)`, [
      t,
      eid,
      `Bulk note #${i + 1} on ${t} for training data.`,
      i % 2 === 0 ? a1 : a2,
    ]);
  }

  for (let i = 0; i < COUNTS.activities; i++) {
    const uid = i % 3 === 0 ? adminId : i % 3 === 1 ? a1 : a2;
    const actions = ["login", "policy_view", "renewal_call", "claim_update", "client_edit", "document_upload"];
    const act = actions[i % actions.length];
    await client.query(`INSERT INTO activities (user_id, action, meta) VALUES ($1,$2,$3::jsonb)`, [
      uid,
      act,
      JSON.stringify({ seq: i + 1, demo: true }),
    ]);
  }

  for (let i = 0; i < COUNTS.notifications; i++) {
    const read = i % 4 === 0;
    const rel = i % 3 === 0 ? "client" : null;
    const rid = rel ? clientIds[i % clientIds.length] : null;
    await client.query(
      `INSERT INTO notifications (user_id, message, read, related_type, related_id) VALUES ($1,$2,$3,$4,$5)`,
      [adminId, `Demo notification #${i + 1}: renewals / claims queue snapshot.`, read, rel, rid]
    );
  }

  await client.query(
    `INSERT INTO notes (entity_type, entity_id, content, user_id) VALUES
     ('client',$1,'VIP client – prefers morning calls; Star floater flagship case.',$2),
     ('client',$3,'Potential upgrade to Super Surplus on renewal.',$2),
     ('policy',$4,'KYC pack verified for floater policy.',$5)`,
    [clientIds[0], adminId, clientIds[2], samplePolicyId, a1]
  );
}
