"""
voice_layer.py — Artha AI Voice I/O Layer

Handles speech-to-text (via OpenAI Whisper turbo) and text-to-speech (via gTTS).
This module is the voice interface for the platform — users speak in their
native language and hear responses back in the same language.

STT: OpenAI Whisper (turbo model) — best speed/accuracy tradeoff for Indic languages.
TTS: gTTS (Google Text-to-Speech) — free, supports all our target languages.
"""

import io
import os
import tempfile
import ssl
from typing import Optional

# Bypass Mac Python SSL certificate verification issues for model downloads
ssl._create_default_https_context = ssl._create_unverified_context

from core import language_layer


# =============================================================================
# Whisper Language Code Mapping
# =============================================================================

# Map our internal codes to Whisper-compatible codes
_WHISPER_LANG_MAP = {
    "hi": "hi",
    "kn": "kn",
    "ta": "ta",
    "te": "te",
    "bn": "bn",
    "mr": "mr",
    "or": "or",
    "pa": "pa",
    "gu": "gu",
    "en": "en",
}

# Map our internal codes to gTTS-compatible codes
_GTTS_LANG_MAP = {
    "hi": "hi",
    "kn": "kn",
    "ta": "ta",
    "te": "te",
    "bn": "bn",
    "mr": "mr",
    "or": "or",     # gTTS doesn't officially support Odia, fallback to Hindi
    "pa": "pa",
    "gu": "gu",
    "en": "en",
}


# =============================================================================
# WhisperSTT — Speech-to-Text via OpenAI Whisper (turbo model)
# =============================================================================

class WhisperSTT:
    """
    Speech-to-text engine using OpenAI Whisper turbo model.

    Loads the model lazily on first use to avoid slow startup.
    Supports all Indic languages in our LANGUAGE_CONFIG.
    """

    def __init__(self):
        self._model = None
        self._model_name = "turbo"

    def _load_model(self):
        """Lazy-load the Whisper model on first transcription request."""
        if self._model is None:
            try:
                import whisper
                print(f"[WhisperSTT] Loading Whisper '{self._model_name}' model...")
                self._model = whisper.load_model(self._model_name)
                print(f"[WhisperSTT] Model loaded successfully.")
            except Exception as e:
                print(f"[WhisperSTT] Failed to load model: {e}")
                self._model = None

    def transcribe_file(self, audio_path: str, hint_language: Optional[str] = None) -> dict:
        """
        Transcribe an audio file to text.

        Args:
            audio_path: Path to the audio file (wav, mp3, m4a, etc.).
            hint_language: Optional language hint (our internal code, e.g., "hi").

        Returns:
            {
                "text": str,
                "detected_language": str,
                "is_primary_language": bool,
                "confidence_note": str
            }
        """
        self._load_model()

        if self._model is None:
            return {
                "text": "",
                "detected_language": "hi",
                "is_primary_language": True,
                "confidence_note": "Whisper model not available",
            }

        try:
            # Build transcription options
            options = {}
            if hint_language and hint_language in _WHISPER_LANG_MAP:
                options["language"] = _WHISPER_LANG_MAP[hint_language]

            result = self._model.transcribe(audio_path, **options)

            text = result.get("text", "").strip()
            whisper_lang = result.get("language", "hi")

            # Map Whisper's detected language back to our internal code
            detected = whisper_lang if whisper_lang in language_layer.LANGUAGE_CONFIG else "hi"
            is_primary = language_layer.is_primary_language(detected)

            confidence_note = "High confidence" if is_primary else "Secondary language — verify accuracy"

            return {
                "text": text,
                "detected_language": detected,
                "is_primary_language": is_primary,
                "confidence_note": confidence_note,
            }

        except Exception as e:
            return {
                "text": "",
                "detected_language": hint_language or "hi",
                "is_primary_language": True,
                "confidence_note": f"Transcription error: {e}",
            }

    def transcribe_bytes(self, audio_bytes: bytes, hint_language: Optional[str] = None) -> dict:
        """
        Transcribe audio from raw bytes (e.g., from a file upload).

        Writes to a temp file, transcribes, then cleans up.

        Args:
            audio_bytes: Raw audio file bytes.
            hint_language: Optional language hint code.

        Returns:
            Same dict as transcribe_file().
        """
        tmp_path = None
        try:
            # Write bytes to a temporary file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name

            return self.transcribe_file(tmp_path, hint_language)

        finally:
            # Clean up temp file
            if tmp_path and os.path.exists(tmp_path):
                os.unlink(tmp_path)


