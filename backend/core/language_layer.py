"""
language_layer.py — Artha AI Language Intelligence Layer

Handles multilingual support for Artha AI, a voice-first financial
accessibility platform targeting rural and low-digital-literacy users in India.

Primary languages (deep support): Hindi (hi), Kannada (kn)
Secondary languages (display + accept): Tamil, Telugu, Bengali, Marathi, Odia,
                                         Punjabi, Gujarati, English

Uses OpenAI Whisper (turbo model) for speech-to-text transcription.
"""

import re
import unicodedata
from typing import Optional

# =============================================================================
# 1. LANGUAGE_CONFIG — Master configuration for all supported languages
# =============================================================================

LANGUAGE_CONFIG = {
    "hi": {
        "code": "hi",
        "name_english": "Hindi",
        "name_native": "हिन्दी",
        "bhashini_code": "hi",
        "sarvam_code": "hi-IN",
        "is_primary": True,
    },
    "kn": {
        "code": "kn",
        "name_english": "Kannada",
        "name_native": "ಕನ್ನಡ",
        "bhashini_code": "kn",
        "sarvam_code": "kn-IN",
        "is_primary": True,
    },
    "ta": {
        "code": "ta",
        "name_english": "Tamil",
        "name_native": "தமிழ்",
        "bhashini_code": "ta",
        "sarvam_code": "ta-IN",
        "is_primary": False,
    },
    "te": {
        "code": "te",
        "name_english": "Telugu",
        "name_native": "తెలుగు",
        "bhashini_code": "te",
        "sarvam_code": "te-IN",
        "is_primary": False,
    },
    "bn": {
        "code": "bn",
        "name_english": "Bengali",
        "name_native": "বাংলা",
        "bhashini_code": "bn",
        "sarvam_code": "bn-IN",
        "is_primary": False,
    },
    "mr": {
        "code": "mr",
        "name_english": "Marathi",
        "name_native": "मराठी",
        "bhashini_code": "mr",
        "sarvam_code": "mr-IN",
        "is_primary": False,
    },
    "or": {
        "code": "or",
        "name_english": "Odia",
        "name_native": "ଓଡ଼ିଆ",
        "bhashini_code": "or",
        "sarvam_code": "or-IN",
        "is_primary": False,
    },
    "pa": {
        "code": "pa",
        "name_english": "Punjabi",
        "name_native": "ਪੰਜਾਬੀ",
        "bhashini_code": "pa",
        "sarvam_code": "pa-IN",
        "is_primary": False,
    },
    "gu": {
        "code": "gu",
        "name_english": "Gujarati",
        "name_native": "ગુજરાતી",
        "bhashini_code": "gu",
        "sarvam_code": "gu-IN",
        "is_primary": False,
    },
    "en": {
        "code": "en",
        "name_english": "English",
        "name_native": "English",
        "bhashini_code": "en",
        "sarvam_code": "en-IN",
        "is_primary": False,
    },
}

# Quick-access helpers
PRIMARY_LANGUAGES = [code for code, cfg in LANGUAGE_CONFIG.items() if cfg["is_primary"]]
ALL_LANGUAGE_CODES = list(LANGUAGE_CONFIG.keys())
DEFAULT_LANGUAGE = "hi"  # Hindi is the default fallback


# =============================================================================
# 2. detect_language — Script-based language detection via Unicode ranges
# =============================================================================

# Unicode block ranges for Indian scripts
_SCRIPT_RANGES = [
    # (start, end, language_code, script_name)
    (0x0900, 0x097F, "hi", "Devanagari"),   # Hindi / Marathi / Sanskrit
    (0x0C80, 0x0CFF, "kn", "Kannada"),
    (0x0B80, 0x0BFF, "ta", "Tamil"),
    (0x0C00, 0x0C7F, "te", "Telugu"),
    (0x0980, 0x09FF, "bn", "Bengali"),
    (0x0B00, 0x0B7F, "or", "Odia"),
    (0x0A80, 0x0AFF, "gu", "Gujarati"),
    (0x0A00, 0x0A7F, "pa", "Gurmukhi"),     # Punjabi
]


