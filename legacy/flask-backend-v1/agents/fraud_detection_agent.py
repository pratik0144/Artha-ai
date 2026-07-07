"""
fraud_detection_agent.py — Artha AI Standalone Fraud Detection Agent

Completely standalone — imports NOTHING from other project files.
Detects fraud patterns, plays voice alerts, emails family members,
and logs all fraud events to a JSON file.

Usage:
    from agents.fraud_detection_agent import FraudDetectionAgent
    agent = FraudDetectionAgent()
    result = agent.check("OTP batao abhi", "JD-1001", "hi")
"""

import re
import io
import json
import os
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from dotenv import load_dotenv

# Load .env from project root (backend/.env)
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))


# =============================================================================
# SECTION 1 — DUMMY FAMILY DATA (aligned with mock_bank.py accounts)
# =============================================================================

DUMMY_USERS = {
    "JD-1001": {
        "name": "Ramesh Kumar",
        "language": "hi",
        "family_member_name": "Suresh Kumar",
        "family_member_relation": "Beta (Son)",
        "family_member_email": "suresh.kumar.demo@gmail.com",
    },
    "SB-2001": {
        "name": "Savitha Gowda",
        "language": "kn",
        "family_member_name": "Ravi Gowda",
        "family_member_relation": "Maga (Son)",
        "family_member_email": "ravi.gowda.demo@gmail.com",
    },
    "SB-2002": {
        "name": "Meera Devi",
        "language": "hi",
        "family_member_name": "Rajesh Devi",
        "family_member_relation": "Pati (Husband)",
        "family_member_email": "rajesh.devi.demo@gmail.com",
    },
    "SB-3001": {
        "name": "Arjun Singh",
        "language": "hi",
        "family_member_name": "Priya Singh",
        "family_member_relation": "Patni (Wife)",
        "family_member_email": "priya.singh.demo@gmail.com",
    },
    "JD-1002": {
        "name": "Fatima Bi",
        "language": "hi",
        "family_member_name": "Ayesha Bi",
        "family_member_relation": "Beti (Daughter)",
        "family_member_email": "ayesha.bi.demo@gmail.com",
    },
    "NONE-0001": {
        "name": "Suresh Nayak",
        "language": "kn",
        "family_member_name": "Venkatesh Nayak",
        "family_member_relation": "Anna (Brother)",
        "family_member_email": "venkatesh.nayak.demo@gmail.com",
    },
}


# =============================================================================
# SECTION 2 — FRAUD PATTERNS
# =============================================================================

