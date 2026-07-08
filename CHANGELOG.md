# Changelog

All notable changes to the Artha Mitra project will be documented in this file.

## [2.2.0] - 2026-07-08 — Profile CRUD, Offline Statements & Voice Language Switcher

### Added
- **User Profile CRUD Management:**
  - Added view, update, and delete actions directly in chat via `agent-registry.js` to manage the session's JSONB `profile` record in the database.
  - Supports field updates like occupation, location, name, and language.
- **Offline Statements & Reminders:**
  - `agent_check_loans` fetches active loan parameters from the database, formatting output values using Lakh/Crore systems.
  - `agent_check_installments` retrieves upcoming and overdue payment reminders (LPG, PM-KISAN, crop insurance, bills) directly from Supabase, bypassing Gemini quota failures.
- **Voice UI Language Lock Segmented Switcher:**
  - Added a premium segmented language picker (Hindi, Kannada, English) to the voice assistant UI.
  - Forces audio transcription hints, serverless API query processing language overrides, and TTS voice playback outputs to strictly match the selected option.

### Fixed
- **Fixed Deposit Verb Mapping:**
  - Expanded fixed deposit creation intent matching for verbs like `'make'` and `'setup'` (e.g. `"make an fd of 50000 rupees"`) inside `banking.js` and `agent-registry.js`.

## [2.1.0] - 2026-07-07 — Offline Agentic & Speech-to-Text Optimization

### Added
- **Loans Specialist Agent (`loans.js`):** A dedicated loan advisory agent. Features offline mathematical calculation of monthly EMIs, total interest, and total repayment amounts based on user principal inputs. Provides localized guides on KCC, Tractor, and PM Mudra loans.
- **Budgeting Specialist Agent (`budgeting.js`):** Analyzes the user's monthly income (credits) and expenses (debits) in the ledger, computes their remaining budget relative to their monthly limit, and gives context-aware warnings or savings recommendations.
- **Natural Language Parsing Integrations:**
  - **`compromise`:** Extracts numeric amounts, spelled-out numbers (e.g. "five thousand" -> 5000), and named entity recipients (e.g. "Arjun") to enable flexible conversational inputs.
  - **`natural`:** Leverages Levenshtein distance on banking keywords to correct transcription or typing errors (e.g., "balnce" -> "balance") before intent classification.

### Optimized
- **Client-Side Audio Downsampling (`VoiceInteraction.jsx`):** Integrates browser `OfflineAudioContext` to downsample microphone captures from standard 48kHz stereo to 16kHz mono WAV. Reduces Speech-to-Text file size by over 85% (~120KB per upload), minimizing latency and data usage.
- **Offline Registry Executions:** Handcoded zero-Gemini routes for 150+ multilingual intents, routing transfers, schemes, fixed deposits, budgets, and bill payments directly to Supabase queries/RPCs.
- **Specialist Router Integrity:** Refined regex triggers in `agent-registry.js` to ensure informational loan or budget queries bypass transactional payment intercepts and route directly to their specialist agents.

## [2.0.0] - 2026-07-07 — Cloud-Native Migration

### Architecture Overhaul
- **Migrated backend from Flask to Vercel Serverless Functions:** Replaced the 3-server local setup (Flask backend on port 5005, Mock Bank API on port 5001, Vite dev server on port 5173) with a single Vercel deployment serving both frontend and API routes.
- **Migrated database from in-memory Python dicts to Supabase PostgreSQL:** All data (accounts, transactions, loans, FDs, schemes, sessions, fraud logs) now persists in 13 Supabase tables with Row Level Security (RLS), proper indexes, and database functions.
- **Replaced local Whisper STT with Gemini 2.0 Flash:** Speech-to-Text now uses Gemini's multimodal audio input capability — no more 1.5GB model download, no `ffmpeg` dependency.
- **Replaced local Ollama LLM with Google AI Studio API:** All 4 specialist agents now use Gemini 2.0 Flash via the free Google AI Studio tier. No local GPU required.
- **Total hosting cost: $0/month** using Vercel + Supabase + Google AI Studio free tiers.