def detect_language(text: str) -> str:
    """
    Detect the language of the input text using Unicode character ranges.

    Strategy:
      1. Count characters belonging to each known Indic script block.
      2. The script with the most characters wins.
      3. If only ASCII/Latin characters are found → "en".
      4. Default fallback → "hi" (our primary language).

    Args:
        text: Input text string (can be any script).

    Returns:
        ISO 639-1 language code string (e.g., "hi", "kn", "en").
    """
    if not text or not text.strip():
        return DEFAULT_LANGUAGE

    script_counts: dict[str, int] = {}
    ascii_count = 0
    total_alpha = 0

    for char in text:
        code_point = ord(char)

        # Skip whitespace, digits, punctuation
        if not char.isalpha():
            continue

        total_alpha += 1

        # Check ASCII / Latin
        if code_point < 0x0080:
            ascii_count += 1
            continue

        # Check against each Indic script range
        for start, end, lang_code, _ in _SCRIPT_RANGES:
            if start <= code_point <= end:
                script_counts[lang_code] = script_counts.get(lang_code, 0) + 1
                break

    # No alphabetic characters at all
    if total_alpha == 0:
        return DEFAULT_LANGUAGE

    # If we found Indic script characters, pick the dominant one
    if script_counts:
        dominant_lang = max(script_counts, key=script_counts.get)
        return dominant_lang

    # If all characters are ASCII → English
    if ascii_count > 0:
        return "en"

    # Ultimate fallback: Hindi
    return DEFAULT_LANGUAGE


def detect_language_with_confidence(text: str) -> dict:
    """
    Extended detection that returns confidence scores for each detected script.

    Returns:
        {
            "detected": "hi",
            "confidence": 0.85,
            "all_scores": {"hi": 0.85, "en": 0.15},
            "is_mixed": False
        }
    """
    if not text or not text.strip():
        return {
            "detected": DEFAULT_LANGUAGE,
            "confidence": 0.0,
            "all_scores": {},
            "is_mixed": False,
        }

    script_counts: dict[str, int] = {}
    ascii_count = 0
    total_alpha = 0

    for char in text:
        code_point = ord(char)
        if not char.isalpha():
            continue
        total_alpha += 1

        if code_point < 0x0080:
            ascii_count += 1
            continue

        for start, end, lang_code, _ in _SCRIPT_RANGES:
            if start <= code_point <= end:
                script_counts[lang_code] = script_counts.get(lang_code, 0) + 1
                break

    if total_alpha == 0:
        return {
            "detected": DEFAULT_LANGUAGE,
            "confidence": 0.0,
            "all_scores": {},
            "is_mixed": False,
        }

    # Build score dictionary
    all_scores: dict[str, float] = {}
    if ascii_count > 0:
        all_scores["en"] = ascii_count / total_alpha
    for lang, count in script_counts.items():
        all_scores[lang] = count / total_alpha

    detected = max(all_scores, key=all_scores.get)
    confidence = all_scores[detected]
    is_mixed = len(all_scores) > 1 and confidence < 0.9

    return {
        "detected": detected,
        "confidence": round(confidence, 3),
        "all_scores": {k: round(v, 3) for k, v in sorted(all_scores.items(), key=lambda x: -x[1])},
        "is_mixed": is_mixed,
    }


# =============================================================================
# 3. get_system_prompt_language_instruction — Agent prompt injection
# =============================================================================

