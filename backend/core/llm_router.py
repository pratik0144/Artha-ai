"""
llm_router.py — Artha AI LLM Router

Routes user messages to the correct specialist agent by classifying intent.
Uses a keyword-based fallback classifier with hooks for LLM-based
classification when needed.

Supports two backends (toggle via USE_OLLAMA env var or flag below):
  - Ollama (local, gemma4:e4b) — for unlimited local testing
  - Gemini API — for demo day with judges

This module is the single point of contact for all LLM interactions.
"""

import os
import re
import json
import requests as http_requests
from typing import Optional

# =============================================================================
# ⚙️  BACKEND TOGGLE — Change this ONE line on demo day
# =============================================================================
# Set to True  → use local Ollama (gemma4:e4b) — unlimited, no quota
# Set to False → use Gemini API (needs GEMINI_API_KEY in .env)
USE_OLLAMA = True
OLLAMA_MODEL = "gemma4:e4b"
OLLAMA_URL = "http://localhost:11434/api/chat"

# =============================================================================
# Intent keyword maps (multilingual — romanized + native script)
# =============================================================================

_INTENT_KEYWORDS = {
    "banking": [
        # English
        "balance", "account", "bank", "statement", "passbook", "withdraw",
        "deposit", "transfer", "savings", "current account", "fixed deposit", "fd", "invest",
        "installment", "emi", "reminder", "loan", "outstanding", "spending",
        "budget", "kharcha", "spent",
        # Hindi (romanized)
        "balance", "khata", "bank", "bachat", "jama", "nikalna", "paisa",
        "baaki", "rashi", "kist", "kisto", "karz", "udhar", "rin", "nivesh",
        # Hindi (Devanagari)
        "बैलेंस", "खाता", "बैंक", "बचत", "जमा", "निकालना", "पैसा",
        "बाकी", "राशि", "शेष", "किस्त", "ईएमआई", "कर्ज", "लोन",
        "खर्चा", "बजट", "फिक्स्ड डिपॉजिट", "एफडी", "निवेश",
        # Kannada (romanized)
        "balance", "khata", "bank", "ulitaaya",
        # Kannada (script)
        "ಬ್ಯಾಲೆನ್ಸ್", "ಖಾತೆ", "ಬ್ಯಾಂಕ್", "ಉಳಿತಾಯ", "ಹಣ",
        "ಕಂತು", "ಇಎಂಐ", "ಸಾಲ", "ಲೋನ್", "ಖರ್ಚು", "ಬಜೆಟ್",
        "ಫಿಕ್ಸೆಡ್ ಡೆಪಾಸಿಟ್", "ಎಫ್‌ಡಿ", "ಹೂಡಿಕೆ",
    ],
    "schemes": [
        # English
        "scheme", "yojana", "government", "subsidy", "pension", "eligib",
        "apply", "benefit", "ration", "card", "insurance",
        # Hindi (romanized)
        "yojana", "sarkari", "pension", "labh", "ration", "bima",
        "kisan", "awas", "mudra", "ujjwala", "jan dhan",
        # Hindi (Devanagari)
        "योजना", "सरकारी", "पेंशन", "लाभ", "राशन", "बीमा",
        "किसान", "आवास", "मुद्रा", "उज्ज्वला", "जन धन",
        # Kannada (romanized)
        "yojane", "sarkari", "pension",
        # Kannada (script)
        "ಯೋಜನೆ", "ಸರ್ಕಾರಿ", "ಪಿಂಚಣಿ", "ಲಾಭ",
        # Scheme names (universal)
        "PM-KISAN", "PMJDY", "PMSBY", "PMJJBY", "MGNREGA",
        "PM Awas", "Ujjwala", "Mudra", "Jan Dhan",
    ],
    "payments": [
        # English
        "pay", "send money", "UPI", "recharge", "bill", "electricity",
        "mobile recharge", "DTH", "EMI", "loan",
        # Hindi (romanized)
        "bhejo", "bhejdo", "payment", "recharge", "bijli", "bill",
        "UPI", "karo", "kisto",
        # Hindi (Devanagari)
        "भेजो", "भुगतान", "रिचार्ज", "बिजली", "बिल", "किस्त",
        # Kannada (romanized)
        "kalisi", "payment", "recharge",
        # Kannada (script)
        "ಕಳಿಸಿ", "ಪಾವತಿ", "ರೀಚಾರ್ಜ್", "ಬಿಲ್",
    ],
    "fraud": [
        # English
        "fraud", "scam", "cheat", "fake", "stolen", "hack", "phishing",
        "suspicious", "unauthorized",
        # Hindi (romanized)
        "dhokha", "fraud", "thug", "chori", "loot", "OTP",
        "scam", "fake", "jhooth",
        # Hindi (Devanagari)
        "धोखा", "ठग", "चोरी", "लूट", "फ्रॉड", "स्कैम",
        # Kannada (romanized)
        "vanchane", "fraud", "mosadi",
        # Kannada (script)
        "ವಂಚನೆ", "ಮೋಸ", "ಕಳ್ಳತನ",
    ],
    "literacy": [
        # English
        "what is", "how to", "explain", "teach", "learn", "meaning",
        "help me understand", "what does",
        # Hindi (romanized)
        "kya hai", "kaise", "samjhao", "batao", "sikhao", "matlab",
        # Hindi (Devanagari)
        "क्या है", "कैसे", "समझाओ", "बताओ", "सिखाओ", "मतलब",
        # Kannada (romanized)
        "enu", "hege", "helkodi", "artham",
        # Kannada (script)
        "ಏನು", "ಹೇಗೆ", "ಹೇಳ್ಕೊಡಿ", "ಅರ್ಥ",
    ],
    "greeting": [
        # English
        "hello", "hi", "hey", "good morning", "good evening",
        "thank", "thanks", "bye", "goodbye",
        # Hindi (romanized)
        "namaste", "namaskar", "dhanyavaad", "shukriya", "alvida",
        # Hindi (Devanagari)
        "नमस्ते", "नमस्कार", "धन्यवाद", "शुक्रिया", "अलविदा",
        # Kannada (romanized)
        "namaskara", "dhanyavaada", "hogi bartini",
        # Kannada (script)
        "ನಮಸ್ಕಾರ", "ಧನ್ಯವಾದ",
    ],
}

