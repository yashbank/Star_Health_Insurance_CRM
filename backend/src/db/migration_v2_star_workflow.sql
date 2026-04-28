-- v2: Star Health–oriented workflows, RBAC-friendly fields, claims↔policy link, renewal/claim status vocabulary

-- Clients: tags + high-value flag
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_high_value BOOLEAN DEFAULT false;

-- Policies: insurer, assistant assignment, type, renewal anchor
ALTER TABLE policies ADD COLUMN IF NOT EXISTS insurance_company VARCHAR(128) DEFAULT 'Star Health';
ALTER TABLE policies ADD COLUMN IF NOT EXISTS assigned_assistant_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS policy_type VARCHAR(128);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS renewal_date DATE;

CREATE INDEX IF NOT EXISTS idx_policies_assistant ON policies(assigned_assistant_id);
CREATE INDEX IF NOT EXISTS idx_policies_insurer ON policies(insurance_company);
CREATE INDEX IF NOT EXISTS idx_policies_type ON policies(policy_type);

-- Claims: external id, policy link, timeline, assistant notes
ALTER TABLE claims ADD COLUMN IF NOT EXISTS claim_number VARCHAR(64);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS policy_id UUID REFERENCES policies(id) ON DELETE SET NULL;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]'::jsonb;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS assistant_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_claims_policy ON claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_number ON claims(claim_number);

-- Documents: versioning + claim owner
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_owner_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_owner_type_check CHECK (owner_type IN ('client', 'policy', 'claim'));

-- Policy status lifecycle (drop legacy CHECK, migrate values, re-add)
ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_status_check;
UPDATE policies SET status = CASE status
  WHEN 'Approved' THEN 'Active'
  WHEN 'Query Raised' THEN 'Pending Payment'
  WHEN 'Pending' THEN 'Pending Payment'
  ELSE COALESCE(status, 'Active') END;
ALTER TABLE policies ADD CONSTRAINT policies_status_check CHECK (status IN (
  'Active', 'Pending Payment', 'Lapsed', 'Renewal Due'
));

-- Renewal pipeline vocabulary
ALTER TABLE renewals DROP CONSTRAINT IF EXISTS renewals_status_check;
UPDATE renewals SET status = CASE status
  WHEN 'Upcoming' THEN 'Not Contacted'
  WHEN 'Pending' THEN 'Not Contacted'
  WHEN 'Lost' THEN 'Dropped'
  WHEN 'Contacted' THEN 'Contacted'
  WHEN 'Renewed' THEN 'Renewed'
  ELSE COALESCE(status, 'Not Contacted') END;
ALTER TABLE renewals ADD CONSTRAINT renewals_status_check CHECK (status IN (
  'Not Contacted', 'Contacted', 'Renewed', 'Dropped'
));

-- Claim status vocabulary
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_status_check;
UPDATE claims SET status = CASE status
  WHEN 'Open' THEN 'Filed'
  WHEN 'In Review' THEN 'Under Review'
  WHEN 'Closed' THEN 'Closed'
  ELSE COALESCE(status, 'Filed') END;
ALTER TABLE claims ADD CONSTRAINT claims_status_check CHECK (status IN (
  'Filed', 'Under Review', 'Approved', 'Rejected', 'Closed'
));