_LANGUAGE_INSTRUCTIONS = {
    "hi": (
        "You MUST respond entirely in simple Hindi (Devanagari script). "
        "Use short sentences. Avoid English words except for proper nouns "
        "like scheme names. This user has low literacy — use the simplest "
        "possible Hindi."
    ),
    "kn": (
        "You MUST respond entirely in simple Kannada (Kannada script). "
        "Use short sentences. Avoid English words except for proper nouns "
        "like scheme names. This user has low literacy — use the simplest "
        "possible Kannada."
    ),
    "ta": (
        "You MUST respond entirely in simple Tamil (Tamil script). "
        "Use short sentences. Avoid English words except for proper nouns. "
        "This user has low literacy — use the simplest possible Tamil."
    ),
    "te": (
        "You MUST respond entirely in simple Telugu (Telugu script). "
        "Use short sentences. Avoid English words except for proper nouns. "
        "This user has low literacy — use the simplest possible Telugu."
    ),
    "bn": (
        "You MUST respond entirely in simple Bengali (Bengali script). "
        "Use short sentences. Avoid English words except for proper nouns. "
        "This user has low literacy — use the simplest possible Bengali."
    ),
    "mr": (
        "You MUST respond entirely in simple Marathi (Devanagari script). "
        "Use short sentences. Avoid English words except for proper nouns. "
        "This user has low literacy — use the simplest possible Marathi."
    ),
    "or": (
        "You MUST respond entirely in simple Odia (Odia script). "
        "Use short sentences. Avoid English words except for proper nouns. "
        "This user has low literacy — use the simplest possible Odia."
    ),
    "pa": (
        "You MUST respond entirely in simple Punjabi (Gurmukhi script). "
        "Use short sentences. Avoid English words except for proper nouns. "
        "This user has low literacy — use the simplest possible Punjabi."
    ),
    "gu": (
        "You MUST respond entirely in simple Gujarati (Gujarati script). "
        "Use short sentences. Avoid English words except for proper nouns. "
        "This user has low literacy — use the simplest possible Gujarati."
    ),
    "en": (
        "You MUST respond in simple, clear English. "
        "Use short sentences and avoid jargon. "
        "This user may have low literacy — use very simple words."
    ),
}

_SAFETY_SUFFIX = (
    "\n\nCRITICAL SAFETY RULES:\n"
    "- Never ask for OTP, PIN, or password.\n"
    "- Never ask for bank account credentials.\n"
    "- Always end responses about money with a fraud safety reminder.\n"
    "- If the user mentions sharing OTP or PIN, immediately warn them it is a scam."
)


def get_system_prompt_language_instruction(lang_code: str) -> str:
    """
    Returns a language instruction string to inject into every AI agent's
    system prompt, ensuring the agent responds in the correct language with
    appropriate simplicity and safety guardrails.

    Args:
        lang_code: ISO 639-1 language code (e.g., "hi", "kn").

    Returns:
        A system prompt fragment string.
    """
    # Fall back to Hindi if unknown language
    instruction = _LANGUAGE_INSTRUCTIONS.get(lang_code, _LANGUAGE_INSTRUCTIONS[DEFAULT_LANGUAGE])

    lang_name = LANGUAGE_CONFIG.get(lang_code, {}).get("name_english", "Hindi")

    header = f"[LANGUAGE DIRECTIVE — {lang_name.upper()}]\n"

    return header + instruction + _SAFETY_SUFFIX


# =============================================================================
# 4. FRAUD_KEYWORDS — Known fraud/scam phrases in Hindi & Kannada
# =============================================================================

FRAUD_KEYWORDS = {
    "hi": [
        "OTP batao",
        "OTP bhejo",
        "OTP share karo",
        "account band hoga",
        "account block ho jayega",
        "prize mila hai",
        "lottery lagi hai",
        "KYC karo",
        "KYC update karo turant",
        "bank manager bol raha hoon",
        "paisa double hoga",
        "aadhar link karo abhi",
        "sim band hogi",
        "police case hoga",
        "aapke naam warrant hai",
        "cash back milega",
        "link pe click karo",
        "PIN batao",
        "password batao",
        "verification ke liye paisa bhejo",
    ],
    "kn": [
        "OTP heli",
        "OTP kodi",
        "OTP share maadi",
        "account close aagatte",
        "account block aagatte",
        "prize sigide",
        "lottery bandide",
        "KYC maadi",
        "KYC update maadi turant",
        "bank manager naanu",
        "haana double aagatte",
        "aadhar link maadi eega",
        "sim band aagatte",
        "police case aagatte",
        "nimma hesaralli warrant ide",
        "cash back sigatte",
        "link click maadi",
        "PIN heli",
        "password heli",
        "verification ge haana kalisi",
    ],
}

