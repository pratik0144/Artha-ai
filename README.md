# Artha Mitra

> *Artha Mitra — envisioned as the next generation of IDBI Intech's i-Mobot: voice-first, multilingual, and proactive, extending conversational banking beyond WhatsApp to any channel, including offline USSD.*

> [!NOTE]
> This project's production system (v2.0+) runs entirely on Vercel serverless functions (`frontend/api/`) + Supabase + Google Gemini. An earlier Python/Flask prototype is preserved in `legacy/flask-backend-v1/` for reference only and is not used by the deployed app. See CHANGELOG.md for the migration history.

Artha Mitra is a multilingual, voice-first financial accessibility platform designed for rural and low-digital-literacy users in India. The system allows users to interact naturally in their native languages to perform tasks like checking bank balances, tracking transactions, discovering government schemes, and receiving fraud/scam protection.

Instead of a basic chatbot, Artha Mitra operates as an intelligent **AI Operating System**, coordinating multiple specialized AI agents to execute real financial workflows securely, paired with a beautiful, mobile-first responsive frontend built on the Stitch Design System.

---

## 🏗️ Architecture

The platform uses a **cloud-native serverless architecture** — zero local servers required.

```text
┌─────────────────────────────────────────────────────────┐
│                    Vercel (Free Tier)                    │
│  ┌──────────────────┐  ┌─────────────────────────────┐  │
│  │  React Frontend   │  │   Vercel Serverless API     │  │
│  │  (Vite + Static)  │  │   api/chat.js               │  │
│  │                   │──│   api/onboard.js             │  │
│  │  Credit Display   │  │   api/stt.js                │  │
│  │  (real-time)      │  │   api/credits.js            │  │
│  └──────────────────┘  └───────────┬─────────────────┘  │
└────────────────────────────────────┼────────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
    ┌─────────▼─────────┐  ┌────────▼────────┐  ┌─────────▼─────────┐
    │  Supabase (Free)   │  │ Google AI Studio│  │  3-Key Rotation   │
    │  PostgreSQL DB     │  │ Gemini 2.5 Flash│  │  🔑 Key 1         │
    │  13 tables + RLS   │  │ Chat + STT      │  │  🔑 Key 2         │
    │  Rate limit tables │  │ (Free tier)     │  │  🔑 Key 3         │
    └────────────────────┘  └─────────────────┘  └───────────────────┘
```

### Project Structure

```text
DigiSeva/
├── frontend/                      # Vercel Deployment Root
│   ├── api/                       # Vercel Serverless Functions
│   │   ├── _lib/                  # Shared libraries (NOT exposed as endpoints)
│   │   │   ├── supabase.js        # Supabase admin client
│   │   │   ├── gemini-pool.js     # 3-key Gemini rotation with auto-failover
│   │   │   ├── rate-limiter.js    # Per-session rate limiting (15/min, 200/day)
│   │   │   ├── language-layer.js  # Unicode script detection + fraud keywords
│   │   │   ├── intent-classifier.js # Keyword + LLM intent classification
│   │   │   └── agents/            # Specialist AI Agents
│   │   │       ├── banking.js     # Balance, transactions, loans, FDs, transfers
│   │   │       ├── schemes.js     # Scheme search + recommendation engine
│   │   │       ├── fraud.js       # Fraud detection + logging
│   │   │       ├── literacy.js    # Financial education
│   │   │       └── dispatcher.js  # Routes intent → correct agent
│   │   ├── chat.js                # POST /api/chat — Main AI conversation
│   │   ├── onboard.js             # POST /api/onboard — User session setup
│   │   ├── stt.js                 # POST /api/stt — Speech-to-Text (Gemini)
│   │   ├── credits.js             # GET /api/credits — Credit usage stats
│   │   ├── health.js              # GET /api/health — System health check
│   │   ├── reset.js               # POST /api/reset — Clear conversation
│   │   └── schemes/
│   │       ├── all.js             # GET /api/schemes/all
│   │       └── recommend.js       # POST /api/schemes/recommend
│   ├── src/                       # React Frontend
│   │   ├── api.js                 # Centralized Axios client → /api/*
│   │   ├── lib/supabase.js        # Supabase frontend client
│   │   ├── context/
│   │   │   ├── SessionContext.jsx # User session state
│   │   │   └── CreditContext.jsx  # API credit tracking (real-time)
│   │   ├── components/
│   │   │   ├── CreditDisplay.jsx  # Floating credit widget (bottom-right)
│   │   │   └── ...                # Buttons, Cards, Alert Banners
│   │   ├── pages/                 # Home, Voice, Transactions, Schemes, Education, Fraud
│   │   └── index.css              # Design System tokens + Dark Mode
│   ├── vercel.json                # API routing + SPA fallback
│   └── package.json               # Dependencies
├── supabase/                      # Database Setup
│   ├── schema.sql                 # 13 tables, RLS, functions, triggers
│   ├── seed.sql                   # Demo data (6 accounts, 50+ schemes)
│   └── README.md                  # Supabase setup guide
└── backend/                       # Legacy (local-only, pre-migration)
```

