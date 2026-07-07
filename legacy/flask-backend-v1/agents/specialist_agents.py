"""
specialist_agents.py — Artha AI Specialist Agent Suite

Contains 4 specialist agents + AgentDispatcher, each handling a specific
domain of financial assistance for rural India users.

Agents:
  1. BankingAgent     — Balance, transactions, transfers, bill pay (Ministral 2.5)
  2. SchemesAgent     — Government scheme discovery & enrollment (Gemini)
  3. FraudGuardAgent  — Scam detection & user protection (Ministral 2.5)
  4. LiteracyAgent    — Financial literacy education (GLM via NVIDIA NIM)

All LLM calls go through LLMRouter.call() — NO direct SDK usage.
Banking API calls go to bank_api.py at localhost:5001.
"""

import json
import requests
from typing import Optional

from core import language_layer
from core.llm_router import LLMRouter


# =============================================================================
# AGENT 1 — BankingAgent
# =============================================================================

class BankingAgent:
    """
    Handles banking operations: balance checks, transaction history,
    money transfers, and bill payments.

    Routes through Ministral 2.5 via LLMRouter.
    Banking data fetched from bank_api.py (localhost:5001).
    """

    def __init__(self, orchestrator_context: dict):
        """
        Args:
            orchestrator_context: User context dict from orchestrator.build_context_block().
        """
        self.router = LLMRouter()
        self.context = orchestrator_context
        self.agent_name = "banking"
        self.base_url = "http://localhost:5001"

    # ---- Bank API Calls ----

    def _get_balance(self, account_id: str) -> str:
        """GET /account/{account_id}/balance — Fetch current balance."""
        try:
            resp = requests.get(
                f"{self.base_url}/account/{account_id}/balance",
                timeout=5,
            )
            resp.raise_for_status()
            return json.dumps(resp.json(), ensure_ascii=False)
        except Exception as e:
            return json.dumps({
                "error": "Balance unavailable",
                "detail": str(e),
            })

    def _get_transactions(self, account_id: str, last_n: int = 5) -> str:
        """GET /account/{account_id}/transactions?last_n={n} — Recent transactions."""
        try:
            resp = requests.get(
                f"{self.base_url}/account/{account_id}/transactions",
                params={"last_n": last_n},
                timeout=5,
            )
            resp.raise_for_status()
            return json.dumps(resp.json(), ensure_ascii=False)
        except Exception as e:
            return json.dumps({
                "error": "Transactions unavailable",
                "detail": str(e),
            })

    def _transfer(self, from_id: str, to_id: str, amount: float) -> str:
        """POST /transfer — Transfer money between accounts."""
        try:
            resp = requests.post(
                f"{self.base_url}/transfer",
                json={"from_id": from_id, "to_id": to_id, "amount": amount},
                timeout=5,
            )
            resp.raise_for_status()
            return json.dumps(resp.json(), ensure_ascii=False)
        except Exception as e:
            return json.dumps({
                "error": "Transfer failed",
                "detail": str(e),
            })

    def _pay_bill(self, account_id: str, bill_type: str, amount: float) -> str:
        """POST /bill/pay — Pay a utility bill."""
        try:
            resp = requests.post(
                f"{self.base_url}/bill/pay",
                json={
                    "account_id": account_id,
                    "bill_type": bill_type,
                    "amount": amount,
                },
                timeout=5,
            )
            resp.raise_for_status()
            return json.dumps(resp.json(), ensure_ascii=False)
        except Exception as e:
            return json.dumps({
                "error": "Bill payment failed",
                "detail": str(e),
            })

    def _get_installments(self, account_id: str) -> str:
        """GET /account/{account_id}/installments — Fetch upcoming installments."""
        try:
            resp = requests.get(
                f"{self.base_url}/account/{account_id}/installments",
                timeout=5,
            )
            resp.raise_for_status()
            return json.dumps(resp.json(), ensure_ascii=False)
        except Exception as e:
            return json.dumps({
                "error": "Failed to fetch installments",
                "detail": str(e),
            })

    def _get_loans(self, account_id: str) -> str:
        """GET /account/{account_id}/loans — Fetch loan details."""
        try:
            resp = requests.get(
                f"{self.base_url}/account/{account_id}/loans",
                timeout=5,
            )
            resp.raise_for_status()
            return json.dumps(resp.json(), ensure_ascii=False)
        except Exception as e:
            return json.dumps({
                "error": "Failed to fetch loans",
                "detail": str(e),
            })

    def _get_spending(self, account_id: str) -> str:
        """GET /account/{account_id}/spending — Fetch spending summary."""
        try:
            resp = requests.get(
                f"{self.base_url}/account/{account_id}/spending",
                timeout=5,
            )
            resp.raise_for_status()
            return json.dumps(resp.json(), ensure_ascii=False)
        except Exception as e:
            return json.dumps({
                "error": "Failed to fetch spending data",
                "detail": str(e),
            })

    def _set_spending_limit(self, account_id: str, limit: float) -> str:
        """POST /account/{account_id}/spending/limit — Set spending limit."""
        try:
            resp = requests.post(
                f"{self.base_url}/account/{account_id}/spending/limit",
                json={"limit": limit},
                timeout=5,
            )
            resp.raise_for_status()
            return json.dumps(resp.json(), ensure_ascii=False)
        except Exception as e:
            return json.dumps({
                "error": "Failed to set spending limit",
                "detail": str(e),
            })

    def _get_fixed_deposits(self, account_id: str) -> str:
        """GET /account/{account_id}/fixed_deposits — Fetch FD details."""
        try:
            resp = requests.get(
                f"{self.base_url}/account/{account_id}/fixed_deposits",
                timeout=5,
            )
            resp.raise_for_status()
            return json.dumps(resp.json(), ensure_ascii=False)
        except Exception as e:
            return json.dumps({
                "error": "Failed to fetch fixed deposits",
                "detail": str(e),
            })

    def _create_fixed_deposit(self, account_id: str, amount: float, duration_months: int) -> str:
        """POST /account/{account_id}/fixed_deposits — Create a new FD."""
        try:
            resp = requests.post(
                f"{self.base_url}/account/{account_id}/fixed_deposits",
                json={"amount": amount, "duration_months": duration_months},
                timeout=5,
            )
            resp.raise_for_status()
            return json.dumps(resp.json(), ensure_ascii=False)
        except Exception as e:
            return json.dumps({
                "error": "Failed to create fixed deposit",
                "detail": str(e),
            })

    # ---- Action Detection ----

    def _detect_banking_action(self, text: str) -> str:
        """Detect which banking action the user wants from their message."""
        text_lower = text.lower()

        balance_keywords = [
            "balance", "bakiye", "kitna paisa", "shesh", "baaki",
            "बैलेंस", "बाकी", "शेष", "पैसा कितना",
            "ಬ್ಯಾಲೆನ್ಸ್", "ಎಷ್ಟು ಹಣ",
        ]
        transaction_keywords = [
            "transaction", "history", "statement", "passbook", "lenden",
            "len den", "विवरण", "लेनदेन", "स्टेटमेंट",
            "ವಹಿವಾಟು", "ಹಿಸ್ಟರಿ",
        ]
        transfer_keywords = [
            "transfer", "bhejo", "send", "bhejdo", "paisa do",
            "भेजो", "ट्रांसफर",
            "ಕಳಿಸಿ", "ಟ್ರಾನ್ಸ್ಫರ್",
        ]
        bill_keywords = [
            "bill", "recharge", "bijli", "electricity", "mobile",
            "DTH", "gas", "pani", "water",
            "बिल", "बिजली", "रिचार्ज",
            "ಬಿಲ್", "ರೀಚಾರ್ಜ್",
        ]
        installment_keywords = [
            "installment", "emi", "reminder", "due", "kist", "kisto",
            "payment due", "upcoming payment", "overdue",
            "किस्त", "ईएमआई", "बकाया", "याद दिलाना",
            "ಕಂತು", "ಇಎಂಐ", "ಬಾಕಿ",
        ]
        loan_keywords = [
            "loan", "karz", "rin", "udhar", "outstanding",
            "ऋण", "कर्ज", "उधार", "लोन",
            "ಸಾಲ", "ಲೋನ್",
        ]
        spending_keywords = [
            "spending", "budget", "kharcha", "limit", "spent",
            "how much spent", "kitna kharch", "monthly spending",
            "खर्चा", "बजट", "खर्च",
            "ಖರ್ಚು", "ಬಜೆಟ್",
        ]
        fd_keywords = [
            "fixed deposit", "fd", "invest", "nivesh", "jama karna",
            "फिक्स्ड डिपॉजिट", "एफडी", "निवेश", "जमा",
            "ಫಿಕ್ಸೆಡ್ ಡೆಪಾಸಿಟ್", "ಎಫ್‌ಡಿ", "ಹೂಡಿಕೆ",
        ]

        for kw in transfer_keywords:
            if kw in text_lower:
                return "transfer"
        for kw in fd_keywords:
            if kw in text_lower:
                return "fixed_deposits"
        for kw in installment_keywords:
            if kw in text_lower:
                return "installments"
        for kw in loan_keywords:
            if kw in text_lower:
                return "loans"
        for kw in spending_keywords:
            if kw in text_lower:
                return "spending"
        for kw in bill_keywords:
            if kw in text_lower:
                return "bill"
        for kw in transaction_keywords:
            if kw in text_lower:
                return "transactions"
        for kw in balance_keywords:
            if kw in text_lower:
                return "balance"

        # Default for banking intent
        return "balance"

    # ---- Main Run ----

    def run(self, user_message: str, conversation_history: list) -> dict:
        """
        Process a banking request end-to-end.

        Steps:
          1. Detect banking sub-action (balance/transactions/transfer/bill)
          2. Call the relevant bank API
          3. Build system prompt with fetched data
          4. Generate natural language response via LLMRouter
        """
        account_id = self.context.get("account_id", "UNKNOWN")
        action = self._detect_banking_action(user_message)
        tool_called = action

        import re

        # Fetch data from bank API
        if action == "balance":
            tool_result = self._get_balance(account_id)
        elif action == "transactions":
            tool_result = self._get_transactions(account_id)
        elif action == "transfer":
            amount_match = re.search(r"(\d+)", user_message)
            amount = float(amount_match.group(1)) if amount_match else None
            
            text_lower = user_message.lower()
            to_id = None
            if "arjun" in text_lower: to_id = "SB-3001"
            elif "ramesh" in text_lower: to_id = "JD-1001"
            elif "savitha" in text_lower: to_id = "SB-2001"
            elif "meera" in text_lower: to_id = "SB-2002"
            elif "fatima" in text_lower: to_id = "JD-1002"
            
            if amount and to_id:
                tool_result = self._transfer(account_id, to_id, amount)
            else:
                tool_result = json.dumps({
                    "status": "awaiting_details",
                    "message": "Need recipient account name and amount to proceed",
                })
        elif action == "bill":
            amount_match = re.search(r"(\d+)", user_message)
            amount = float(amount_match.group(1)) if amount_match else None
            
            text_lower = user_message.lower()
            bill_type = None
            if any(k in text_lower for k in ["electricity", "bijli", "vidyut"]): bill_type = "electricity"
            elif any(k in text_lower for k in ["mobile", "recharge"]): bill_type = "mobile_recharge"
            elif "ration" in text_lower: bill_type = "ration"
            elif any(k in text_lower for k in ["insurance", "bima", "vima"]): bill_type = "insurance_premium"
            
            if amount and bill_type:
                tool_result = self._pay_bill(account_id, bill_type, amount)
            else:
                tool_result = json.dumps({
                    "status": "awaiting_details",
                    "message": "Need bill type (electricity, mobile, ration, insurance) and amount to proceed",
                })
        elif action == "installments":
            tool_result = self._get_installments(account_id)
        elif action == "loans":
            tool_result = self._get_loans(account_id)
        elif action == "spending":
            # Check if user wants to set a limit
            import re as re2
            set_match = re2.search(r"(?:set|limit|budget)\D*(\d+)", user_message.lower())
            if set_match:
                limit_val = float(set_match.group(1))
                tool_result = self._set_spending_limit(account_id, limit_val)
            else:
                tool_result = self._get_spending(account_id)
        elif action == "fixed_deposits":
            import re as re3
            # Try to extract amount and duration
            amount_match = re3.search(r"(\d+)", user_message)
            # Try to find months/years
            duration_match = re3.search(r"(\d+)\s*(month|mahina|mahine|year|saal|varsha)", user_message.lower())
            
            # If user asks to create FD
            if any(k in user_message.lower() for k in ["add", "invest", "create", "banao", "madu", "jama"]):
                if amount_match and duration_match:
                    amount = float(amount_match.group(1))
                    duration_val = int(duration_match.group(1))
                    duration_unit = duration_match.group(2)
                    
                    # Convert years to months if needed
                    duration_months = duration_val * 12 if duration_unit in ["year", "saal", "varsha"] else duration_val
                    
                    tool_result = self._create_fixed_deposit(account_id, amount, duration_months)
                else:
                    tool_result = json.dumps({
                        "status": "awaiting_details",
                        "message": "Need amount and duration (months/years) to create FD",
                    })
            else:
                tool_result = self._get_fixed_deposits(account_id)
        else:
            tool_result = self._get_balance(account_id)

        # Build language-aware system prompt
        lang = self.context.get("language", "hi")
        lang_instruction = language_layer.get_system_prompt_language_instruction(lang)
        name = self.context.get("name", "User")

        system_prompt = f"""You are a banking assistant for rural India.
{lang_instruction}
User: {name}, Account: {self.context.get('account_id','?')}
BANK DATA: {tool_result}
Rules: Use ONLY numbers from BANK DATA. Max 2 sentences. Simple words. End with: Never share your OTP or PIN."""

        # Generate response via LLMRouter
        messages = conversation_history + [{"role": "user", "content": user_message}]
        result = self.router.call(
            self.agent_name,
            system_prompt,
            messages,
            max_tokens=150,
        )

        if result["text"].startswith("[LLMRouter]"):
            if lang == "kn":
                result["text"] = "ಕ್ಷಮಿಸಿ, ನಾನು ಈಗ ಬ್ಯಾಂಕಿಂಗ್ ಮಾಹಿತಿಯನ್ನು ತರಲು ಸಾಧ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಬ್ಯಾಂಕ್ ಶಾಖೆಯನ್ನು ಸಂಪರ್ಕಿಸಿ."
            else:
                result["text"] = "माफ़ करें, मैं अभी बैंकिंग की जानकारी नहीं ला पा रहा हूँ। कृपया बैंक शाखा में संपर्क करें।"

        return {
            "response": result["text"],
            "model_used": result["model_used"],
            "agent": self.agent_name,
            "tool_called": tool_called,
        }


