-- =============================================================================
-- Artha AI (DigiSeva) — Supabase PostgreSQL Schema
-- Generated from mock_bank.py, schemes_database.json, fraud_detection_agent.py
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ACCOUNTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE accounts (
    account_id       TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    age              INTEGER NOT NULL CHECK (age >= 0 AND age <= 150),
    gender           TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    language         JSONB NOT NULL DEFAULT '{"primary":"hindi","display_languages":["hindi","english"]}',
    occupation       TEXT NOT NULL,
    location         TEXT NOT NULL,
    location_type    TEXT NOT NULL CHECK (location_type IN ('village', 'town', 'city')),
    state            TEXT NOT NULL,
    balance          NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    account_type     TEXT NOT NULL CHECK (account_type IN ('Jan Dhan', 'savings', 'current', 'none')),
    linked_aadhaar   TEXT UNIQUE,
    linked_schemes   TEXT[] DEFAULT '{}',
    has_smartphone   BOOLEAN NOT NULL DEFAULT FALSE,
    phone_number     TEXT,
    bpl_card         BOOLEAN NOT NULL DEFAULT FALSE,
    land_acres       NUMERIC(8,2),
    gst_number       TEXT,
    monthly_limit    NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (monthly_limit >= 0),
    fraud_history    BOOLEAN NOT NULL DEFAULT FALSE,
    fraud_notes      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_state ON accounts (state);
CREATE INDEX idx_accounts_occupation ON accounts (occupation);
CREATE INDEX idx_accounts_account_type ON accounts (account_type);
CREATE INDEX idx_accounts_phone ON accounts (phone_number);
CREATE INDEX idx_accounts_aadhaar ON accounts (linked_aadhaar);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TRANSACTIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE transactions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id       TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    date             DATE NOT NULL,
    type             TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
    amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    description      TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_txn_account ON transactions (account_id);
CREATE INDEX idx_txn_date ON transactions (date DESC);
CREATE INDEX idx_txn_type ON transactions (type);
CREATE INDEX idx_txn_account_date ON transactions (account_id, date DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. INSTALLMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE installments (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id       TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    type             TEXT NOT NULL,
    amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    due_date         DATE NOT NULL,
    status           TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'overdue', 'paid')),
    frequency        TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'seasonal', 'bi-monthly', 'annual', 'one-time')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inst_account ON installments (account_id);
CREATE INDEX idx_inst_status ON installments (status);
CREATE INDEX idx_inst_due ON installments (due_date);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. LOANS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE loans (
    loan_id          TEXT PRIMARY KEY,
    account_id       TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    loan_type        TEXT NOT NULL,
    bank_name        TEXT NOT NULL,
    principal        NUMERIC(12,2) NOT NULL CHECK (principal > 0),
    outstanding      NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (outstanding >= 0),
    emi_amount       NUMERIC(12,2) NOT NULL CHECK (emi_amount >= 0),
    interest_rate    NUMERIC(5,2) NOT NULL CHECK (interest_rate >= 0),
    tenure_months    INTEGER NOT NULL CHECK (tenure_months > 0),
    remaining_emis   INTEGER NOT NULL DEFAULT 0 CHECK (remaining_emis >= 0),
    start_date       DATE NOT NULL,
    status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'defaulted')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loan_account ON loans (account_id);
CREATE INDEX idx_loan_status ON loans (status);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FIXED DEPOSITS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE fixed_deposits (
    fd_id            TEXT PRIMARY KEY,
    account_id       TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    principal        NUMERIC(12,2) NOT NULL CHECK (principal > 0),
    duration_months  INTEGER NOT NULL CHECK (duration_months > 0),
    interest_rate    NUMERIC(5,2) NOT NULL DEFAULT 6.00 CHECK (interest_rate >= 0),
    maturity_amount  NUMERIC(12,2) NOT NULL CHECK (maturity_amount >= 0),
    interest_earned  NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (interest_earned >= 0),
    start_date       DATE NOT NULL,
    maturity_date    DATE NOT NULL,
    status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matured', 'broken')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fd_maturity_after_start CHECK (maturity_date > start_date)
);