### Added
- **3-Key Gemini API Rotation (`gemini-pool.js`):** Manages 3 Google AI Studio API keys with round-robin rotation. Automatically detects 429/quota errors and switches to the next key. Tracks per-key usage in Supabase `api_key_usage` table.
- **Per-Session Rate Limiting (`rate-limiter.js`):** Strong rate limiting enforced via Supabase — 15 requests/minute and 200 requests/day per session. Session ID format validation with regex.
- **Credit Tracking System:** New `user_credits` table tracks API usage per user. Every `/api/chat` response includes `credits_remaining`, `credits_used`, and `active_key_index`.
- **CreditDisplay Component (`CreditDisplay.jsx`):** Floating bottom-right widget showing:
  - Circular progress ring for credits used/total
  - 3 API key status dots (green = active, gray = inactive, red = exhausted)
  - Expandable panel with per-key call counts
  - Warning glow (yellow) when < 10 credits, critical glow (red) when < 3 credits
  - Pulse animation on credit use
- **CreditContext (`CreditContext.jsx`):** React context that listens for `credit-update` CustomEvents dispatched by `api.js` after every API response.
- **Supabase Frontend Client (`lib/supabase.js`):** Configured with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for direct database queries.
- **Supabase Database Schema (`supabase/schema.sql`):** 13 tables including `accounts`, `transactions`, `installments`, `loans`, `fixed_deposits`, `government_schemes`, `schemes_database`, `sessions`, `rate_limits`, `api_key_usage`, `user_credits`, `fraud_logs`, `family_contacts`.
- **Seed Data (`supabase/seed.sql`):** Full demo dataset — 6 accounts, all transaction histories, loans, FDs, 50+ government schemes, fraud patterns, family contacts.
- **Vercel Configuration (`vercel.json`):** API route passthrough + SPA fallback for client-side routing.
- **Environment Variable Template (`.env.example`):** Documents all 7 required env vars for Supabase + Gemini.
- **New API Endpoints:**
  - `GET /api/credits` — Returns credit usage and per-key stats
  - `GET /api/schemes/all` — All schemes from Supabase
  - `POST /api/schemes/recommend` — Personalized recommendations

### Changed
- **`api.js` rewritten:** Base URL changed from `http://localhost:5005` to relative `/api/*` paths. All requests include `X-Session-Id` header. Every response dispatches `credit-update` CustomEvent for the CreditDisplay widget.
- **`App.jsx` updated:** Wrapped with `CreditProvider`, renders floating `<CreditDisplay />` on all pages.
- **All 4 specialist agents rewritten in JavaScript:** Banking, Schemes, Fraud, and Literacy agents ported from Python to JS, now query Supabase directly instead of calling `localhost:5001`.
- **Language Layer ported to JS:** Unicode script-range detection, fraud keyword matching, 10-language greetings — all ported from `language_layer.py`.
- **Intent Classifier ported to JS:** Full keyword maps (Hindi Devanagari + Kannada script + romanized + English) with Gemini LLM fallback.

### Removed
- **No longer required:** Python 3.10+, `ffmpeg`, OpenAI Whisper, Ollama, Flask, local GPU.
- **Deprecated:** `backend/main.py`, `backend/banking/bank_api.py`, `backend/core/voice_layer.py` — kept for reference but no longer used in production.



## [1.3.0] - 2026-05-09

### Added
- **Material Design 3 Dark Mode:** Completely overhauled the platform's visual aesthetic by migrating all hardcoded color values to a dynamic CSS variable system (`index.css`). Implemented a premium, high-contrast Material 3 dark theme featuring deep slate backgrounds and vibrant lilac accents, with toggle buttons integrated natively into the mobile header and desktop sidebar.
- **Persistent Theme Preferences:** Updated the `SessionContext.jsx` to store and persist the user's `isDarkMode` preference via `localStorage`, ensuring a seamless experience across sessions.
- **Dedicated Fraud Detection Dashboard:** Developed a new, standalone frontend module (`FraudDetection.jsx`) to centralize account security.
- **Fraud Alerts History:** Upgraded the system's state management to track a comprehensive chronological `fraudHistory` array, allowing users to review all scam attempts intercepted by the AI during their session.
- **Risk Profiling & Community Reporting:** The new dashboard visualizes the user's specific fraud risk profile and provides an interactive form to report suspicious phone numbers or messages directly.

## [1.2.0] - 2026-05-09

