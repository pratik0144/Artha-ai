import sys
from core.voice_layer import WhisperSTT, ArthaTTS

print("Testing TTS -> STT loop...")
tts = ArthaTTS()
stt = WhisperSTT()

try:
    # 1. Generate audio
    print("Generating TTS audio...")
    audio_bytes = tts.speak_bytes("Hello, testing one two three four.", lang="en")
    print(f"Generated {len(audio_bytes)} bytes.")

    # 2. Transcribe it
    print("Transcribing with Whisper...")
    res = stt.transcribe_bytes(audio_bytes, hint_language="en")
    print(f"Result: {res}")
except Exception as e:
    print(f"Error: {e}")