---

## 🚀 Features

### Frontend (Client Interface)
- **Material Design 3 Dark Mode:** Premium dark theme powered by CSS variables with persistent user preferences (`localStorage`) and native toggle controls.
- **Stitch Design System:** Implements the "Digital Soil" aesthetic — terracotta accents, warm surface cards, and Playfair Display typography.
- **Responsive Mobile-First UI:** Adaptive layout with bottom navigation (mobile) and persistent sidebar (desktop).
- **Voice Overlay Integration:** Fullscreen voice interaction using the `MediaRecorder` API to capture and stream speech natively.
- **Real-Time Credit Display:** Floating widget showing API credits used/remaining, active Gemini key status (3 dots), and warning glow states.
- **Dedicated Application Modules:**
  - *Home*: Dashboard with AI chat and dynamic insight snippets.
  - *Transactions*: Ledger of past debits/credits.
  - *Schemes*: Hub for browsing, filtering, and discovering 50+ government schemes with personalized AI recommendations.
  - *Education*: Financial literacy module with categorized lessons and interactive TTS reading in multiple languages.
  - *Fraud Detection*: Dashboard tracking fraud risk, AI-intercepted scam history, and community reporting form.
- **Fraud Prevention Alerts:** High-visibility alerts triggered by backend security checks.

### Backend (Agentic Infrastructure)
- **Voice-First Interaction:** Speech-to-Text via Gemini 2.5 Flash multimodal audio input, replacing local Whisper. Optimized with **client-side downsampling** (converting 48kHz stereo to 16kHz mono WAV) to reduce payload sizes by 85%+ (~120KB upload) and minimize network latency.
- **Multilingual Intelligence:** Deep support for Hindi and Kannada, with Unicode script-based language detection across 10 Indian languages.
- **3-Key Gemini API Rotation:** Three Google AI Studio API keys with round-robin rotation and automatic failover on 429 errors. Per-key usage tracking in Supabase.
- **Per-Session Rate Limiting:** 15 requests/minute + 200 requests/day per user session, enforced via Supabase with real-time credit display on the frontend.
- **Agentic Orchestration & Specialist Swarm:**
  - **Orchestrator Pipeline:** Language detect → fraud screen → intent classify → agent dispatch.
  - **Banking Agent:** Handles balances, transactions, and bills — queries Supabase directly. Handles Fixed Deposit creation verbs (make, start, setup) correctly.
  - **Schemes Agent:** Recommends government schemes using rule-based scoring engine + 50+ scheme database.
  - **FraudGuard Agent:** Zero-latency scam interception with pattern matching and event logging.
  - **Literacy Agent:** Explains financial concepts using simple rural analogies.
  - **Loans Agent (New):** Loan Specialist Agent that calculates monthly EMIs and interest rates offline, and pulls active loan details/statements.
  - **Budgeting Agent (New):** Analyst Agent that evaluates monthly income, spending, and limits to provide context-aware savings advice and categories.
  - **Profile Management (New):** Mapped offline registry tasks to execute CRUD operations (view, update specific fields, clear/delete profile) on the `sessions` JSONB database record.
  - **Offline Statements & Reminders (New):** Queries upcoming/overdue installments and active loans directly from Supabase tables to prevent LLM quota failures.
