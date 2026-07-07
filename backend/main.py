"""
main.py — Artha AI Flask API Entry Point

The central API server that ties together all Artha AI modules:
  - OrchestratorAgent for intent routing & fraud screening
  - AgentDispatcher for specialist agent delegation
  - WhisperSTT & ArthaTTS for voice I/O
  - language_layer for multilingual support

Port 5005 — Bank API (teammate's) runs on port 5001.
"""

import os
import json
import logging
from datetime import datetime, timezone

import requests as http_requests
from dotenv import load_dotenv
from flask import Flask, request, jsonify, Response
from flask_cors import CORS

# Load environment variables from .env
load_dotenv()

# Artha AI module imports
from core import language_layer
from core.llm_router import LLMRouter
from agents.orchestrator_agent import OrchestratorAgent
from agents.specialist_agents import AgentDispatcher
from core.voice_layer import WhisperSTT, ArthaTTS

# =============================================================================
# App Configuration
# =============================================================================

app = Flask(__name__)
CORS(app)

# Register schemes API routes
from agents.schemes_scraper_and_recommender import register_schemes_routes
register_schemes_routes(app)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("artha")

# In-memory session store — keyed by account_id
# Each session: { profile, conversation_history, orchestrator, created_at }
SESSIONS: dict[str, dict] = {}

# Bank API base URL
BANK_API = "http://localhost:5001"

# Lazy-loaded voice engines (heavy — load once)
_whisper_stt: WhisperSTT | None = None
_artha_tts: ArthaTTS | None = None


def _get_stt() -> WhisperSTT:
    """Lazy-load WhisperSTT singleton."""
    global _whisper_stt
    if _whisper_stt is None:
        _whisper_stt = WhisperSTT()
    return _whisper_stt


def _get_tts() -> ArthaTTS:
    """Lazy-load ArthaTTS singleton."""
    global _artha_tts
    if _artha_tts is None:
        _artha_tts = ArthaTTS()
    return _artha_tts


# =============================================================================
# POST /onboard — User onboarding
# =============================================================================

