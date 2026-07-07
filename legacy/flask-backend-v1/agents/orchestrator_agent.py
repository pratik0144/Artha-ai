"""
orchestrator_agent.py — Artha AI Central Orchestrator

The brain of Artha AI. Receives user messages, detects language, checks for
fraud, classifies intent, and routes to the correct specialist agent.

This is NOT a chatbot — it's an intelligent coordinator that:
  1. Understands the user's language (via language_layer)
  2. Screens every message for fraud/scam patterns
  3. Classifies intent (via LLMRouter — keyword + Gemini fallback)
  4. Builds rich context blocks for downstream specialist agents
  5. Maintains conversation history for multi-turn workflows

Usage:
    agent = OrchestratorAgent()
    agent.set_user_profile({...})
    result = agent.run("Mera balance kya hai")
    # → {"intent": "banking", "language": "hi", "fraud_check": {...}, ...}
"""

from core import language_layer
from core.llm_router import LLMRouter


class OrchestratorAgent:
    """
    Central orchestration agent for Artha AI.

    Coordinates language detection, fraud screening, intent classification,
    and routing — acting as the single entry point for all user interactions.
    """

    def __init__(self):
        """Initialize the orchestrator with an LLM router and empty state."""
        self.router = LLMRouter()
        self.user_profile: dict = {}
        self.conversation_history: list[dict] = []

    # -------------------------------------------------------------------------
    # User profile management
    # -------------------------------------------------------------------------

    def set_user_profile(self, profile: dict) -> None:
        """
        Store the user's onboarding profile.

        Expected keys:
            account_id       — Unique identifier (e.g., "JD-0001")
            name             — User's display name
            language         — Preferred language code (e.g., "hi", "kn")
            occupation       — e.g., "farmer", "shopkeeper", "labourer"
            income_bracket   — "low", "medium", "high"
            has_smartphone   — bool
            location         — e.g., "village", "town", "city"
            fraud_risk       — "low", "medium", "high"
            eligible_schemes — list of scheme names (e.g., ["PM-KISAN"])

        Args:
            profile: Dictionary containing user onboarding data.
        """
        self.user_profile = {
            "account_id": profile.get("account_id", "UNKNOWN"),
            "name": profile.get("name", "User"),
            "language": profile.get("language", "hi"),
            "occupation": profile.get("occupation", "unknown"),
            "income_bracket": profile.get("income_bracket", "unknown"),
            "has_smartphone": profile.get("has_smartphone", False),
            "location": profile.get("location", "unknown"),
            "fraud_risk": profile.get("fraud_risk", "medium"),
            "eligible_schemes": profile.get("eligible_schemes", []),
        }

    # -------------------------------------------------------------------------
    # Intent detection
    # -------------------------------------------------------------------------

    def detect_intent(self, user_message: str) -> str:
        """
        Classify the intent of a user message.

        Delegates to LLMRouter.classify_intent() which handles:
          - Keyword-based matching (fast, offline, multilingual)
          - Gemini LLM fallback (when ambiguous and API key is set)

        Args:
            user_message: Raw user input text.

        Returns:
            One of: "banking", "schemes", "payments", "fraud",
                    "literacy", "greeting"
        """
        return self.router.classify_intent(user_message)

    # -------------------------------------------------------------------------
    # Main orchestration loop
    # -------------------------------------------------------------------------

    def run(self, user_message: str) -> dict:
        """
        Process a user message through the full Artha AI pipeline.

        Pipeline:
          1. Detect language (script-based, via language_layer)
          2. Screen for fraud/scam patterns
          3. Classify intent (keyword + LLM fallback)
          4. Log to conversation history
          5. Return structured routing result

        Args:
            user_message: Raw user input (text from voice transcription or typing).

        Returns:
            {
                "intent": str,          — classified intent label
                "language": str,        — detected language code
                "fraud_check": dict,    — {is_fraud, matched, warning}
                "user_message": str,    — original message
                "route_to": str,        — specialist agent to handle this
            }
        """
        # Step 1: Detect language
        lang = language_layer.detect_language(user_message)

        # Step 2: Fraud screening — ALWAYS runs before anything else
        fraud_check = language_layer.check_fraud_language(user_message, lang)

        # Step 3: Classify intent
        intent = self.detect_intent(user_message)

        # Override: if fraud keywords detected, force intent to "fraud"
        if fraud_check["is_fraud"]:
            intent = "fraud"

        # Step 4: Append to conversation history
        self.conversation_history.append({
            "role": "user",
            "content": user_message,
            "language": lang,
            "intent": intent,
        })

        # Step 5: Return structured result
        return {
            "intent": intent,
            "language": lang,
            "fraud_check": fraud_check,
            "user_message": user_message,
            "route_to": intent,
        }

    # -------------------------------------------------------------------------
    # Context block builder (for specialist agents)
    # -------------------------------------------------------------------------

    def build_context_block(self) -> str:
        """
        Build a context string to inject into every specialist agent's
        system prompt. Provides user profile + session info so agents
        can personalize responses.

        Returns:
            Multi-line context string with user details.
        """
        p = self.user_profile

        if not p:
            return "User: Unknown. No profile loaded."

        schemes = ", ".join(p.get("eligible_schemes", [])) or "None"

        return (
            f"User: {p.get('name', 'Unknown')}, "
            f"{p.get('occupation', 'unknown')}, "
            f"{p.get('location', 'unknown')}.\n"
            f"Language: {p.get('language', 'hi')}. "
            f"Account: {p.get('account_id', 'UNKNOWN')}.\n"
            f"Fraud risk: {p.get('fraud_risk', 'medium')}. "
            f"Enrolled schemes: {schemes}.\n"
            f"Income: {p.get('income_bracket', 'unknown')}."
        )

    # -------------------------------------------------------------------------
    # Utility methods
    # -------------------------------------------------------------------------

    def get_greeting(self) -> str:
        """Get the appropriate greeting based on user's preferred language."""
        lang = self.user_profile.get("language", "hi")
        return language_layer.get_greeting(lang)

    def get_conversation_summary(self) -> dict:
        """Return a summary of the current conversation session."""
        return {
            "total_messages": len(self.conversation_history),
            "user_name": self.user_profile.get("name", "Unknown"),
            "language": self.user_profile.get("language", "hi"),
            "intents_seen": list(set(
                msg.get("intent", "unknown")
                for msg in self.conversation_history
            )),
            "fraud_alerts": sum(
                1 for msg in self.conversation_history
                if msg.get("intent") == "fraud"
            ),
        }

    def clear_history(self) -> None:
        """Clear conversation history (e.g., on session reset)."""
        self.conversation_history.clear()