### Added
- **Offline Scheme Recommender Engine:** Implemented a robust rule-based recommendation system (`schemes_scraper_and_recommender.py`) that matches users to optimal government schemes based on their profile attributes (occupation, income, etc.) without relying on external APIs.
- **Comprehensive Schemes Database:** Integrated a local offline database (`schemes_database.json`) containing detailed information on over 50 government schemes, ensuring the AI can provide immediate, offline assistance.
- **Enhanced SchemesAgent:** Upgraded the AI voice assistant's `SchemesAgent` to seamlessly query the new local database, allowing it to autonomously fetch scheme details and provide personalized recommendations during conversation.
- **Full-Stack Schemes Integration:** Connected the React frontend (`Schemes.jsx`) to new dedicated backend API routes (`/schemes/all`, `/schemes/recommend`), enabling users to browse, filter, and view detailed scheme information natively within the UI.
- **Interactive Financial Literacy Module:** Overhauled the `Education.jsx` page with a rich, categorized curriculum covering Security, Savings, and Government Schemes.
- **Native Text-to-Speech (TTS) Engine:** Built a powerful client-side reading feature directly into the Financial Literacy module. It utilizes the Web Speech API to read lessons aloud in English, Hindi, and Kannada. Features include seamless audio chunking (bypassing browser limits), intelligent currency pronunciation, and an animated progress tracker.

## [1.1.0] - 2026-05-08

### Added
- **React Frontend Implementation:** Developed a robust, mobile-first client application using Vite and React.
- **Stitch Design System Integration:** Strictly implemented the "Digital Soil" aesthetic using vanilla CSS (`index.css`), bringing Terracotta accents and proper typography (Playfair Display / Source Sans 3) to the UI.
- **Comprehensive Page Architecture:**
  - `Home`: Adaptive dashboard featuring a quick chat interface, insights, and quick actions.
  - `VoiceInteraction`: A dedicated, fullscreen recording interface utilizing the `MediaRecorder` API for real-time STT and TTS streaming.
  - `Transactions`: Organized ledger for checking account balance history.
  - `Schemes`: Dynamic tracker for enrolled and recommended government schemes.
  - `Education`: Financial literacy module featuring tabbed lessons aligned with the backend `LiteracySpecialistAgent`.
- **Global Context Management:** Added `SessionContext.jsx` to centrally manage the active user profile (`JD-0001`), conversation history, scheme eligibility, and fraud alert state.
- **Centralized API Client:** Created `api.js` to handle all Axios requests to the Flask backend, including multipart form data parsing for Whisper audio uploads and blob parsing for Google TTS responses.
- **Responsive Navigation:** Implemented dynamic layout components: `Sidebar` for desktop and `BottomNav` for mobile displays.
- **Fraud Alert UI:** Designed an `AlertBanner` component that triggers universally upon the backend returning a `fraud_triggered` flag.

## [1.0.0] - 2026-05-08

### Added
- **Backend Architecture & Folder Structure:** Completely reorganized the project into `backend/` and `frontend/` directories. Separated backend into `agents`, `banking`, and `core` modules for scalability.
- **Orchestrator Agent (`orchestrator_agent.py`):** Central brain for managing user profiles, conversation history, and routing user queries to specialist agents.
- **Specialist Agents (`specialist_agents.py`):**
  - `BankingAgent`: Integrates with the mock bank API to check balances and fetch transactions.
  - `SchemesAgent`: Helps users discover and enroll in government schemes.
  - `FraudGuardAgent`: Specialized local agent to warn users of scams.
  - `LiteracyAgent`: Educational agent for explaining financial terms.
- **LLM Router (`llm_router.py`):** A unified router supporting keyword-based intent classification (offline fallback) and Gemini (API-based) LLM generation.
- **Voice Layer (`voice_layer.py`):** Added `WhisperSTT` (OpenAI Whisper turbo) for high-accuracy localized speech-to-text and `ArthaTTS` (gTTS) for text-to-speech with automatic Hindi fallbacks.
- **Language Intelligence (`language_layer.py`):** Robust unicode script detection prioritizing Hindi and Kannada. Added fraud keyword dictionaries to intercept scam attempts pre-LLM.
- **Flask API (`main.py`):** Core API server on port 5000 exposing `/onboard`, `/chat`, `/stt`, `/tts`, `/reset`, and `/health`. Added comprehensive request logging.
- **Mock Banking Simulation (`banking/mock_bank.py` & `bank_api.py`):** Integrated a localized in-memory banking simulation running on port 5001. Features realistic user profiles, transaction histories, fund transfers, and bill payments.

### Fixed
- **API Rate Limiting & Fallbacks:** Designed the architecture to gracefully handle LLM rate limits. The fraud-screening engine and intent classifier now prioritize offline keyword heuristics before calling external LLM APIs to preserve quota.
- **Module Imports:** Fixed absolute paths across the backend following the folder restructuring. Ensure `PYTHONPATH` includes the backend directory during execution.