@app.route("/onboard", methods=["POST"])
def onboard():
    """
    Onboard a new user. Creates an orchestrator session with their profile.

    Body:
        account_id, language, occupation, income_bracket,
        has_smartphone, location, fraud_risk, concern, scheme_exp
    """
    data = request.get_json(force=True)

    account_id = data.get("account_id")
    if not account_id:
        return jsonify({"status": "error", "message": "account_id is required"}), 400

    language = data.get("language", "hi")

    # Fetch eligible schemes from bank API
    eligible_schemes = []
    try:
        resp = http_requests.get(
            f"{BANK_API}/account/{account_id}/eligible_schemes",
            timeout=5,
        )
        if resp.ok:
            schemes_data = resp.json()
            eligible_schemes = schemes_data.get("schemes", schemes_data) \
                if isinstance(schemes_data, dict) else schemes_data
    except Exception as e:
        log.warning(f"[ONBOARD] Bank API unreachable for schemes: {e}")
        # Use any schemes provided in the request body as fallback
        eligible_schemes = data.get("eligible_schemes", [])

    # Build user profile
    profile = {
        "account_id": account_id,
        "name": data.get("name", f"User-{account_id}"),
        "language": language,
        "occupation": data.get("occupation", "unknown"),
        "income_bracket": data.get("income_bracket", "unknown"),
        "has_smartphone": data.get("has_smartphone", False),
        "location": data.get("location", "unknown"),
        "fraud_risk": data.get("fraud_risk", "medium"),
        "eligible_schemes": eligible_schemes if isinstance(eligible_schemes, list) else [],
        "concern": data.get("concern", ""),
        "scheme_exp": data.get("scheme_exp", ""),
    }

    # Create orchestrator and set profile
    orchestrator = OrchestratorAgent()
    orchestrator.set_user_profile(profile)

    # Store session
    SESSIONS[account_id] = {
        "profile": profile,
        "conversation_history": [],
        "orchestrator": orchestrator,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # Determine active agents based on profile
    active_agents = ["banking", "fraud"]  # Always active
    if profile.get("eligible_schemes"):
        active_agents.append("schemes")
    else:
        active_agents.append("schemes")  # Still available for discovery
    active_agents.append("literacy")

    # Language support note
    if language in ["hi", "kn"]:
        language_note = "Full support enabled"
    else:
        language_note = "Hindi and Kannada are primary supported languages"

    log.info(
        f"[ONBOARD] {account_id} | lang:{language} | "
        f"occupation:{profile['occupation']} | schemes:{len(profile['eligible_schemes'])}"
    )

    return jsonify({
        "status": "success",
        "profile": profile,
        "eligible_schemes": profile["eligible_schemes"],
        "greeting": language_layer.GREETINGS.get(language, language_layer.GREETINGS["hi"]),
        "active_agents": active_agents,
        "language_note": language_note,
    })


# =============================================================================
# POST /chat — Main conversation endpoint
# =============================================================================

@app.route("/chat", methods=["POST"])
def chat():
    """
    Process a user chat message through the full Artha AI pipeline.

    Body:
        account_id: str
        message: str
    """
    data = request.get_json(force=True)

    account_id = data.get("account_id")
    message = data.get("message", "").strip()

    if not account_id:
        return jsonify({"status": "error", "message": "account_id is required"}), 400
    if not message:
        return jsonify({"status": "error", "message": "message is required"}), 400

    # Load session
    session = SESSIONS.get(account_id)
    if not session:
        return jsonify({
            "status": "error",
            "message": f"No session found for account_id '{account_id}'. Call /onboard first.",
        }), 404

    orchestrator = session["orchestrator"]
    history = session["conversation_history"]

    # Run orchestrator pipeline: language detect → fraud check → intent classify
    route_result = orchestrator.run(message)

    intent = route_result["intent"]
    lang = route_result["language"]
    fraud_triggered = route_result["fraud_check"]["is_fraud"]

    # Handle fraud — skip specialist agent entirely
    if fraud_triggered:
        fraud_warning = route_result["fraud_check"]["warning"]
        agent_response = {
            "response": fraud_warning,
            "agent": "fraud_guard_auto",
            "model_used": "none",
        }
    else:
        # Dispatch to specialist agent
        dispatcher = AgentDispatcher()
        agent_response = dispatcher.dispatch(
            route_result,
            message,
            history,
            orchestrator.build_context_block(),
        )

    # Update conversation history
    history.append({"role": "user", "content": message})
    history.append({"role": "assistant", "content": agent_response["response"]})

    # Trim history to max 20 messages
    if len(history) > 20:
        session["conversation_history"] = history[-20:]

    # Build log line
    agent_used = agent_response.get("agent", "unknown")
    model_used = agent_response.get("model_used", "unknown")
    log_line = f"ROUTE→{intent} | MODEL:{model_used} | LANG:{lang} | FRAUD:{fraud_triggered}"

    log.info(f"[CHAT] {account_id} | {lang} | {intent} | {agent_used} | fraud:{fraud_triggered}")

    return jsonify({
        "status": "success",
        "response": agent_response["response"],
        "agent_used": agent_used,
        "model_used": model_used,
        "intent_detected": intent,
        "language_detected": lang,
        "fraud_triggered": fraud_triggered,
        "log_line": log_line,
    })


# =============================================================================
# POST /stt — Speech-to-Text (Whisper turbo)
# =============================================================================

@app.route("/stt", methods=["POST"])
def stt():
    """
    Transcribe uploaded audio to text using Whisper turbo.

    Body (multipart):
        audio: audio file
        hint_language: optional language hint (e.g., "hi", "kn")
    """
    if "audio" not in request.files:
        return jsonify({"status": "error", "message": "No audio file uploaded. Field: 'audio'"}), 400

    audio_file = request.files["audio"]
    audio_bytes = audio_file.read()

    if len(audio_bytes) == 0:
        return jsonify({"status": "error", "message": "Empty audio file"}), 400

    hint_language = request.form.get("hint_language", None)

    log.info(f"[STT] Received {len(audio_bytes)} bytes, hint: {hint_language}")

    stt_engine = _get_stt()
    try:
        result = stt_engine.transcribe_bytes(audio_bytes, hint_language)
    except Exception as e:
        log.error(f"[STT] Transcription failed: {e}")
        return jsonify({
            "status": "error",
            "message": "We could not understand the audio. Please try speaking again.",
            "detail": str(e)
        }), 422

    log.info(f"[STT] Transcribed: '{result['text'][:60]}...' | lang: {result['detected_language']}")

    return jsonify({
        "status": "success",
        "text": result["text"],
        "detected_language": result["detected_language"],
        "is_primary_language": result["is_primary_language"],
        "confidence_note": result["confidence_note"],
    })


# =============================================================================
# POST /tts — Text-to-Speech (gTTS)
# =============================================================================

@app.route("/tts", methods=["POST"])
def tts():
    """
    Convert text to speech audio.

    Body:
        text: str — Text to speak
        lang: str — Language code (e.g., "hi", "kn")

    Returns:
        audio/mpeg binary
    """
    data = request.get_json(force=True)

    text = data.get("text", "").strip()
    lang = data.get("lang", "hi")

    if not text:
        return jsonify({"status": "error", "message": "text is required"}), 400

    log.info(f"[TTS] Generating speech: [{lang}] '{text[:40]}...'")

    tts_engine = _get_tts()

    try:
        audio_bytes = tts_engine.speak_bytes(text, lang)
        return Response(audio_bytes, mimetype="audio/mpeg")
    except Exception as e:
        log.error(f"[TTS] Failed: {e}")
        return jsonify({"status": "error", "message": f"TTS failed: {e}"}), 500


# =============================================================================
# POST /reset — Clear conversation history
# =============================================================================

@app.route("/reset", methods=["POST"])
def reset():
    """
    Clear conversation history for a user session.

    Body:
        account_id: str
    """
    data = request.get_json(force=True)
    account_id = data.get("account_id")

    if not account_id:
        return jsonify({"status": "error", "message": "account_id is required"}), 400

    session = SESSIONS.get(account_id)
    if not session:
        return jsonify({"status": "error", "message": "Session not found"}), 404

    session["conversation_history"] = []

    # Also clear orchestrator history
    session["orchestrator"].clear_history()

    log.info(f"[RESET] {account_id} — conversation cleared")

    return jsonify({"status": "cleared"})


# =============================================================================
# GET /health — System health check
# =============================================================================

@app.route("/health", methods=["GET"])
def health():
    """
    Health check endpoint. Checks bank API connectivity and reports
    model/language configuration status.
    """
    # Check bank API
    bank_status = "down"
    try:
        resp = http_requests.get(f"{BANK_API}/health", timeout=3)
        if resp.ok:
            bank_status = "up"
    except Exception:
        bank_status = "down"

    # Check Gemini configuration
    gemini_status = "configured" if os.environ.get("GEMINI_API_KEY") else "not configured"

    return jsonify({
        "status": "ok",
        "bank_api": bank_status,
        "models": {
            "gemini": gemini_status,
            "ministral": "local",
            "glm": "configured",
        },
        "whisper": "turbo loaded",
        "primary_languages": ["Hindi (hi)", "Kannada (kn)"],
        "version": "1.0",
    })


# =============================================================================
# GET / — Root info endpoint
# =============================================================================

@app.route("/", methods=["GET"])
def root():
    """Root endpoint — project info."""
    return jsonify({
        "name": "Artha AI",
        "description": "Multilingual voice-first AI financial accessibility platform for rural India",
        "version": "1.0",
        "endpoints": {
            "POST /onboard": "User onboarding with profile",
            "POST /chat": "Main conversation endpoint",
            "POST /stt": "Speech-to-text (Whisper turbo)",
            "POST /tts": "Text-to-speech (gTTS)",
            "POST /reset": "Clear conversation history",
            "GET /health": "System health check",
        },
        "primary_languages": ["Hindi", "Kannada"],
        "bank_api": BANK_API,
    })


# =============================================================================
# Request logging middleware
# =============================================================================

@app.before_request
def log_request():
    """Log incoming requests for debugging."""
    if request.path in ["/health", "/favicon.ico", "/"]:
        return  # Don't log health checks
    log.info(f"[REQ] {request.method} {request.path}")


@app.after_request
def add_headers(response):
    """Add common response headers."""
    response.headers["X-Powered-By"] = "Artha AI v1.0"
    return response


# =============================================================================
# Entry point
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("  🚀 Artha AI — Starting API Server")
    print("=" * 60)
    print(f"  Port:              5005")
    print(f"  Bank API:          {BANK_API}")
    print(f"  Gemini API Key:    {'✅ Set' if os.environ.get('GEMINI_API_KEY') else '❌ Not set'}")
    print(f"  Primary Languages: Hindi (hi), Kannada (kn)")
    print(f"  Whisper Model:     turbo (lazy-loaded on first /stt call)")
    print("=" * 60)

    app.run(
        host="0.0.0.0",
        port=5005,
        debug=True,
    )