_FRAUD_WARNINGS = {
    "hi": (
        "⚠️ सावधान! यह एक धोखाधड़ी (fraud) हो सकती है। "
        "कभी भी किसी को OTP, PIN या password न बताएं। "
        "कोई भी बैंक या सरकारी अधिकारी फोन पर यह नहीं मांगता। "
        "अगर कोई ऐसा कहे, तुरंत फोन काट दें।"
    ),
    "kn": (
        "⚠️ ಎಚ್ಚರಿಕೆ! ಇದು ಒಂದು ವಂಚನೆ (fraud) ಆಗಿರಬಹುದು। "
        "ಯಾರಿಗೂ OTP, PIN ಅಥವಾ password ಹೇಳಬೇಡಿ। "
        "ಯಾವುದೇ ಬ್ಯಾಂಕ್ ಅಥವಾ ಸರ್ಕಾರಿ ಅಧಿಕಾರಿ ಫೋನ್‌ನಲ್ಲಿ ಇದನ್ನು ಕೇಳುವುದಿಲ್ಲ। "
        "ಯಾರಾದರೂ ಹಾಗೆ ಹೇಳಿದರೆ, ತಕ್ಷಣ ಫೋನ್ ಕಟ್ ಮಾಡಿ."
    ),
}


# =============================================================================
# 5. check_fraud_language — Checks user text for known fraud patterns
# =============================================================================

def check_fraud_language(text: str, lang: str = "hi") -> dict:
    """
    Scans the given text against known fraud/scam keywords for the specified
    language. Returns match results and a warning message in the user's language.

    Args:
        text: User input text to scan.
        lang: Language code ("hi" or "kn"). Defaults to "hi" if lang
              is not in the FRAUD_KEYWORDS dictionary.

    Returns:
        {
            "is_fraud": bool,
            "matched": [list of matched phrases],
            "warning": str  (in Hindi or Kannada)
        }
    """
    # Default to Hindi if language not in our fraud keyword set
    effective_lang = lang if lang in FRAUD_KEYWORDS else "hi"

    keywords = FRAUD_KEYWORDS[effective_lang]
    text_lower = text.lower().strip()

    matched = []
    for phrase in keywords:
        # Case-insensitive substring match
        if phrase.lower() in text_lower:
            matched.append(phrase)

    is_fraud = len(matched) > 0
    warning = _FRAUD_WARNINGS.get(effective_lang, _FRAUD_WARNINGS["hi"]) if is_fraud else ""

    return {
        "is_fraud": is_fraud,
        "matched": matched,
        "warning": warning,
    }


# =============================================================================
# 6. GREETINGS — Opening conversation greetings per language
# =============================================================================

GREETINGS = {
    "hi": "🙏 नमस्ते! मैं Artha AI हूँ। आपकी कैसे मदद कर सकता हूँ?",
    "kn": "🙏 ನಮಸ್ಕಾರ! ನಾನು Artha AI. ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
    "ta": "🙏 வணக்கம்! நான் Artha AI. நான் உங்களுக்கு எப்படி உதவ முடியும்?",
    "te": "🙏 నమస్కారం! నేను Artha AI. మీకు ఎలా సహాయం చేయగలను?",
    "bn": "🙏 নমস্কার! আমি Artha AI। আমি আপনাকে কিভাবে সাহায্য করতে পারি?",
    "mr": "🙏 नमस्कार! मी Artha AI आहे. मी तुम्हाला कशी मदत करू शकतो?",
    "or": "🙏 ନମସ୍କାର! ମୁଁ Artha AI। ମୁଁ ଆପଣଙ୍କୁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?",
    "pa": "🙏 ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ Artha AI ਹਾਂ। ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?",
    "gu": "🙏 નમસ્તે! હું Artha AI છું. હું તમને કેવી રીતે મદદ કરી શકું?",
    "en": "🙏 Hello! I am Artha AI. How can I help you today?",
}