# =============================================================================
# AGENT 2 — SchemesAgent
# =============================================================================

class SchemesAgent:
    """
    Handles government scheme discovery and enrollment.
    Uses 51 schemes from local database + SchemeRecommender for personalized results.
    """

    def __init__(self, orchestrator_context: dict):
        self.router = LLMRouter()
        self.context = orchestrator_context
        self.agent_name = "schemes"
        self.base_url = "http://localhost:5001"
        # Load schemes database and recommender
        from agents.schemes_scraper_and_recommender import ALL_SCHEMES, SchemeRecommender
        self.all_schemes = ALL_SCHEMES
        self.recommender = SchemeRecommender(ALL_SCHEMES)

    # ---- Scheme API Calls ----

    def _get_eligible_schemes(self, account_id: str) -> str:
        """GET /account/{account_id}/eligible_schemes — Fetch eligible schemes."""
        try:
            resp = requests.get(
                f"{self.base_url}/account/{account_id}/eligible_schemes",
                timeout=5,
            )
            resp.raise_for_status()
            return json.dumps(resp.json(), ensure_ascii=False)
        except Exception as e:
            # Fallback: return schemes from user profile if API is down
            fallback_schemes = self.context.get("eligible_schemes", [])
            return json.dumps({
                "schemes": fallback_schemes,
                "source": "profile_fallback",
                "note": f"Live API unavailable: {e}",
            }, ensure_ascii=False)

    def _enroll_scheme(self, account_id: str, scheme_name: str) -> str:
        """POST /scheme/enroll — Enroll user in a government scheme."""
        try:
            resp = requests.post(
                f"{self.base_url}/scheme/enroll",
                json={"account_id": account_id, "scheme_name": scheme_name},
                timeout=5,
            )
            resp.raise_for_status()
            return json.dumps(resp.json(), ensure_ascii=False)
        except Exception as e:
            return json.dumps({
                "status": "enrollment_pending",
                "scheme": scheme_name,
                "detail": str(e),
            })

    # ---- Enrollment Detection ----

    def _wants_enrollment(self, text: str) -> bool:
        """Check if the user wants to enroll in a scheme."""
        enroll_keywords = [
            "enroll", "register", "apply", "chahiye", "karna hai",
            "sign up", "join", "lagao",
            "नामांकन", "रजिस्टर", "लगाओ", "चाहिए", "करना है",
            "ನೋಂದಣಿ", "ಅಪ್ಲೈ", "ಮಾಡಿ", "ಬೇಕು",
        ]
        text_lower = text.lower()
        return any(kw in text_lower for kw in enroll_keywords)

    def _get_recommendations(self) -> str:
        """Get top 5 personalized scheme recommendations for the user."""
        profile = {
            "account_id": self.context.get("account_id", ""),
            "language": self.context.get("language", "hi"),
            "occupation": self.context.get("occupation", ""),
            "income_bracket": self.context.get("income_bracket", "₹0 – ₹5,000"),
            "has_bank": "Jan Dhan account",
            "assets": "",
            "concern": self.context.get("concern", ""),
            "enrolled_schemes": self.context.get("eligible_schemes", []),
        }
        results = self.recommender.recommend(profile)
        lines = []
        for s in results[:5]:
            lines.append(f"- {s['name']}: {s['benefits']} ({s.get('why_for_you','')})")
        return "\n".join(lines) if lines else "No specific recommendations."

    def _find_scheme_info(self, text: str) -> str:
        """Search all 51 schemes for relevant matches to user's query."""
        text_lower = text.lower()
        matches = []
        for s in self.all_schemes:
            score = 0
            name_l = s["name"].lower()
            desc_l = s.get("description", "").lower()
            tags = " ".join(s.get("tags", []))
            # Check name match
            for word in text_lower.split():
                if len(word) > 2 and word in name_l:
                    score += 10
                if len(word) > 2 and word in desc_l:
                    score += 5
                if len(word) > 2 and word in tags:
                    score += 3
            if score > 0:
                matches.append((score, s))
        matches.sort(key=lambda x: x[0], reverse=True)
        if not matches:
            return ""
        lines = []
        for _, s in matches[:5]:
            docs = ", ".join(s.get("documents_required", []))
            lines.append(
                f"- {s['name']} ({s['ministry']}): {s['benefits']}. "
                f"Eligibility: {json.dumps(s.get('eligibility',{}), ensure_ascii=False)}. "
                f"Documents: {docs}. URL: {s.get('source_url','')}"
            )
        return "\n".join(lines)

    # ---- Main Run ----

    def run(self, user_message: str, conversation_history: list) -> dict:
        """
        Process a government schemes query.

        Steps:
          1. Search 51 schemes for relevant matches
          2. Get personalized recommendations
          3. Check if user wants to enroll
          4. Build prompt with real scheme data
          5. Generate response via LLMRouter
        """
        account_id = self.context.get("account_id", "UNKNOWN")

        # Search for schemes matching user's query
        search_results = self._find_scheme_info(user_message)

        # Get personalized recommendations
        recommendations = self._get_recommendations()

        # Also fetch from bank API for enrolled schemes
        schemes_data = self._get_eligible_schemes(account_id)

        # Check for enrollment intent
        enrollment_result = None
        if self._wants_enrollment(user_message):
            scheme_names = [s["name"] for s in self.all_schemes] + [s["id"] for s in self.all_schemes]
            for scheme in scheme_names:
                if scheme.lower() in user_message.lower():
                    enrollment_result = self._enroll_scheme(account_id, scheme)
                    break

        # Build language-aware system prompt
        lang = self.context.get("language", "hi")
        lang_instruction = language_layer.get_system_prompt_language_instruction(lang)

        enrollment_block = ""
        if enrollment_result:
            enrollment_block = f"\nEnrollment result: {enrollment_result}\n"

        search_block = ""
        if search_results:
            search_block = f"\nSchemes matching user query:\n{search_results}\n"

        system_prompt = f"""You are a government schemes advisor for rural India.
{lang_instruction}
User: {self.context.get('name','User')}, Occupation: {self.context.get('occupation','unknown')}
Enrolled schemes: {schemes_data}
{search_block}
Top recommendations for this user:
{recommendations}
{enrollment_block}
Rules:
- Answer from the scheme data above ONLY. Do not invent schemes.
- If user asks about a specific scheme, give: name, benefits, documents needed.
- If user asks "which schemes for me" or "kaunsi yojana", list top 3-5 recommendations.
- Max 3-4 sentences. Mention exact amounts. Use simple words.
- If asked how to apply, mention documents needed and source URL."""

        # Generate response via LLMRouter
        messages = conversation_history + [{"role": "user", "content": user_message}]
        result = self.router.call(
            self.agent_name,
            system_prompt,
            messages,
            max_tokens=200,
        )

        if result["text"].startswith("[LLMRouter]"):
            if lang == "kn":
                result["text"] = "ಕ್ಷಮಿಸಿ, ನಾನು ಈಗ ಯೋಜನೆಗಳ ಮಾಹಿತಿಯನ್ನು ತರಲು ಸಾಧ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಬ್ಯಾಂಕ್ ಶಾಖೆಯನ್ನು ಸಂಪರ್ಕಿಸಿ."
            else:
                result["text"] = "माफ़ करें, मैं अभी योजनाओं की जानकारी नहीं ला पा रहा हूँ। कृपया बैंक शाखा में संपर्क करें।"

        return {
            "response": result["text"],
            "model_used": result["model_used"],
            "agent": self.agent_name,
        }