# =============================================================================
# ArthaTTS — Text-to-Speech via gTTS
# =============================================================================

class ArthaTTS:
    """
    Text-to-speech engine using Google Text-to-Speech (gTTS).

    Generates audio in the user's language. Returns MP3 bytes
    that can be streamed directly to the client.
    """

    def speak_file(self, text: str, lang: str = "hi", output_path: Optional[str] = None) -> str:
        """
        Generate speech audio and save to a file.

        Args:
            text: Text to speak.
            lang: Language code (our internal code).
            output_path: Optional output file path. Auto-generated if not provided.

        Returns:
            Path to the generated audio file.
        """
        from gtts import gTTS

        gtts_lang = _GTTS_LANG_MAP.get(lang, "hi")

        if output_path is None:
            output_path = tempfile.mktemp(suffix=".mp3")

        try:
            tts = gTTS(text=text, lang=gtts_lang, slow=False)
            tts.save(output_path)
            return output_path
        except Exception as e:
            # Fallback to Hindi if the language isn't supported
            if gtts_lang != "hi":
                print(f"[ArthaTTS] {lang} failed, falling back to Hindi: {e}")
                tts = gTTS(text=text, lang="hi", slow=False)
                tts.save(output_path)
                return output_path
            raise

    def speak_bytes(self, text: str, lang: str = "hi") -> bytes:
        """
        Generate speech audio and return as bytes (MP3 format).

        Args:
            text: Text to speak.
            lang: Language code.

        Returns:
            MP3 audio bytes.
        """
        from gtts import gTTS

        gtts_lang = _GTTS_LANG_MAP.get(lang, "hi")

        try:
            tts = gTTS(text=text, lang=gtts_lang, slow=False)
            buffer = io.BytesIO()
            tts.write_to_fp(buffer)
            buffer.seek(0)
            return buffer.read()
        except Exception as e:
            # Fallback to Hindi
            if gtts_lang != "hi":
                print(f"[ArthaTTS] {lang} failed, falling back to Hindi: {e}")
                tts = gTTS(text=text, lang="hi", slow=False)
                buffer = io.BytesIO()
                tts.write_to_fp(buffer)
                buffer.seek(0)
                return buffer.read()
            raise


# =============================================================================
# Module self-test
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("  Artha AI — Voice Layer Self-Test")
    print("=" * 60)

    # Test TTS
    print("\n🔊 Testing ArthaTTS...")
    tts = ArthaTTS()

    test_phrases = [
        ("नमस्ते! मैं Artha AI हूँ।", "hi"),
        ("ನಮಸ್ಕಾರ! ನಾನು Artha AI.", "kn"),
        ("Hello! I am Artha AI.", "en"),
    ]

    for text, lang in test_phrases:
        try:
            audio_bytes = tts.speak_bytes(text, lang)
            print(f"  ✅ [{lang}] Generated {len(audio_bytes)} bytes — '{text[:30]}...'")
        except Exception as e:
            print(f"  ❌ [{lang}] Failed: {e}")

    # Test STT (model loading info only — no audio file to test with)
    print("\n🎤 Testing WhisperSTT...")
    stt = WhisperSTT()
    print(f"  Model name: {stt._model_name}")
    print(f"  Model loaded: {stt._model is not None} (lazy — loads on first use)")

    print(f"\n{'=' * 60}")
    print(f"  Voice layer tests complete!")
    print(f"{'=' * 60}")