# =============================================================================
# Utility helpers
# =============================================================================

def get_greeting(lang_code: str) -> str:
    """Return the greeting for a language, defaulting to Hindi."""
    return GREETINGS.get(lang_code, GREETINGS[DEFAULT_LANGUAGE])


def get_language_name(lang_code: str, native: bool = False) -> str:
    """Get the display name of a language."""
    cfg = LANGUAGE_CONFIG.get(lang_code)
    if not cfg:
        return lang_code
    return cfg["name_native"] if native else cfg["name_english"]


def is_primary_language(lang_code: str) -> bool:
    """Check if a language is a primary (deep support) language."""
    cfg = LANGUAGE_CONFIG.get(lang_code)
    return cfg["is_primary"] if cfg else False


def get_supported_languages() -> list[dict]:
    """Return a list of all supported languages with their configs."""
    return [
        {
            "code": cfg["code"],
            "name": cfg["name_english"],
            "native_name": cfg["name_native"],
            "is_primary": cfg["is_primary"],
        }
        for cfg in LANGUAGE_CONFIG.values()
    ]


def get_whisper_language_code(lang_code: str) -> str:
    """
    Map our internal language code to the Whisper-compatible language code.
    Whisper uses ISO 639-1 codes which mostly match ours, except Odia.
    We use the 'turbo' model for best speed/accuracy tradeoff.
    """
    whisper_map = {
        "hi": "hi",
        "kn": "kn",
        "ta": "ta",
        "te": "te",
        "bn": "bn",
        "mr": "mr",
        "or": "or",   # Whisper supports Odia as "or"
        "pa": "pa",
        "gu": "gu",
        "en": "en",
    }
    return whisper_map.get(lang_code, "hi")


# =============================================================================
# Module self-test
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("  Artha AI — Language Layer Self-Test")
    print("=" * 60)

    # Test language detection
    test_cases = [
        ("नमस्ते, मेरा बैलेंस बताओ", "hi"),
        ("ನನ್ನ ಬ್ಯಾಲೆನ್ಸ್ ಎಷ್ಟು?", "kn"),
        ("என் இருப்பு என்ன?", "ta"),
        ("నా బ్యాలెన్స్ ఎంత?", "te"),
        ("আমার ব্যালেন্স কত?", "bn"),
        ("What is my balance?", "en"),
        ("", "hi"),  # empty → default
    ]

    print("\n📝 Language Detection Tests:")
    for text, expected in test_cases:
        detected = detect_language(text)
        status = "✅" if detected == expected else "❌"
        print(f"  {status} '{text[:30]}...' → detected: {detected}, expected: {expected}")

    # Test fraud detection
    print("\n🔍 Fraud Detection Tests:")
    fraud_tests = [
        ("aapka OTP batao mujhe", "hi"),
        ("nimma OTP heli", "kn"),
        ("mera balance kitna hai", "hi"),   # not fraud
    ]
    for text, lang in fraud_tests:
        result = check_fraud_language(text, lang)
        status = "🚨" if result["is_fraud"] else "✅"
        print(f"  {status} [{lang}] '{text}' → fraud: {result['is_fraud']}, matched: {result['matched']}")
        if result["warning"]:
            print(f"       Warning: {result['warning'][:60]}...")

    # Test system prompts
    print("\n📋 System Prompt Samples:")
    for lang in ["hi", "kn", "en"]:
        prompt = get_system_prompt_language_instruction(lang)
        print(f"  [{lang}] {prompt[:80]}...")

    # Test greetings
    print("\n👋 Greetings:")
    for lang in ALL_LANGUAGE_CODES:
        print(f"  [{lang}] {get_greeting(lang)}")

    # Show supported languages
    print("\n🌐 Supported Languages:")
    for lang_info in get_supported_languages():
        primary = " ⭐ PRIMARY" if lang_info["is_primary"] else ""
        print(f"  {lang_info['code']}: {lang_info['name']} ({lang_info['native_name']}){primary}")

    print("\n" + "=" * 60)
    print("  All tests complete!")
    print("=" * 60)
