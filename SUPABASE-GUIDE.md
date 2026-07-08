# Supabase Setup Guide — Artha Mitra

> Complete step-by-step guide with screenshots description for setting up Supabase, Google AI Studio, and deploying Artha Mitra.

---

## Table of Contents

1. [Create Supabase Project](#1-create-supabase-project)
2. [Run Database Schema](#2-run-database-schema)
3. [Seed Demo Data](#3-seed-demo-data)
4. [Get API Credentials](#4-get-api-credentials)
5. [Get Google AI Studio Keys](#5-get-google-ai-studio-api-keys-3-free)
6. [Configure Environment Variables](#6-configure-environment-variables)
7. [Deploy to Vercel](#7-deploy-to-vercel)
8. [Test Your Deployment](#8-test-your-deployment)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Create Supabase Project

1. Go to **[supabase.com](https://supabase.com)** and click **Start your project**
2. Sign in with **GitHub** (recommended) or email
3. Click **New Project** in your dashboard
4. Fill in:

   | Field | Value |
   |-------|-------|
   | **Organization** | Select your org (or create one — it's free) |
   | **Project name** | `artha-ai` |
   | **Database password** | Generate a strong password → **save it somewhere safe** |
   | **Region** | `South Asia (Mumbai) — ap-south-1` (closest to India) |
   | **Pricing plan** | Free |

5. Click **Create new project**
6. Wait ~2 minutes for provisioning (you'll see a spinning loader)

> **⚠️ Important:** Save the database password! You'll need it if you ever connect via `psql`.

---

## 2. Run Database Schema

The schema creates **13 tables**, indexes, Row Level Security policies, database functions, and triggers.

1. In your Supabase dashboard sidebar, click **SQL Editor**
2. Click **+ New query**
3. Open [supabase/schema.sql](supabase/schema.sql) from this project
4. Copy the **entire file contents** (Ctrl+A → Ctrl+C)
5. Paste into the SQL editor
6. Click the green **Run** button (or `Ctrl+Enter`)
7. You should see: `Success. No rows returned` — this is expected

**Verify:** Go to **Table Editor** in the sidebar. You should see these tables:

```
✅ accounts              ✅ transactions          ✅ installments
✅ loans                 ✅ fixed_deposits        ✅ government_schemes
✅ schemes_database      ✅ sessions              ✅ rate_limits
✅ api_key_usage         ✅ user_credits          ✅ fraud_logs
✅ fraud_red_flags       ✅ family_contacts
```

---

## 3. Seed Demo Data

The seed file loads all demo accounts, transactions, government schemes, and fraud patterns.

1. In **SQL Editor**, click **+ New query** (create a fresh query tab)
2. Open [supabase/seed.sql](supabase/seed.sql) from this project
3. Copy the **entire file contents** and paste
4. Click **Run**
5. You should see: `Success. No rows returned`

**Verify:** Go to **Table Editor** → click `accounts`:

| account_id | name | language | balance |
|------------|------|----------|---------|
| JD-1001 | Ramesh Kumar | Hindi | ₹45,250 |
| SB-2001 | Savitha Gowda | Kannada | ₹18,750 |
| SB-2002 | Meera Devi | Hindi | ₹8,200 |
| SB-3001 | Raju M | Kannada | ₹3,100 |
| JD-1002 | Lakshmi Bai | Hindi | ₹62,500 |

> If you need to re-seed, first truncate all tables:
> ```sql
> TRUNCATE accounts, transactions, installments, loans, fixed_deposits,
>          government_schemes, schemes_database, fraud_red_flags,
>          family_contacts, sessions, rate_limits, api_key_usage,
>          user_credits, fraud_logs CASCADE;
> ```
> Then run `seed.sql` again.

---

## 4. Get API Credentials

You need **4 values** from Supabase. All found in one place:

1. Go to **Settings** (gear icon in sidebar) → **API**
2. Copy these values:

| What | Where in Dashboard | Env Variable |
|------|--------------------|--------------|
| **Project URL** | `Project URL` section at the top | `SUPABASE_URL` and `VITE_SUPABASE_URL` |
| **Anon Key** | `Project API keys` → `anon` `public` | `VITE_SUPABASE_ANON_KEY` |
| **Service Role Key** | `Project API keys` → `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` |

> **🔒 Security Note:**
> - The **anon key** is safe to expose in frontend code — it's restricted by RLS policies
> - The **service role key** is **SECRET** — only use in server-side code (Vercel env vars), never commit to Git

---

## 5. Get Google AI Studio API Keys (3 × Free)

You need **3 API keys** from 3 different Google accounts for rotation.

### For each of 3 Google accounts:

1. Go to **[aistudio.google.com](https://aistudio.google.com)**
2. Sign in with Google account
3. Click **Get API Key** (top-right, or left sidebar)
4. Click **Create API key**
5. Select any Google Cloud project (or let it create one)
6. Copy the key — it starts with `AIza...`

| Account | Env Variable | Free Tier |
|---------|-------------|-----------|
| Google Account 1 | `GEMINI_API_KEY_1` | 15 RPM, 1500 RPD |
| Google Account 2 | `GEMINI_API_KEY_2` | 15 RPM, 1500 RPD |
| Google Account 3 | `GEMINI_API_KEY_3` | 15 RPM, 1500 RPD |
| **Combined** | — | **45 RPM, 4500 RPD** |

> **💡 Tip:** You can use family members' Google accounts, or create new ones. Each free tier is independent.

---

## 6. Configure Environment Variables

### For Local Development

Create `frontend/.env.local`:

```env
# ─── Supabase (Frontend — VITE_ prefix required for Vite) ─────
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# ─── Supabase (Backend / Serverless Functions) ─────────────────
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# ─── Google AI Studio (3 keys for rotation) ────────────────────
GEMINI_API_KEY_1=your-first-gemini-key
GEMINI_API_KEY_2=your-second-gemini-key
GEMINI_API_KEY_3=your-third-gemini-key
```

### For Vercel Deployment

Add these in **Vercel Dashboard → Project → Settings → Environment Variables**:

| Key | Value | Environment |
|-----|-------|-------------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbG...` | Production, Preview, Development |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | Production, Preview, Development |
| `GEMINI_API_KEY_1` | `your-key-1` | Production, Preview, Development |
| `GEMINI_API_KEY_2` | `your-key-2` | Production, Preview, Development |
| `GEMINI_API_KEY_3` | `your-key-3` | Production, Preview, Development |

> **⚠️ Make sure to select all 3 environments** (Production, Preview, Development) for each variable.

---

## 7. Deploy to Vercel

### Option A: Vercel CLI (Recommended)

```bash
# 1. Install Vercel CLI (if not installed)
npm i -g vercel

# 2. Navigate to frontend
cd frontend

# 3. Deploy
vercel

# Follow prompts:
#   ? Set up and deploy? → Y
#   ? Which scope? → Select your account
#   ? Link to existing project? → N
#   ? What's your project name? → artha-ai
#   ? In which directory is your code? → ./
#   ? Override settings? → N

# 4. Deploy to production
vercel --prod
```

### Option B: GitHub Integration

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository
4. Set **Root Directory** to `frontend`
5. Vercel auto-detects Vite — no build config needed
6. Add environment variables before deploying
7. Click **Deploy**

### Option C: Local Development with API Routes

```bash
cd frontend

# This runs both the Vite dev server AND the API routes locally
npx vercel dev

# Opens at http://localhost:3000
# API routes available at http://localhost:3000/api/*
```

---

## 8. Test Your Deployment

### Quick Health Check

```bash
# Replace with your Vercel URL
curl https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "up",
  "gemini": {
    "total_keys": 3,
    "active_key": 0,
    "key_stats": [...]
  },
  "stt_engine": "Gemini 2.5 Flash (multimodal)",
  "version": "2.0-supabase"
}
```

### Test Onboarding

```bash
curl -X POST https://your-app.vercel.app/api/onboard \
  -H "Content-Type: application/json" \
  -d '{"account_id": "JD-1001", "language": "hi"}'
```

### Test Chat

```bash
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"account_id": "JD-1001", "message": "mera balance kya hai"}'
```

### Full UI Test

1. Open your Vercel URL in browser
2. On the onboarding screen, enter Account ID: `JD-1001`
3. Start chatting — try: "mera balance kya hai", "koi scheme batao", "OTP batao"
4. Check the **Credit Display widget** (bottom-right) — it should show credits being used and active key

---

## 9. Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `Missing SUPABASE_URL` error | Env vars not set | Add all 7 env vars in Vercel dashboard |
| `No Gemini API keys configured` | GEMINI_API_KEY_1/2/3 missing | Add at least 1 key (2 and 3 are optional) |
| `/api/chat` returns 404 | API routes not detected | Ensure `api/` folder is inside `frontend/` (same level as `package.json`) |
| `relation "accounts" does not exist` | Schema not run | Run `schema.sql` in Supabase SQL Editor |
| `No session found` | Didn't onboard first | Call `/api/onboard` before `/api/chat` |
| `Rate limit exceeded` | Hit 15/min limit | Wait 60 seconds, or use fewer requests |
| `All Gemini API keys exhausted` | All 3 keys hit 429 | Wait for rate limit reset (~1 min), or add more keys |
| Credit display shows 0/0 | Credits not initialized | Onboard creates credits — re-onboard the user |
| CORS errors in browser | Missing headers | All API routes have CORS — check Vercel deployment logs |
| Build fails on Vercel | Missing deps | Run `npm install` locally first to verify |

### Reset Everything

```sql
-- In Supabase SQL Editor: clear all data and re-seed
TRUNCATE accounts, transactions, installments, loans, fixed_deposits,
         government_schemes, schemes_database, fraud_red_flags,
         family_contacts, sessions, rate_limits, api_key_usage,
         user_credits, fraud_logs CASCADE;
-- Then re-run seed.sql
```

---

## Database Tables Reference

| Table | Rows (seeded) | Purpose |
|-------|---------------|---------|
| `accounts` | 6 | User bank accounts with profile data |
| `transactions` | ~30 | Transaction history per account |
| `installments` | ~8 | Upcoming EMIs and payments |
| `loans` | ~4 | Active loans per account |
| `fixed_deposits` | ~3 | Fixed deposit records |
| `government_schemes` | 10 | Core schemes from mock_bank.py |
| `schemes_database` | 51 | Extended schemes from JSON database |
| `fraud_red_flags` | 20 | Hindi/Kannada fraud keyword patterns |
| `family_contacts` | ~6 | Emergency family contacts per account |
| `sessions` | 0 | Created on onboard (per user session) |
| `rate_limits` | 0 | Grows as requests are made |
| `api_key_usage` | 0 | Tracks per-key daily usage |
| `user_credits` | 0 | Per-user credit tracking |
| `fraud_logs` | 0 | Fraud events logged by FraudGuard agent |

---

## Architecture Quick Reference

```
User Browser
    │
    ├── Static React App (Vercel CDN)
    │       └── CreditDisplay widget (reads from CreditContext)
    │
    ├── /api/chat ────────┐
    ├── /api/onboard ─────┤  Vercel Serverless Functions
    ├── /api/stt ──────────┤  (Node.js 18, ESM)
    ├── /api/credits ─────┤
    └── /api/health ──────┘
                │
                ├── Supabase PostgreSQL (13 tables + RLS)
                │       ├── rate_limits (per-session enforcement)
                │       ├── user_credits (frontend display)
                │       └── api_key_usage (rotation tracking)
                │
                └── Google AI Studio (Gemini 2.5 Flash)
                        ├── 🔑 Key 1 (round-robin)
                        ├── 🔑 Key 2 (auto-failover on 429)
                        └── 🔑 Key 3 (fallback)
```