CREATE INDEX idx_fd_account ON fixed_deposits (account_id);
CREATE INDEX idx_fd_status ON fixed_deposits (status);
CREATE INDEX idx_fd_maturity ON fixed_deposits (maturity_date);


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. GOVERNMENT SCHEMES (10 from SCHEMES_DB in mock_bank.py)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE government_schemes (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                  TEXT UNIQUE NOT NULL,
    description_hindi     TEXT,
    description_kannada   TEXT,
    eligibility_criteria  JSONB NOT NULL DEFAULT '{}',
    benefit_amount        TEXT,
    frequency             TEXT,
    how_to_apply          TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_govscheme_name ON government_schemes (name);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SCHEMES DATABASE (50+ from schemes_database.json)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE schemes_database (
    id                    TEXT PRIMARY KEY,
    name                  TEXT NOT NULL,
    ministry              TEXT,
    description           TEXT,
    benefits              TEXT,
    eligibility           JSONB NOT NULL DEFAULT '{}',
    documents_required    TEXT[] DEFAULT '{}',
    tags                  TEXT[] DEFAULT '{}',
    source_url            TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_schemes_name ON schemes_database (name);
CREATE INDEX idx_schemes_ministry ON schemes_database (ministry);
CREATE INDEX idx_schemes_tags ON schemes_database USING GIN (tags);
CREATE INDEX idx_schemes_eligibility ON schemes_database USING GIN (eligibility);


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. FRAUD RED FLAGS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE fraud_red_flags (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phrase           TEXT NOT NULL,
    language         TEXT NOT NULL DEFAULT 'hindi' CHECK (language IN ('hindi', 'kannada', 'english', 'urdu', 'tamil')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fraud_phrase ON fraud_red_flags (phrase);
CREATE INDEX idx_fraud_lang ON fraud_red_flags (language);


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. FAMILY CONTACTS (from fraud_detection_agent.py DUMMY_USERS)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE family_contacts (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id       TEXT NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    relation         TEXT NOT NULL,
    email            TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_family_account ON family_contacts (account_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. SESSIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE sessions (
    session_id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    account_id           TEXT REFERENCES accounts(account_id) ON DELETE SET NULL,
    profile              JSONB DEFAULT '{}',
    conversation_history JSONB DEFAULT '[]',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_account ON sessions (account_id);
CREATE INDEX idx_session_created ON sessions (created_at DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. RATE LIMITS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE rate_limits (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id               TEXT NOT NULL,
    endpoint                 TEXT NOT NULL,
    request_count            INTEGER NOT NULL DEFAULT 0,
    window_start             TIMESTAMPTZ NOT NULL DEFAULT now(),
    max_requests_per_minute  INTEGER NOT NULL DEFAULT 15,
    max_requests_per_day     INTEGER NOT NULL DEFAULT 200,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, endpoint)
);

CREATE INDEX idx_ratelimit_session ON rate_limits (session_id);
CREATE INDEX idx_ratelimit_window ON rate_limits (window_start);


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. API KEY USAGE (3 Gemini API keys)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE api_key_usage (
    key_index        INTEGER PRIMARY KEY CHECK (key_index >= 0 AND key_index <= 2),
    calls_today      INTEGER NOT NULL DEFAULT 0 CHECK (calls_today >= 0),
    last_used_at     TIMESTAMPTZ,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    error_count      INTEGER NOT NULL DEFAULT 0 CHECK (error_count >= 0),
    day_reset_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 13. USER CREDITS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE user_credits (
    session_id       TEXT PRIMARY KEY,
    total_credits    INTEGER NOT NULL DEFAULT 50 CHECK (total_credits >= 0),
    used_credits     INTEGER NOT NULL DEFAULT 0 CHECK (used_credits >= 0),
    last_reset_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT credits_not_exceeded CHECK (used_credits <= total_credits)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 14. FRAUD LOGS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE fraud_logs (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id       TEXT REFERENCES accounts(account_id) ON DELETE SET NULL,
    message          TEXT,
    matched_patterns TEXT[] DEFAULT '{}',
    severity         TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    logged_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fraud_log_account ON fraud_logs (account_id);
CREATE INDEX idx_fraud_log_severity ON fraud_logs (severity);
CREATE INDEX idx_fraud_log_time ON fraud_logs (logged_at DESC);


-- =============================================================================
-- AUTO-UPDATE updated_at TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_loans_updated_at
    BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();


-- =============================================================================
-- AUTO-RESET DAILY API KEY USAGE TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION reset_daily_api_key_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- If the day has changed since last reset, reset counters
    IF NEW.last_used_at IS NOT NULL
       AND NEW.day_reset_at::DATE < NEW.last_used_at::DATE THEN
        NEW.calls_today  := 1;
        NEW.error_count  := 0;
        NEW.day_reset_at := date_trunc('day', NEW.last_used_at);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_api_key_daily_reset
    BEFORE UPDATE ON api_key_usage
    FOR EACH ROW EXECUTE FUNCTION reset_daily_api_key_usage();


-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE accounts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans             ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_deposits    ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE schemes_database  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_red_flags   ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_contacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_logs        ENABLE ROW LEVEL SECURITY;

-- Public read access for schemes (everyone can browse)
CREATE POLICY "Public read government_schemes"
    ON government_schemes FOR SELECT
    USING (true);

CREATE POLICY "Public read schemes_database"
    ON schemes_database FOR SELECT
    USING (true);

CREATE POLICY "Public read fraud_red_flags"
    ON fraud_red_flags FOR SELECT
    USING (true);

-- Service role has full access (backend operations)
CREATE POLICY "Service role full access accounts"
    ON accounts FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access transactions"
    ON transactions FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access installments"
    ON installments FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access loans"
    ON loans FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access fixed_deposits"
    ON fixed_deposits FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access government_schemes"
    ON government_schemes FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access schemes_database"
    ON schemes_database FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access fraud_red_flags"
    ON fraud_red_flags FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access family_contacts"
    ON family_contacts FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access sessions"
    ON sessions FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access rate_limits"
    ON rate_limits FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access api_key_usage"
    ON api_key_usage FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access user_credits"
    ON user_credits FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access fraud_logs"
    ON fraud_logs FOR ALL
    USING (true)
    WITH CHECK (true);


-- =============================================================================
-- DATABASE FUNCTIONS
-- =============================================================================

-- ─── transfer_funds ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION transfer_funds(
    p_from_id   TEXT,
    p_to_id     TEXT,
    p_amount    NUMERIC(12,2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sender_balance   NUMERIC(12,2);
    v_receiver_balance NUMERIC(12,2);
    v_sender_name      TEXT;
    v_receiver_name    TEXT;
    v_sender_type      TEXT;
    v_receiver_type    TEXT;
    v_txn_id           TEXT;
BEGIN
    -- Validate
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than zero.');
    END IF;

    SELECT name, balance, account_type
      INTO v_sender_name, v_sender_balance, v_sender_type
      FROM accounts WHERE account_id = p_from_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', format('Sender account %L not found.', p_from_id));
    END IF;

    IF v_sender_type = 'none' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sender does not have a bank account.');
    END IF;

    SELECT name, balance, account_type
      INTO v_receiver_name, v_receiver_balance, v_receiver_type
      FROM accounts WHERE account_id = p_to_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', format('Receiver account %L not found.', p_to_id));
    END IF;

    IF v_receiver_type = 'none' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Receiver does not have a bank account.');
    END IF;

    IF v_sender_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', format('Insufficient balance. Available: ₹%s', v_sender_balance));
    END IF;

    -- Transfer
    UPDATE accounts SET balance = balance - p_amount WHERE account_id = p_from_id;
    UPDATE accounts SET balance = balance + p_amount WHERE account_id = p_to_id;

    v_txn_id := 'TXN-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((abs(hashtext(p_from_id || p_to_id)) % 100000)::TEXT, 5, '0');

    INSERT INTO transactions (account_id, date, type, amount, description)
    VALUES (p_from_id, CURRENT_DATE, 'debit',  p_amount, format('Transfer to %s (%s)', v_receiver_name, p_to_id)),
           (p_to_id,   CURRENT_DATE, 'credit', p_amount, format('Transfer from %s (%s)', v_sender_name, p_from_id));

    RETURN jsonb_build_object(
        'success', true,
        'message', format('₹%s transferred from %s to %s.', p_amount, v_sender_name, v_receiver_name),
        'transaction_id', v_txn_id,
        'sender_new_balance', (v_sender_balance - p_amount),
        'receiver_new_balance', (v_receiver_balance + p_amount),
        'date', to_char(CURRENT_DATE, 'YYYY-MM-DD')
    );
END;
$$;


-- ─── pay_bill ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION pay_bill(
    p_account_id TEXT,
    p_bill_type  TEXT,
    p_amount     NUMERIC(12,2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance    NUMERIC(12,2);
    v_name       TEXT;
    v_acct_type  TEXT;
    v_desc       TEXT;
    v_receipt_id TEXT;
BEGIN
    IF p_bill_type NOT IN ('electricity', 'mobile_recharge', 'ration', 'insurance_premium') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid bill type. Must be one of: electricity, mobile_recharge, ration, insurance_premium');
    END IF;

    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Amount must be greater than zero.');
    END IF;

    SELECT name, balance, account_type
      INTO v_name, v_balance, v_acct_type
      FROM accounts WHERE account_id = p_account_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Account not found.');
    END IF;

    IF v_acct_type = 'none' THEN
        RETURN jsonb_build_object('success', false, 'error', 'User does not have a bank account.');
    END IF;

    IF v_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', format('Insufficient balance. Available: ₹%s', v_balance));
    END IF;

    v_desc := CASE p_bill_type
        WHEN 'electricity'       THEN 'Electricity bill payment'
        WHEN 'mobile_recharge'   THEN 'Mobile recharge'
        WHEN 'ration'            THEN 'Ration shop payment'
        WHEN 'insurance_premium' THEN 'Insurance premium payment'
    END;

    v_receipt_id := 'RCPT-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((abs(hashtext(p_account_id || p_bill_type)) % 100000)::TEXT, 5, '0');

    UPDATE accounts SET balance = balance - p_amount WHERE account_id = p_account_id;

    INSERT INTO transactions (account_id, date, type, amount, description)
    VALUES (p_account_id, CURRENT_DATE, 'debit', p_amount, v_desc);

    RETURN jsonb_build_object(
        'success', true,
        'receipt', jsonb_build_object(
            'receipt_id', v_receipt_id,
            'account_id', p_account_id,
            'name', v_name,
            'bill_type', p_bill_type,
            'amount_paid', p_amount,
            'remaining_balance', (v_balance - p_amount),
            'date', to_char(CURRENT_DATE, 'YYYY-MM-DD'),
            'status', 'PAID'
        )
    );
END;
$$;


-- ─── create_fixed_deposit ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_fixed_deposit(
    p_account_id     TEXT,
    p_amount         NUMERIC(12,2),
    p_duration_months INTEGER,
    p_interest_rate  NUMERIC(5,2) DEFAULT 6.00
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance        NUMERIC(12,2);
    v_acct_type      TEXT;
    v_interest       NUMERIC(12,2);
    v_maturity       NUMERIC(12,2);
    v_fd_id          TEXT;
    v_maturity_date  DATE;
BEGIN
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive.');
    END IF;

    IF p_duration_months <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Duration must be positive.');
    END IF;

    SELECT balance, account_type
      INTO v_balance, v_acct_type
      FROM accounts WHERE account_id = p_account_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Account not found.');
    END IF;

    IF v_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance.');
    END IF;

    -- Calculate simple interest
    v_interest     := ROUND((p_amount * p_interest_rate * (p_duration_months::NUMERIC / 12)) / 100, 2);
    v_maturity     := p_amount + v_interest;
    v_fd_id        := 'FD-' || extract(epoch from now())::BIGINT::TEXT;
    v_maturity_date := CURRENT_DATE + (p_duration_months * INTERVAL '1 month');

    -- Deduct
    UPDATE accounts SET balance = balance - p_amount WHERE account_id = p_account_id;

    -- Create FD
    INSERT INTO fixed_deposits (fd_id, account_id, principal, duration_months, interest_rate, maturity_amount, interest_earned, start_date, maturity_date, status)
    VALUES (v_fd_id, p_account_id, p_amount, p_duration_months, p_interest_rate, v_maturity, v_interest, CURRENT_DATE, v_maturity_date, 'active');

    -- Log transaction
    INSERT INTO transactions (account_id, date, type, amount, description)
    VALUES (p_account_id, CURRENT_DATE, 'debit', p_amount, format('Fixed Deposit Creation (%s months)', p_duration_months));

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Fixed deposit of ₹%s created for %s months.', p_amount, p_duration_months),
        'fd', jsonb_build_object(
            'fd_id', v_fd_id,
            'principal', p_amount,
            'duration_months', p_duration_months,
            'interest_rate', p_interest_rate,
            'maturity_amount', v_maturity,
            'interest_earned', v_interest,
            'start_date', to_char(CURRENT_DATE, 'YYYY-MM-DD'),
            'maturity_date', to_char(v_maturity_date, 'YYYY-MM-DD'),
            'status', 'active'
        )
    );
END;
$$;


-- ─── check_rate_limit ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_session_id TEXT,
    p_endpoint   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count          INTEGER;
    v_window_start   TIMESTAMPTZ;
    v_max_per_minute INTEGER;
    v_max_per_day    INTEGER;
BEGIN
    SELECT request_count, window_start, max_requests_per_minute, max_requests_per_day
      INTO v_count, v_window_start, v_max_per_minute, v_max_per_day
      FROM rate_limits
     WHERE session_id = p_session_id AND endpoint = p_endpoint;

    IF NOT FOUND THEN
        INSERT INTO rate_limits (session_id, endpoint, request_count, window_start)
        VALUES (p_session_id, p_endpoint, 1, now());
        RETURN jsonb_build_object('allowed', true, 'remaining', 14);
    END IF;

    -- Reset window if more than 1 minute has passed
    IF now() - v_window_start > INTERVAL '1 minute' THEN
        UPDATE rate_limits
           SET request_count = 1, window_start = now()
         WHERE session_id = p_session_id AND endpoint = p_endpoint;
        RETURN jsonb_build_object('allowed', true, 'remaining', v_max_per_minute - 1);
    END IF;

    IF v_count >= v_max_per_minute THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'error', 'Rate limit exceeded. Please wait a moment.',
            'retry_after_seconds', EXTRACT(EPOCH FROM (v_window_start + INTERVAL '1 minute' - now()))
        );
    END IF;

    UPDATE rate_limits
       SET request_count = request_count + 1
     WHERE session_id = p_session_id AND endpoint = p_endpoint;

    RETURN jsonb_build_object('allowed', true, 'remaining', v_max_per_minute - v_count - 1);
END;
$$;


-- ─── increment_credit_usage ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_credit_usage(
    p_session_id TEXT,
    p_amount     INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total  INTEGER;
    v_used   INTEGER;
BEGIN
    SELECT total_credits, used_credits
      INTO v_total, v_used
      FROM user_credits
     WHERE session_id = p_session_id FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO user_credits (session_id, total_credits, used_credits)
        VALUES (p_session_id, 50, p_amount);
        RETURN jsonb_build_object('success', true, 'remaining', 50 - p_amount);
    END IF;

    IF v_used + p_amount > v_total THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Credit limit exhausted.',
            'total', v_total,
            'used', v_used
        );
    END IF;

    UPDATE user_credits
       SET used_credits = used_credits + p_amount
     WHERE session_id = p_session_id;

    RETURN jsonb_build_object('success', true, 'remaining', v_total - v_used - p_amount);
END;
$$;


-- ─── rotate_api_key ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rotate_api_key()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_key_index  INTEGER;
    v_calls      INTEGER;
BEGIN
    -- Pick the active key with fewest calls today
    SELECT key_index, calls_today
      INTO v_key_index, v_calls
      FROM api_key_usage
     WHERE is_active = TRUE
     ORDER BY calls_today ASC, last_used_at ASC NULLS FIRST
     LIMIT 1
       FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active API keys available.');
    END IF;

    UPDATE api_key_usage
       SET calls_today  = calls_today + 1,
           last_used_at = now()
     WHERE key_index = v_key_index;

    RETURN jsonb_build_object(
        'success', true,
        'key_index', v_key_index,
        'calls_today', v_calls + 1
    );
END;
$$;


-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
