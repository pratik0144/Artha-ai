# Artha Mitra (DigiSeva) — Supabase Database Setup

This directory contains the complete PostgreSQL database schema and seed data for running Artha Mitra on [Supabase](https://supabase.com).

## Files

| File | Description |
|------|-------------|
| `schema.sql` | Full database schema — 14 tables, indexes, RLS policies, triggers, and 6 database functions |
| `seed.sql` | Seed data — all mock accounts, transactions, schemes, fraud patterns, and family contacts |

## Quick Start

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **New Project**, pick an organization, and enter:
   - **Project name**: `artha-ai` (or any name)
   - **Database password**: save this securely
   - **Region**: pick the closest region (e.g., `Mumbai (ap-south-1)`)
3. Click **Create new project** and wait ~2 minutes for provisioning.

### 2. Run the Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar).
2. Click **New query**.
3. Copy the entire contents of [`schema.sql`](./schema.sql) and paste into the editor.
4. Click **Run** (or press `Ctrl+Enter`).
5. Verify all tables appear under **Table Editor** in the sidebar.

### 3. Run the Seed Data

1. Open another **New query** in the SQL Editor.
2. Copy the entire contents of [`seed.sql`](./seed.sql) and paste into the editor.
3. Click **Run**.
4. Verify data by checking any table in **Table Editor** (e.g., `accounts` should have 6 rows).

### 4. Alternative: Run via CLI

If you have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed:

```bash
# Initialize (if not already done)
supabase init

# Link to your remote project
supabase link --project-ref <your-project-ref>

# Run schema
supabase db push < supabase/schema.sql

# Run seed data
supabase db push < supabase/seed.sql
```

Or using `psql` directly:

```bash
# Get your connection string from Supabase Dashboard > Settings > Database
psql "postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres" -f supabase/schema.sql
psql "postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres" -f supabase/seed.sql
```

## Required Environment Variables

Add these to your backend `.env` file:

```env
# ─── Supabase ───────────────────────────────
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# ─── Gemini API Keys (3 for rotation) ──────
GEMINI_API_KEY_0=<key-0>
GEMINI_API_KEY_1=<key-1>
GEMINI_API_KEY_2=<key-2>

# ─── SMTP (for fraud email alerts) ─────────
SMTP_EMAIL=<your-gmail>
SMTP_PASSWORD=<your-app-password>
```

### Where to Find Supabase Credentials

1. **Project URL**: Dashboard → **Settings** → **API** → `Project URL`
2. **Anon Key**: Dashboard → **Settings** → **API** → `anon` / `public` key
3. **Service Role Key**: Dashboard → **Settings** → **API** → `service_role` key (keep secret!)
4. **Database Password**: Set during project creation (or reset in **Settings** → **Database**)

## Database Schema Overview

```
accounts ─────┬──→ transactions
              ├──→ installments
              ├──→ loans
              ├──→ fixed_deposits
              ├──→ family_contacts
              ├──→ sessions ──→ rate_limits
              │               ──→ user_credits
              └──→ fraud_logs

government_schemes     (10 schemes from mock_bank.py)
schemes_database       (51 schemes from schemes_database.json)
fraud_red_flags        (20 Hindi/English fraud phrases)
api_key_usage          (3 Gemini API key trackers)
```

## Database Functions

These are PostgreSQL functions callable via `supabase.rpc()`:

| Function | Purpose |
|----------|---------|
| `transfer_funds(from_id, to_id, amount)` | Atomic fund transfer with balance checks |
| `pay_bill(account_id, bill_type, amount)` | Bill payment with receipt generation |
| `create_fixed_deposit(account_id, amount, duration_months)` | Create FD and deduct from balance |
| `check_rate_limit(session_id, endpoint)` | Per-session rate limiting (15/min, 200/day) |
| `increment_credit_usage(session_id, amount)` | Track and enforce per-user credit limits |
| `rotate_api_key()` | Round-robin Gemini API key selection |

### Example: Calling from Python

```python
from supabase import create_client

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Transfer funds
result = supabase.rpc('transfer_funds', {
    'p_from_id': 'JD-1001',
    'p_to_id': 'SB-2001',
    'p_amount': 500.00
}).execute()

# Pay a bill
result = supabase.rpc('pay_bill', {
    'p_account_id': 'SB-2002',
    'p_bill_type': 'electricity',
    'p_amount': 350.00
}).execute()

# Check rate limit
result = supabase.rpc('check_rate_limit', {
    'p_session_id': 'session-abc',
    'p_endpoint': '/api/chat'
}).execute()
```

## Row Level Security (RLS)

- **Public tables** (read-only for anonymous users): `government_schemes`, `schemes_database`, `fraud_red_flags`
- **Protected tables** (service role only): All other tables
- The backend should always use the **service role key** for data operations.
- The frontend anon key can only read public scheme data.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `permission denied` errors | Ensure you're using the `service_role` key, not the `anon` key |
| `relation does not exist` | Run `schema.sql` before `seed.sql` |
| `duplicate key` errors on seed | The seed is idempotent only on first run; truncate tables first if re-seeding |
| Functions not found | Make sure the entire `schema.sql` ran without errors |

To reset and re-seed:

```sql
-- Run in SQL Editor to truncate all data
TRUNCATE accounts, transactions, installments, loans, fixed_deposits,
         government_schemes, schemes_database, fraud_red_flags,
         family_contacts, sessions, rate_limits, api_key_usage,
         user_credits, fraud_logs CASCADE;
```

Then re-run `seed.sql`.