# Valid intent labels
VALID_INTENTS = list(_INTENT_KEYWORDS.keys())


class LLMRouter:
    """
    Central router for all LLM interactions in Artha AI.

    Provides:
      - Intent classification (keyword fallback + optional LLM)
      - Prompt construction helpers
      - Model routing based on task complexity

    Supports two backends:
      - Ollama (local) — for testing without API quotas
      - Gemini (cloud) — for demo day

    Usage:
        router = LLMRouter()
        intent = router.classify_intent("mera balance kitna hai")
        # → "banking"
    """

    def __init__(self, gemini_api_key: Optional[str] = None):
        """
        Initialize the LLM Router.

        Args:
            gemini_api_key: Optional Gemini API key. Only used when USE_OLLAMA=False.
        """
        self.use_ollama = USE_OLLAMA
        self.api_key = gemini_api_key or os.environ.get("GEMINI_API_KEY")
        self._gemini_model = None

        if self.use_ollama:
            print(f"[LLMRouter] Using Ollama ({OLLAMA_MODEL}) for local testing")
        else:
            # Gemini mode — for demo day
            if self.api_key:
                try:
                    import google.generativeai as genai
                    genai.configure(api_key=self.api_key)
                    self._gemini_model = genai.GenerativeModel("gemini-2.5-flash-lite")
                    print("[LLMRouter] Using Gemini API (demo mode)")
                except Exception as e:
                    print(f"[LLMRouter] Gemini init failed: {e}")
                    self._gemini_model = None

    # -------------------------------------------------------------------------
    # Ollama helper (uses /api/chat for proper system/user separation)
    # -------------------------------------------------------------------------

    def _call_ollama(self, system_prompt: str, user_message: str, max_tokens: int = 150) -> str:
        """Send a chat request to local Ollama with separate system/user messages."""
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": user_message})

            resp = http_requests.post(
                OLLAMA_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "messages": messages,
                    "stream": False,
                    "think": False,
                    "options": {
                        "num_predict": max_tokens,
                        "num_ctx": 4096,
                        "temperature": 0.3,
                    },
                },
                timeout=60,
            )
            resp.raise_for_status()
            data = resp.json()
            result = data.get("message", {}).get("content", "").strip()
            if not result:
                print(f"[LLMRouter] Ollama empty. Raw: {json.dumps(data)[:300]}")
            return result
        except Exception as e:
            print(f"[LLMRouter] Ollama error: {e}")
            return f"[LLMRouter] Ollama error: {e}"

    # -------------------------------------------------------------------------
    # Intent classification
    # -------------------------------------------------------------------------

    def classify_intent(self, user_message: str) -> str:
        """
        Classify the user's intent from their message.

        Strategy:
          1. Try keyword-based classification first (fast, offline).
          2. If ambiguous and LLM is available, use LLM classification.
          3. Default fallback → "greeting".
        """
        # Always try keyword classification first
        keyword_result = self._classify_by_keywords(user_message)

        if keyword_result["confidence"] == "high":
            return keyword_result["intent"]

        # If LLM is available and keyword confidence is low, try LLM
        if keyword_result["confidence"] == "low":
            try:
                llm_intent = self._classify_by_llm(user_message)
                if llm_intent in VALID_INTENTS:
                    return llm_intent
            except Exception:
                pass  # Fall through to keyword result

        return keyword_result["intent"]

    def _classify_by_keywords(self, text: str) -> dict:
        """Score text against keyword lists for each intent category."""
        text_lower = text.lower().strip()
        scores: dict[str, int] = {intent: 0 for intent in VALID_INTENTS}

        for intent, keywords in _INTENT_KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in text_lower:
                    scores[intent] += 1

        max_score = max(scores.values())

        if max_score == 0:
            return {"intent": "greeting", "confidence": "low", "scores": scores}

        # Check for ties
        top_intents = [k for k, v in scores.items() if v == max_score]

        if len(top_intents) == 1:
            confidence = "high" if max_score >= 2 else "medium"
            return {"intent": top_intents[0], "confidence": confidence, "scores": scores}

        # Tie-breaking priority
        priority_order = ["fraud", "banking", "schemes", "payments", "literacy", "greeting"]
        for priority in priority_order:
            if priority in top_intents:
                return {"intent": priority, "confidence": "medium", "scores": scores}

        return {"intent": top_intents[0], "confidence": "low", "scores": scores}

    def _classify_by_llm(self, text: str) -> str:
        """Use LLM to classify intent when keyword matching is ambiguous."""
        system = (
            "You are an intent classifier for an Indian rural financial assistant.\n"
            "Classify the user message into EXACTLY ONE of these categories:\n"
            "  banking, schemes, payments, fraud, literacy, greeting\n\n"
            "Rules:\n"
            "- 'banking' = balance checks, account info, statements, deposits, withdrawals\n"
            "- 'schemes' = government schemes, yojana, eligibility, applications\n"
            "- 'payments' = sending money, UPI, recharge, bills, EMI\n"
            "- 'fraud' = scam reports, suspicious activity, OTP/PIN requests\n"
            "- 'literacy' = financial education, explanations, 'what is X'\n"
            "- 'greeting' = hello, thanks, bye, general conversation\n\n"
            "Respond with ONLY the category name, nothing else."
        )

        if self.use_ollama:
            result = self._call_ollama(system, text, max_tokens=10)
        elif self._gemini_model:
            prompt = system + f"\n\nUser message: \"{text}\""
            response = self._gemini_model.generate_content(prompt)
            result = response.text.strip()
        else:
            return "greeting"

        result = result.lower().strip()

        if result in VALID_INTENTS:
            return result

        for intent in VALID_INTENTS:
            if intent in result:
                return intent

        return "greeting"

    # -------------------------------------------------------------------------
    # Response generation
    # -------------------------------------------------------------------------

    def generate_response(
        self,
        system_prompt: str,
        user_message: str,
        conversation_history: Optional[list] = None,
    ) -> str:
        """Generate a response using the configured LLM (Ollama or Gemini)."""

        if self.use_ollama:
            # Build user message with conversation history appended
            user_content = ""
            if conversation_history:
                for msg in conversation_history[-6:]:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    user_content += f"{role}: {content}\n"
            user_content += user_message
            return self._call_ollama(system_prompt, user_content, max_tokens=150)

        # Gemini path
        if not self._gemini_model:
            return "[LLMRouter] No LLM configured. Set GEMINI_API_KEY or enable Ollama."

        try:
            full_prompt = f"{system_prompt}\n\n"
            if conversation_history:
                for msg in conversation_history[-6:]:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    full_prompt += f"{role}: {content}\n"
            full_prompt += f"user: {user_message}\nassistant:"

            response = self._gemini_model.generate_content(full_prompt)
            return response.text.strip()
        except Exception as e:
            print(f"[LLMRouter ERROR] {e}")
            import traceback
            traceback.print_exc()
            return f"[LLMRouter] Error: {e}"

    # -------------------------------------------------------------------------
    # Unified call interface for specialist agents
    # -------------------------------------------------------------------------

    def call(
        self,
        agent_name: str,
        system_prompt: str,
        messages: list,
        max_tokens: int = 300,
    ) -> dict:
        """
        Unified call interface for specialist agents.

        Routes to Ollama or Gemini based on USE_OLLAMA toggle.
        """
        model_label = OLLAMA_MODEL if self.use_ollama else "gemini-2.5-flash-lite"

        # Extract the latest user message
        user_message = ""
        history = []
        if messages:
            user_message = messages[-1].get("content", "")
            history = messages[:-1]

        response_text = self.generate_response(
            system_prompt=system_prompt,
            user_message=user_message,
            conversation_history=history if history else None,
        )

        return {
            "text": response_text,
            "model_used": model_label,
            "agent": agent_name,
            "tokens": max_tokens,
        }