FRAUD_PATTERNS = {
    "otp_scam": {
        "keywords": [
            "otp", "otp batao", "otp do", "otp share", "otp heli", "otp kodi",
        ],
        "severity": "high",
        "explanation_hi": "Yeh OTP scam hai. Asli bank kabhi OTP nahi maangta.",
        "explanation_kn": "Idu OTP scam. Nijavaada bank OTP keḷuvadiilla.",
        "action_hi": "Turant phone band karo. Kisi ko OTP mat do.",
        "action_kn": "Takshaṇa phone muḷugi. Yarigū OTP koḍabēḍi.",
    },
    "account_threat": {
        "keywords": [
            "account band", "account block", "account freeze",
            "account close", "account suspend", "account close aagatte",
        ],
        "severity": "high",
        "explanation_hi": "Yeh jhooth hai. Bank phone par account band nahi karta.",
        "explanation_kn": "Idu sullu. Bank phone mēle account close maāḍuvudiilla.",
        "action_hi": "Phone rakho. Seedha apni bank branch jao.",
        "action_kn": "Phone iḷi. Nēraḷavāgi bank branch ge hōgi.",
    },
    "prize_scam": {
        "keywords": [
            "prize jeeta", "lottery", "lucky winner", "inam mila",
            "crore jeeta", "prize sigide", "inaamu sigide",
        ],
        "severity": "high",
        "explanation_hi": "Yeh lottery scam hai. Koi free prize nahi deta.",
        "explanation_kn": "Idu lottery scam. Yaaru free prize koḍuvudiilla.",
        "action_hi": "Koi paisa mat bhejo. Phone band karo.",
        "action_kn": "Haṇa koḍabēḍi. Phone muḷugi.",
    },
    "kyc_scam": {
        "keywords": [
            "kyc update", "kyc karo", "kyc expire", "kyc maadi",
            "aadhar update", "pan update",
        ],
        "severity": "high",
        "explanation_hi": "Bank phone par KYC nahi karta. Yeh fraud hai.",
        "explanation_kn": "Bank phone mēle KYC maāḍuvudiilla. Idu fraud.",
        "action_hi": "Koi link mat kholna. Bank branch mein jaakar KYC karo.",
        "action_kn": "Yaavude link tiḷḷabēḍi. Bank branch ge hōgi KYC maāḍi.",
    },
    "remote_access": {
        "keywords": [
            "anydesk", "teamviewer", "screen share",
            "app install karo", "link pe click", "app install maadi",
        ],
        "severity": "high",
        "explanation_hi": "Koi app install mat karo — woh aapka paisa chura lenge.",
        "explanation_kn": "Yaavude app install maāḍabēḍi — avaru haṇa kaḷiyuttāre.",
        "action_hi": "Phone band karo. Parivaar ko turant batao.",
        "action_kn": "Phone muḷugi. Kuṭumbadarige takshaṇa hēḷi.",
    },
    "fake_official": {
        "keywords": [
            "bank manager", "rbi", "rbi se bol raha", "bank official",
            "bank se call", "bank athikari",
        ],
        "severity": "medium",
        "explanation_hi": "Bank officers phone par personal jaankari nahi maangte.",
        "explanation_kn": "Bank officers phone mēle personal māhiti keḷuvudiilla.",
        "action_hi": "Phone rakho. Khud apni bank ka number dial karo.",
        "action_kn": "Phone iḷi. Nīve nimma bank number dial maāḍi.",
    },
}


# =============================================================================
# SECTION 3 — DETECTOR
# =============================================================================

class FraudDetector:
    """Analyzes text for known fraud patterns and logs detections."""

    def analyze(self, text: str, lang: str = "hi") -> dict:
        """
        Scan text against all fraud patterns.

        Args:
            text: User's raw message.
            lang: Language code — "hi" or "kn".

        Returns:
            Dict with is_fraud, severity, categories, explanation, action, etc.
        """
        text_lower = text.lower()
        matched = []

        for category, pattern in FRAUD_PATTERNS.items():
            for keyword in pattern["keywords"]:
                if keyword in text_lower:
                    matched.append({
                        "category": category,
                        "severity": pattern["severity"],
                        "keyword_hit": keyword,
                    })
                    break  # One match per category is enough

        if not matched:
            return {"is_fraud": False}

        # Determine highest severity
        highest_severity = "high" if any(m["severity"] == "high" for m in matched) else "medium"

        # Pick language suffix
        lang_suffix = "_kn" if lang == "kn" else "_hi"

        # Get explanation and action from the first matched (highest priority) pattern
        first_pattern = FRAUD_PATTERNS[matched[0]["category"]]

        return {
            "is_fraud": True,
            "severity": highest_severity,
            "categories": [m["category"] for m in matched],
            "keywords_hit": [m["keyword_hit"] for m in matched],
            "explanation": first_pattern[f"explanation{lang_suffix}"],
            "action": first_pattern[f"action{lang_suffix}"],
            "lang": lang,
            "timestamp": datetime.now().isoformat(),
        }

    def log_to_file(self, fraud_result: dict, account_id: str) -> None:
        """Append fraud detection event to fraud_log.json."""
        log_file = os.path.join(os.path.dirname(__file__), "..", "fraud_log.json")

        # Read existing log
        existing = []
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                existing = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            existing = []

        # Append new entry (strip audio_bytes if present)
        entry = {
            "account_id": account_id,
            "user_name": DUMMY_USERS.get(account_id, {}).get("name", "Unknown"),
        }
        for k, v in fraud_result.items():
            if k != "audio_bytes":
                entry[k] = v

        existing.append(entry)

        # Write back
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)

        print(
            f"[FRAUD LOG] {fraud_result.get('timestamp', 'N/A')} | "
            f"{account_id} | {fraud_result.get('categories', [])} | "
            f"{fraud_result.get('severity', 'unknown')}"
        )


