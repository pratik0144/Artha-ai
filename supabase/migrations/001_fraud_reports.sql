-- supabase/migrations/001_fraud_reports.sql
-- Run this SQL in your Supabase SQL Editor to create the fraud_reports table.

CREATE TABLE IF NOT EXISTS fraud_reports (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id    TEXT REFERENCES accounts(account_id) ON DELETE SET NULL,
    contact_info  TEXT NOT NULL,
    details       TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'resolved')),
    submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for speed
CREATE INDEX IF NOT EXISTS idx_fraud_reports_account ON fraud_reports (account_id);

-- Enable RLS
ALTER TABLE fraud_reports ENABLE ROW LEVEL SECURITY;

-- Enable public read/write or authenticated/service-role policies
CREATE POLICY "Allow public insert to fraud_reports"
    ON fraud_reports FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public read own fraud_reports"
    ON fraud_reports FOR SELECT
    USING (true);