# =============================================================================
# AGENT 3 — FraudGuardAgent
# =============================================================================

class FraudGuardAgent:
    """
    Fraud detection and user protection specialist.
    Routes through Ministral 2.5 via LLMRouter — local, never fails.
    """

    def __init__(self, orchestrator_context: dict):
        self.router = LLMRouter()
        self.context = orchestrator_context
        self.agent_name = "fraud"
        self.base_url = "http://localhost:5001"

    # ---- Fraud API Call ----

    def _check_fraud_api(self, text: str) -> dict:
        """POST /fraud/check — Check text against bank's fraud detection."""
        try:
            resp = requests.post(
                f"{self.base_url}/fraud/check",
                json={"text": text},
                timeout=5,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception:
            # Fallback to local language_layer fraud check
            lang = self.context.get("language", "hi")
            local_check = language_layer.check_fraud_language(text, lang)
            return {
                "is_suspicious": local_check["is_fraud"],
                "matched_patterns": local_check["matched"],
                "warning": local_check["warning"],
                "source": "local_fallback",
            }

    # ---- Main Run ----

    def run(self, user_message: str, conversation_history: list) -> dict:
        """
        Process a fraud/scam query.

        Steps:
          1. Always run fraud check via bank API (with local fallback)
          2. Build prompt with fraud scan results
          3. Generate protective response via LLMRouter
        """
        # Always check for fraud first
        fraud_result = self._check_fraud_api(user_message)

        # Build language-aware system prompt
        lang = self.context.get("language", "hi")
        lang_instruction = language_layer.get_system_prompt_language_instruction(lang)

        system_prompt = f"""You are a fraud protection specialist for rural India.
{lang_instruction}
Fraud scan: {json.dumps(fraud_result, ensure_ascii=False)}
Rules: If fraud detected, say SCAM clearly. Explain in 2 sentences. Tell user to hang up/block. Banks NEVER ask for OTP/PIN. Be calm and reassuring."""

        messages = conversation_history + [{"role": "user", "content": user_message}]
        result = self.router.call(
            self.agent_name,
            system_prompt,
            messages,
            max_tokens=150,
        )

        if result["text"].startswith("[LLMRouter]"):
            if lang == "kn":
                result["text"] = "⚠️ ಎಚ್ಚರಿಕೆ! ಇದು ಒಂದು ವಂಚನೆ (fraud) ಆಗಿರಬಹುದು। ಯಾರಿಗೂ OTP, PIN ಹೇಳಬೇಡಿ."
            else:
                result["text"] = "⚠️ सावधान! यह एक धोखाधड़ी (fraud) हो सकती है। कभी भी किसी को OTP, PIN न बताएं।"

        return {
            "response": result["text"],
            "model_used": result["model_used"],
            "agent": self.agent_name,
            "fraud_detected": fraud_result.get("is_suspicious", False),
        }


# =============================================================================
# AGENT 4 — LiteracyAgent
# =============================================================================

class LiteracyAgent:
    """
    Financial literacy teacher for first-time banking users.
    Routes through GLM via NVIDIA NIM (via LLMRouter).
    """

    def __init__(self, orchestrator_context: dict):
        self.router = LLMRouter()
        self.context = orchestrator_context
        self.agent_name = "literacy"

    # ---- Main Run ----

    def run(self, user_message: str, conversation_history: list) -> dict:
        """
        Process a financial literacy question.

        Steps:
          1. Build literacy-focused system prompt
          2. Generate educational response with rural analogies via LLMRouter
        """
        lang = self.context.get("language", "hi")
        lang_instruction = language_layer.get_system_prompt_language_instruction(lang)

        system_prompt = f"""You are a financial literacy teacher for rural India.
{lang_instruction}
Rules: Teach one concept. Max 3 sentences. Use simple analogies (Interest=rent for money, EMI=monthly share, Savings=money for tomorrow). End with one action user can take today."""

        messages = conversation_history + [{"role": "user", "content": user_message}]
        result = self.router.call(
            self.agent_name,
            system_prompt,
            messages,
            max_tokens=150,
        )

        if result["text"].startswith("[LLMRouter]"):
            if lang == "kn":
                result["text"] = "ಕ್ಷಮಿಸಿ, ನಾನು ಈಗ ನಿಮಗೆ ಮಾಹಿತಿಯನ್ನು ನೀಡಲು ಸಾಧ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಬ್ಯಾಂಕ್ ಶಾಖೆಯನ್ನು ಸಂಪರ್ಕಿಸಿ."
            else:
                result["text"] = "माफ़ करें, मैं अभी आपको जानकारी नहीं दे पा रहा हूँ। कृपया बैंक शाखा में संपर्क करें।"

        return {
            "response": result["text"],
            "model_used": result["model_used"],
            "agent": self.agent_name,
        }


# =============================================================================
# AGENT DISPATCHER — Routes orchestrator results to the correct agent
# =============================================================================

class AgentDispatcher:
    """
    Dispatcher that routes orchestrator results to the correct specialist agent.

    Creates fresh agent instances per request to inject the latest context.
    """

    # Map route names to agent classes
    _AGENT_MAP = {
        "banking": BankingAgent,
        "payments": BankingAgent,  # Payments route to BankingAgent
        "schemes": SchemesAgent,
        "fraud": FraudGuardAgent,
        "literacy": LiteracyAgent,
    }

    def __init__(self):
        """No agents initialized here — create fresh per request."""
        pass

    def dispatch(
        self,
        route_result: dict,
        user_message: str,
        history: list,
        orchestrator_context: str,
    ) -> dict:
        """
        Route a classified message to the correct specialist agent.

        Args:
            route_result: Dict from orchestrator.run() with "route_to" key.
            user_message: Original user message.
            history: Conversation history list.
            orchestrator_context: Context string from orchestrator.build_context_block().

        Returns:
            Agent's full response dict, or a greeting/fallback response.
        """
        route_to = route_result.get("route_to", "greeting")

        # Handle greetings directly — no specialist agent needed
        if route_to == "greeting":
            lang = route_result.get("language", "hi")
            return {
                "response": language_layer.get_greeting(lang),
                "model_used": "none",
                "agent": "greeting",
            }

        # Build context dict from the orchestrator context string
        context = self._parse_context(orchestrator_context, route_result)

        # Get the correct agent class
        agent_class = self._AGENT_MAP.get(route_to)
        if not agent_class:
            return {
                "response": language_layer.get_greeting(
                    route_result.get("language", "hi")
                ),
                "model_used": "none",
                "agent": "fallback",
                "note": f"No agent for route: {route_to}",
            }

        # Instantiate and run the agent
        agent = agent_class(context)
        return agent.run(user_message, history)

    def _parse_context(self, context_string: str, route_result: dict) -> dict:
        """
        Parse the orchestrator context string into a dict for agent consumption.

        Falls back to extracting data from route_result if parsing fails.
        """
        context = {
            "language": route_result.get("language", "hi"),
        }

        # Try to parse structured data from the context string
        lines = context_string.strip().split("\n")
        for line in lines:
            line = line.strip()
            if line.startswith("User:"):
                parts = line.replace("User:", "").strip().split(",")
                if len(parts) >= 3:
                    context["name"] = parts[0].strip()
                    context["occupation"] = parts[1].strip()
                    context["location"] = parts[2].strip().rstrip(".")
            elif line.startswith("Language:"):
                parts = line.split(".")
                for part in parts:
                    part = part.strip()
                    if part.startswith("Language:"):
                        context["language"] = part.replace("Language:", "").strip()
                    elif part.startswith("Account:"):
                        context["account_id"] = part.replace("Account:", "").strip()
            elif line.startswith("Fraud risk:"):
                parts = line.split(".")
                for part in parts:
                    part = part.strip()
                    if part.startswith("Fraud risk:"):
                        context["fraud_risk"] = part.replace("Fraud risk:", "").strip()
                    elif part.startswith("Enrolled schemes:"):
                        schemes_str = part.replace("Enrolled schemes:", "").strip()
                        context["eligible_schemes"] = [
                            s.strip() for s in schemes_str.split(",") if s.strip() and s.strip() != "None"
                        ]
            elif line.startswith("Income:"):
                context["income_bracket"] = line.replace("Income:", "").strip().rstrip(".")

        return context


# =============================================================================
# Self-test
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("  Artha AI — Specialist Agents Self-Test")
    print("=" * 60)

    ctx = {
        "language": "kn",
        "account_id": "JD-0002",
        "name": "Savitha",
        "occupation": "farmer",
        "location": "village",
        "fraud_risk": "low",
        "income_bracket": "low",
        "eligible_schemes": ["PM-KISAN", "Ujjwala"],
    }

    # --- Test SchemesAgent ---
    print("\n🏛️  Testing SchemesAgent...")
    print("─" * 40)
    agent = SchemesAgent(ctx)
    r = agent.run("Yaava scheme sigatte naage?", [])
    print(f"  Agent:    {r['agent']}")
    print(f"  Model:    {r['model_used']}")
    print(f"  Response: {r['response'][:120]}...")

    # --- Test FraudGuardAgent ---
    print("\n🛡️  Testing FraudGuardAgent...")
    print("─" * 40)
    agent = FraudGuardAgent(ctx)
    r = agent.run("Yaaru oo OTP keḷtaidaare, account close aagatte antaare", [])
    print(f"  Agent:          {r['agent']}")
    print(f"  Model:          {r['model_used']}")
    print(f"  Fraud detected: {r['fraud_detected']}")
    print(f"  Response:       {r['response'][:120]}...")

    # --- Test BankingAgent ---
    print("\n🏦 Testing BankingAgent...")
    print("─" * 40)
    ctx_hi = {**ctx, "language": "hi", "account_id": "JD-0001", "name": "Ramesh"}
    agent = BankingAgent(ctx_hi)
    r = agent.run("Mera balance kitna hai?", [])
    print(f"  Agent:       {r['agent']}")
    print(f"  Model:       {r['model_used']}")
    print(f"  Tool called: {r['tool_called']}")
    print(f"  Response:    {r['response'][:120]}...")

    # --- Test LiteracyAgent ---
    print("\n📚 Testing LiteracyAgent...")
    print("─" * 40)
    agent = LiteracyAgent(ctx_hi)
    r = agent.run("EMI kya hota hai?", [])
    print(f"  Agent:    {r['agent']}")
    print(f"  Model:    {r['model_used']}")
    print(f"  Response: {r['response'][:120]}...")

    # --- Test AgentDispatcher ---
    print("\n🔀 Testing AgentDispatcher...")
    print("─" * 40)
    dispatcher = AgentDispatcher()

    test_routes = [
        {"route_to": "greeting", "language": "kn"},
        {"route_to": "banking", "language": "hi"},
        {"route_to": "fraud", "language": "kn"},
    ]

    context_string = (
        "User: Savitha, farmer, village.\n"
        "Language: kn. Account: JD-0002.\n"
        "Fraud risk: low. Enrolled schemes: PM-KISAN, Ujjwala.\n"
        "Income: low."
    )

    for route in test_routes:
        r = dispatcher.dispatch(route, "test message", [], context_string)
        print(f"  Route: {route['route_to']:10s} → Agent: {r['agent']:10s} | Model: {r['model_used']}")

    print(f"\n{'=' * 60}")
    print(f"  All specialist agent tests complete!")
    print(f"{'=' * 60}")