# =============================================================================
# Self-test
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("  Artha AI — Orchestrator Agent Self-Test")
    print("=" * 60)

    agent = OrchestratorAgent()

    # Set up test user profile
    agent.set_user_profile({
        "account_id": "JD-0001",
        "name": "Ramesh",
        "language": "hi",
        "occupation": "farmer",
        "income_bracket": "low",
        "has_smartphone": False,
        "location": "village",
        "fraud_risk": "high",
        "eligible_schemes": ["PM-KISAN"],
    })

    print(f"\n👤 User Profile Loaded:")
    print(f"   Name: {agent.user_profile['name']}")
    print(f"   Account: {agent.user_profile['account_id']}")
    print(f"   Language: {agent.user_profile['language']}")
    print(f"   Location: {agent.user_profile['location']}")

    print(f"\n👋 Greeting: {agent.get_greeting()}")

    print(f"\n📋 Context Block:")
    for line in agent.build_context_block().split("\n"):
        print(f"   {line}")

    # Test messages
    test_messages = [
        "Mera balance kya hai",
        "PM-KISAN kab milega",
        "Koi bol raha hai OTP do",
    ]

    print(f"\n{'─' * 60}")
    print(f"🔄 Processing Messages:")
    print(f"{'─' * 60}")

    for msg in test_messages:
        result = agent.run(msg)
        fraud_status = "🚨 FRAUD" if result["fraud_check"]["is_fraud"] else "✅ Safe"

        print(f"\n  📩 Message: '{msg}'")
        print(f"     Intent:   {result['intent']}")
        print(f"     Language: {result['language']} ({language_layer.get_language_name(result['language'])})")
        print(f"     Fraud:    {fraud_status}")
        print(f"     Route to: {result['route_to']}")

        if result["fraud_check"]["is_fraud"]:
            print(f"     ⚠️  Matched: {result['fraud_check']['matched']}")
            print(f"     ⚠️  Warning: {result['fraud_check']['warning'][:80]}...")

    # Session summary
    print(f"\n{'─' * 60}")
    summary = agent.get_conversation_summary()
    print(f"📊 Session Summary:")
    print(f"   Total messages: {summary['total_messages']}")
    print(f"   Intents seen:   {summary['intents_seen']}")
    print(f"   Fraud alerts:   {summary['fraud_alerts']}")

    print(f"\n{'=' * 60}")
    print(f"  All tests complete!")
    print(f"{'=' * 60}")