- **Voice UI Language Lock (New):** Built a segmented language selection controller (Hindi, Kannada, English) forcing input audio transcription, serverless API query processing, and output TTS voice playback to align with the chosen language.
- **Robust Intent Classification & NLP Integration:** Integrated **`compromise`** to parse spelled-out numbers/names and **`natural`** for Levenshtein-distance spelling correction. Bypasses Gemini entirely for 150+ common intents via the local registry.

---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js (v18+) & npm
- A [Supabase](https://supabase.com) account (free tier)
- 3 [Google AI Studio](https://aistudio.google.com) API keys (free tier, 3 Google accounts)

### 1. Supabase Setup
```bash
# 1. Create a Supabase project at https://supabase.com
# 2. Go to SQL Editor and run:
#    - supabase/schema.sql (creates 13 tables)
#    - supabase/seed.sql (loads demo data)
# 3. Copy your Project URL and API keys from Settings → API
```
See [supabase/README.md](supabase/README.md) for detailed instructions.

### 2. Frontend Setup
```bash
cd frontend
npm install

# Create .env.local with your credentials:
cat > .env.local << EOF
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY_1=your-google-ai-studio-key-1
GEMINI_API_KEY_2=your-google-ai-studio-key-2
GEMINI_API_KEY_3=your-google-ai-studio-key-3
EOF
```

### 3. Deploy to Vercel
```bash
cd frontend
npx vercel
# Add environment variables in Vercel dashboard → Settings → Environment Variables
```

### Running Locally (Development)
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
# API routes served by Vercel CLI at /api/*
```

> **Note:** For local development with API routes, use `npx vercel dev` instead of `npm run dev`.

---

## 📡 API Endpoints

All endpoints are served from `/api/*` via Vercel Serverless Functions.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/onboard` | Initialize a user session, fetch bank profile and eligible schemes |
| `POST` | `/api/chat` | Send a message to the AI orchestrator. Returns response + credit info |
| `POST` | `/api/stt` | Speech-to-Text via Gemini multimodal audio input |
| `POST` | `/api/reset` | Clear conversation history |
| `GET` | `/api/credits` | Get current credit usage and API key status for a session |
| `GET` | `/api/health` | System health, DB connectivity, and Gemini key status |
| `GET` | `/api/schemes/all` | Retrieve all 50+ government schemes |
| `POST` | `/api/schemes/recommend` | Personalized scheme recommendations based on user profile |

### Response Format (Chat)
Every `/api/chat` response includes credit tracking data:
```json
{
  "status": "success",
  "response": "...",
  "agent_used": "banking",
  "credits_remaining": 188,
  "credits_used": 12,
  "active_key_index": 0,
  "key_stats": [{"key_index": 0, "calls_today": 4, "active": true}, ...]
}
```

---

## 👤 Demo Accounts & Login

> **PIN / Password:** Any 4-digit PIN works (e.g. `1234`). The password field is a mock — authentication is by Account ID only.

| Account ID | Name | PIN | Balance | Language | Occupation | Phone |
|------------|------|-----|---------|----------|------------|-------|
| `JD-1001` | Ramesh Kumar | `1234` | ₹4,200 | Hindi | Farmer | 9876543210 |
| `JD-1002` | Fatima Bi | `1234` | ₹900 | Hindi/Urdu | Unemployed | 9876543214 |
| `SB-2001` | Savitha Gowda | `1234` | ₹1,800 | Kannada | Farm Labour | 9876543211 |
| `SB-2002` | Meera Devi | `1234` | ₹6,500 | Hindi/Tamil | Homemaker | 9876543212 |
| `SB-3001` | Arjun Singh | `1234` | ₹22,000 | Hindi | Shop Owner | 9876543213 |
| `NONE-0001` | Suresh Nayak | `1234` | ₹0 | Kannada | Daily Wager | 9876543215 |

**Quick Login:** The login page has one-click buttons for all test accounts. Default tester is `JD-1001` (Ramesh Kumar).


---

## 💰 Hosting Cost: $0/month

| Service | Free Tier Limits |
|---------|-----------------|
| **Vercel** | Unlimited static deploys, 100GB bandwidth |
| **Supabase** | 500MB database, 500K function invocations |
| **Google AI Studio** | 1,500 requests/day per key × 3 keys = 4,500 RPD |