# =============================================================================
# SECTION 4 — VOICE ALERT
# =============================================================================

class FraudVoiceAlert:
    """Generates and plays voice fraud warnings using gTTS."""

    def alert(self, fraud_result: dict) -> str:
        """
        Generate and play a spoken fraud alert.

        Args:
            fraud_result: Dict from FraudDetector.analyze().

        Returns:
            Path to the saved MP3 file.
        """
        from gtts import gTTS

        lang = fraud_result.get("lang", "hi")
        explanation = fraud_result.get("explanation", "")
        action = fraud_result.get("action", "")

        if lang == "kn":
            spoken = f"Echarike! Echarike! {explanation} {action}"
        else:
            spoken = f"Khabardar! Khabardar! {explanation} {action}"

        tts = gTTS(text=spoken, lang=lang, slow=True)
        timestamp = datetime.now().strftime("%H%M%S")
        path = os.path.join(os.path.dirname(__file__), "..", f"fraud_alert_{timestamp}.mp3")
        tts.save(path)

        try:
            from playsound import playsound
            playsound(path)
        except Exception as e:
            print(f"[VOICE] Could not play audio. File saved at: {path}")

        return path

    def get_audio_bytes(self, fraud_result: dict) -> bytes:
        """
        Generate fraud alert audio as bytes (for streaming to frontend).

        Args:
            fraud_result: Dict from FraudDetector.analyze().

        Returns:
            Raw MP3 audio bytes.
        """
        from gtts import gTTS

        lang = fraud_result.get("lang", "hi")
        explanation = fraud_result.get("explanation", "")
        action = fraud_result.get("action", "")

        if lang == "kn":
            spoken = f"Echarike! Echarike! {explanation} {action}"
        else:
            spoken = f"Khabardar! Khabardar! {explanation} {action}"

        tts = gTTS(text=spoken, lang=lang, slow=True)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        return buf.read()


# =============================================================================
# SECTION 5 — EMAIL ALERT TO FAMILY
# =============================================================================

class FamilyEmailAlert:
    """Sends fraud alert emails to the user's registered family member."""

    def __init__(self):
        """Load SMTP credentials from .env."""
        self.smtp_email = os.environ.get("SMTP_EMAIL")
        self.smtp_password = os.environ.get("SMTP_PASSWORD")
        self.configured = bool(self.smtp_email and self.smtp_password)

        if not self.configured:
            print("[EMAIL] SMTP_EMAIL / SMTP_PASSWORD not in .env — email alerts disabled")

    def send(self, account_id: str, fraud_result: dict) -> bool:
        """
        Send a fraud alert email to the user's family member.

        Args:
            account_id: The bank account ID (e.g., "JD-1001").
            fraud_result: Dict from FraudDetector.analyze().

        Returns:
            True if email sent successfully, False otherwise.
        """
        if not self.configured:
            return False

        user = DUMMY_USERS.get(account_id)
        if not user:
            print(f"[EMAIL] Unknown account: {account_id}")
            return False

        family_name = user["family_member_name"]
        family_email = user["family_member_email"]
        user_name = user["name"]
        relation = user["family_member_relation"]

        subject = f"🚨 FRAUD ALERT — {user_name} is being targeted"

        body = f"""
Artha AI Fraud Alert
{'─' * 40}
User         : {user_name}
Time         : {fraud_result.get('timestamp', 'N/A')}
Fraud Type   : {', '.join(fraud_result.get('categories', []))}
Severity     : {fraud_result.get('severity', 'unknown').upper()}

What happened:
{fraud_result.get('explanation', 'N/A')}

What {user_name} should do:
{fraud_result.get('action', 'N/A')}

Dear {family_name} ({relation}),
Please call {user_name} immediately and ensure they have not shared
any OTP, PIN, or banking details with the caller.

This is an automated alert from Artha AI.
        """.strip()

        try:
            msg = MIMEMultipart()
            msg["From"] = self.smtp_email
            msg["To"] = family_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain", "utf-8"))

            server = smtplib.SMTP("smtp.gmail.com", 587)
            server.starttls()
            server.login(self.smtp_email, self.smtp_password)
            server.sendmail(self.smtp_email, family_email, msg.as_string())
            server.quit()

            print(f"[EMAIL] ✅ Alert sent to {family_name} ({family_email})")
            return True

        except Exception as e:
            print(f"[EMAIL] ❌ Failed to send: {e}")
            return False


