# Artha Mitra — Full Application Walkthrough & Capabilities

**Artha Mitra** is a next-generation AI-powered financial assistant and relationship manager customized for rural India. It is built to run entirely locally and on serverless Vercel deployments, providing multilingual support, explainable government scheme eligibility, proactive fraud screening, and smart budgeting/health grading.

---

## 🌟 Core System Highlights

- 🗣️ **Multilingual Voice Assistant**: Natural STT (Speech-to-Text) and TTS (Text-to-Speech) neural replies supporting **English**, **Hindi (हिन्दी)**, and **Kannada (ಕನ್ನಡ)**.
- 🔐 **Transaction PIN-Gate**: A secure 4-digit PIN gateway (`1234`) required before executing any financial transaction.
- 🧠 **Explainable Scheme Eligibility**: Detailed met/unmet criterion checks (Age, Land, Occupation, BPL status) explained transparently.
- 🔮 **Budget Month-End Projections**: Extrapolates current spending patterns to warn users before they exceed limits.
- 📈 **Financial Health Score (0-100)**: A holistic health grading engine based on debt burden, savings, and safety discipline.
- 🛡️ **Anomaly & Fraud Detection**: Actively scans velocity burst rates, timing, and spikes in spending to log and warn users.

---

## 🚀 Key Capabilities & Feature Walkthrough

### 1. AI Conversation & Multilingual Voice (STT & TTS)
The application leverages Gemini 2.5 Flash for conversational routing and multimodal audio transcription.

*   **Capabilities**:
    *   Round-robin key fallback rotation to prevent API quota exhaustion.
    *   Full neural speech synthesis with localized accents.
    *   Bilingual Rome-English parsing (understands romanized Hindi/Kannada like *kharcha* or *rashi*).
*   **Example Commands**:
    *   **English**: *"Show me my recent transactions"*
    *   **Hindi**: *"मेरा बैलेंस कितना है?"* or *"Mera balance batao"*
    *   **Kannada**: *"ನನ್ನ ಖಾತೆಯಲ್ಲಿ ಎಷ್ಟು ಹಣವಿದೆ?"* or *"Nanna balance eshtu"*

---

### 2. Transaction PIN-Gate Security
All financial operations, money transfers, bill payments, and deposits require explicit PIN verification.

*   **How it works**:
    1.  The user asks to pay a bill or transfer money.
    2.  The AI asks for the 4-digit Transaction PIN.
    3.  If the user provides `1234`, the transaction is processed. Any other PIN is rejected.
*   **Example Conversation**:
    *   *User*: *"Pay my electricity bill"*
    *   *AI*: *"To complete this payment, please enter your 4-digit transaction PIN."*
    *   *User*: *"1234"*
    *   *AI*: *"✅ PIN Verified. Your electricity bill of ₹300.00 has been paid successfully."*

---

### 3. Financial Health Score (0-100) & Grade
Visible on the sidebar layout, this module grades the user's financial habits to nudge them toward better wealth creation.

*   **Scoring Breakdown (Holistic weights)**:
    *   **EMI Burden** (25 pts) — Scored based on loan interest-to-income ratio.
    *   **Scheme Utilization** (20 pts) — Tracks unclaimed eligible government schemes.
    *   **Savings Behavior** (20 pts) — Assesses active Fixed Deposits (FDs) vs. idle checking balances.
    *   **Spending Discipline** (20 pts) — Measures month-over-month expenses.
    *   **Fraud Safety** (15 pts) — Penalty applied if active fraud alerts are logged.
*   **Grade Scale**:
    *   `85+`: A+ | `75-84`: A | `65-74`: B+ | `55-64`: B | `45-54`: C | `35-44`: D | `<35`: F
*   **Live UI Badge**: Displays a progress ring, letter grade, and a multilingual, dynamic *improvement driver* showing their biggest weakness (e.g. *"You have 4 unclaimed eligible schemes — enrolling will boost your score"*).

---

### 4. Explainable Government Scheme Eligibility
Instead of just saying "You qualify", Artha Mitra computes and details why you qualify, matching your attributes against DB requirements.