# =============================================================================
# Module self-test
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("  Artha AI — LLM Router Self-Test")
    print("=" * 60)

    router = LLMRouter()

    test_messages = [
        ("Mera balance kya hai", "banking"),
        ("PM-KISAN yojana ke baare mein batao", "schemes"),
        ("₹500 bhejo Suresh ko", "payments"),
        ("Kisi ne OTP maanga hai", "fraud"),
        ("UPI kya hota hai", "literacy"),
        ("Namaste", "greeting"),
        ("मेरा बैलेंस बताओ", "banking"),
        ("ನನ್ನ ಬ್ಯಾಲೆನ್ಸ್ ಎಷ್ಟು", "banking"),
        ("सरकारी योजना बताओ", "schemes"),
        ("ಯೋಜನೆ ಬಗ್ಗೆ ಹೇಳಿ", "schemes"),
    ]

    mode = "Ollama (local)" if router.use_ollama else "Gemini (API)"
    print(f"\n🧠 Backend: {mode}")
    print(f"📋 Valid intents: {VALID_INTENTS}\n")

    print("🔍 Intent Classification Tests:")
    passed = 0
    for msg, expected in test_messages:
        result = router.classify_intent(msg)
        status = "✅" if result == expected else "❌"
        if result == expected:
            passed += 1
        print(f"  {status} '{msg[:40]}' → {result} (expected: {expected})")

    print(f"\n  Results: {passed}/{len(test_messages)} passed")
    print("=" * 60)