# =============================================================================
# SECTION 6 — MAIN AGENT CLASS
# =============================================================================

class FraudDetectionAgent:
    """
    The only class external code (main.py) needs to call.
    One method — check() — does everything: detect, log, voice alert, email.
    Never crashes even if voice/email fails.
    """

    def __init__(self):
        self.detector = FraudDetector()
        self.voice = FraudVoiceAlert()
        self.email = FamilyEmailAlert()

    def check(self, text: str, account_id: str, lang: str = "hi") -> dict:
        """
        Analyze a user message for fraud. If detected, log it,
        print a warning, play a voice alert, and email the family.

        Args:
            text: User's raw message (voice transcript or typed text).
            account_id: The user's bank account ID.
            lang: Language code — "hi" (Hindi) or "kn" (Kannada).

        Returns:
            Dict with is_fraud, severity, categories, explanation, action,
            audio_bytes (or None), and message.
        """
        # Step 1 — Analyze
        result = self.detector.analyze(text, lang)

        if not result["is_fraud"]:
            return {"is_fraud": False, "message": "No fraud detected"}

        # Step 2 — Log it
        try:
            self.detector.log_to_file(result, account_id)
        except Exception as e:
            print(f"[LOG] Error writing fraud log: {e}")

        # Step 3 — Print text alert clearly
        print("\n" + "=" * 50)
        print("🚨 FRAUD DETECTED 🚨")
        print(f"Account : {account_id}")
        print(f"User    : {DUMMY_USERS.get(account_id, {}).get('name', 'Unknown')}")
        print(f"Severity: {result['severity'].upper()}")
        print(f"Type    : {', '.join(result['categories'])}")
        print(f"Alert   : {result['explanation']}")
        print(f"Action  : {result['action']}")
        print("=" * 50 + "\n")

        # Step 4 — Voice alert (non-blocking, won't crash)
        try:
            self.voice.alert(result)
        except Exception as e:
            print(f"[VOICE] Error: {e}")

        # Step 5 — Email family (non-blocking, won't crash)
        try:
            self.email.send(account_id, result)
        except Exception as e:
            print(f"[EMAIL] Error: {e}")

        # Step 6 — Attach audio bytes for frontend streaming
        result["audio_bytes"] = None
        try:
            result["audio_bytes"] = self.voice.get_audio_bytes(result)
        except Exception:
            pass

        result["message"] = result["explanation"]
        return result


# =============================================================================
# SECTION 7 — SELF-TEST
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("  Artha AI — Fraud Detection Agent Self-Test")
    print("=" * 60)

    agent = FraudDetectionAgent()

    test_cases = [
        ("JD-1001", "hi", "Sir mera account band ho jaayega, OTP batao abhi"),
        ("SB-2001", "kn", "Nimma account close aagatte, OTP heli"),
        ("JD-1001", "hi", "Mera balance kya hai"),                              # Clean
        ("SB-3001", "hi", "Aapne lottery jeeti hai, paisa lene ke liye link click karo"),
        ("SB-2001", "kn", "KYC update maadi, link click maadi"),
        ("JD-1002", "hi", "Main RBI se bol raha hoon, aapka OTP batao"),
        ("SB-2002", "hi", "AnyDesk install karo abhi"),
        ("JD-1001", "hi", "Namaste, kaise ho?"),                                 # Clean
    ]

    print()
    for account_id, lang, message in test_cases:
        print(f"{'─' * 50}")
        print(f"Testing: '{message}'")
        print(f"Account: {account_id} | Lang: {lang}")
        result = agent.check(message, account_id, lang)
        if result["is_fraud"]:
            print(f"✅ Fraud caught — {result['severity']} | {result['categories']}")
        else:
            print("✅ Clean message — no alert triggered")
        print()

    print("=" * 60)
    print("  Self-test complete!")
    print("=" * 60)