*   **Attribute Checks**:
    *   **Occupation** (Matches user occupation like *Farmer* or *Daily Wager*)
    *   **BPL Card** (Checks BPL status)
    *   **Land Ownership** (Checks land acreage)
    *   **Age & Gender** (Validates age range and gender constraints)
*   **Example Commands**:
    *   *User*: *"Am I eligible for PM-KISAN?"*
    *   *AI*: 
        ```
        PM-KISAN Samman Nidhi [🟢 ELIGIBLE]
          ✅ Occupation: farmer (required: farmer)
          ✅ Land ownership: 2.5 acres
          ✅ Age: 45 years (range: 18-80)
          
        You can enroll in this scheme. Aadhaar card and land ownership records are required to apply.
        ```
    *   *User*: *"What about Ujjwala Yojana?"*
    *   *AI*:
        ```
        PM Ujjwala Yojana [🔴 NOT ELIGIBLE]
          ✅ Occupation: Any
          ❌ BPL Card: No (BPL card is required)
          ❌ Gender: male (required: female)
        ```

---

### 5. Anomaly-Based Fraud Detection
Active background behavioral scanner that flags unusual activity based on historical baselines (last 90 days).

*   **Detection Checks**:
    *   **Amount Spike**: Debit transactions exceeding `3x` the user's historical average.
    *   **Velocity Burst**: `3+` debits occurring on the same day (when historical frequency is low).
    *   **Timing Flags**: Weekend debits for users who historically transact only on weekdays.
*   **Multilingual Warnings**:
    *   If an anomaly is detected, the AI appends a clear notice to the chat response:
        *   *"⚠️ Anomaly detected: A recent debit of ₹50,000 for 'Fixed Deposit Creation' is 7.7x your average debit of ₹6,475. This was flagged as unusual."*
*   **Fraud History Page**: Renders real-time alerts logged in the database, severity counts, and flags.

---

### 6. Budget & Month-End Projections
Proactive spending analysis that warns the user *before* they blow past their limit.

*   **Formula**:
    `projected_spend = (spend_so_far / current_day_of_month) * total_days_in_month`
*   **Features**:
    *   Calculates category-specific projections (Agriculture, Utilities, Household, Business).
    *   Replaces generic "budget is fine" messages with a warning if the projection exceeds their threshold.
*   **Example Commands**:
    *   *User*: *"show me my budget"*
    *   *AI*:
        ```
        📊 Budget Analysis (This Month):
        * Total Credits (Income): ₹0.00
        * Total Debits (Expenses): ₹2,06,400.00
        * Configured Limit: ₹3,000.00

        🔮 Month-End Spending Projection:
        * Total projected: ~₹7,99,801.00 (23 days remaining)
          - Others: ~₹6,60,688.00
          - Agriculture: ~₹1,27,875.00

        ⚠️ Warning: At this rate, your projected spending of ₹7,99,801 will exceed your limit of ₹3,000 by month end.
        ```

---

## 📂 Backend Architecture (Vercel Serverless Optimization)

To satisfy the **Hobby plan 12-function limit**, the API has been consolidated into **11 serverless functions** (without losing any features):

1.  **`api/account-products.js`**: Consolidates `/api/loans`, `/api/installments`, and `/api/fixed_deposits`.
2.  **`api/schemes.js`**: Consolidates `/api/schemes/all`, `/api/schemes/recommend`, and `/api/eligible_schemes`.
3.  **`api/fraud.js`**: Consolidates `/api/fraud-history` and `/api/fraud-report`.
4.  **`api/spending.js`**: Consolidates `/api/spending` and `/api/spending/limit`.
5.  **`api/status.js`**: Consolidates `/api/credits`, `/api/health`, and `/api/health-score`.
6.  **`api/chat.js`**: Conversation orchestration.
7.  **`api/onboard.js`**: Session initialization.
8.  **`api/reset.js`**: Resets conversation.
9.  **`api/stt.js`**: Audio transcriptions.
10. **`api/tts.js`**: Neural voice generation.
11. **`api/transactions.js`**: Recent transactions history.
