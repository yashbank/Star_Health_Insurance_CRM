-- Policy extension + insured members + nominees (idempotent; aligns with POLICY_DOCUMENTpdf-6.pdf style fields)
-- Run after base schema.sql on every init.

ALTER TABLE policies ADD COLUMN IF NOT EXISTS previous_policy_number VARCHAR(128);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS base_sum_insured NUMERIC(14, 2);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS bonus_amount NUMERIC(14, 2);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS total_coverage NUMERIC(14, 2);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS recharge_benefit VARCHAR(255);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS premium NUMERIC(14, 2);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS policy_term VARCHAR(64);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS payment_frequency VARCHAR(64);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS zone VARCHAR(64);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS scheme VARCHAR(128);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS advisor_code VARCHAR(64);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS intermediary_code VARCHAR(64);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS office_name VARCHAR(255);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS office_address TEXT;

CREATE INDEX IF NOT EXISTS idx_policies_end_date ON policies(end_date);
CREATE INDEX IF NOT EXISTS idx_policies_product ON policies(product_name);

CREATE TABLE IF NOT EXISTS insured_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  dob DATE,
  age INTEGER,
  gender VARCHAR(32),
  relation VARCHAR(64),
  pre_existing_disease TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insured_members_policy ON insured_members(policy_id);
CREATE INDEX IF NOT EXISTS idx_insured_members_name ON insured_members(name);

CREATE TABLE IF NOT EXISTS policy_nominees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  relation VARCHAR(64),
  percentage NUMERIC(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_nominees_policy ON policy_nominees(policy_id);
