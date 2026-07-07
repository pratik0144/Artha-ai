import { useState, useCallback, useRef } from 'react';

/**
 * useSpeechSynthesis — Neural Text-to-Speech hook.
 *
 * PRIMARY:  Microsoft Edge neural voices via /api/tts (msedge-tts)
 *           Sounds like Siri/Alexa — natural, human-like speech.
 *           Supports: en-IN (Neerja), hi-IN (Swara), kn-IN (Sapna)
 *
 * FALLBACK: Browser native SpeechSynthesis API (offline, robotic but works)
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

export const useSpeechSynthesis = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef(null);
  const abortRef = useRef(null);

  /**
   * Speak text using the neural TTS backend, falling back to browser TTS.
   * @param {string} text - Text to speak
   * @param {string} lang - Language: 'en', 'hi', or 'kn'
   * @param {object} opts - { rate, onEnd }
   */
  const speak = useCallback(async (text, lang = 'en', opts = {}) => {
    if (!text) return;

    // Stop any currently playing audio
    stopInternal();

    setIsSpeaking(true);

    try {
      // ── PRIMARY: Neural TTS via msedge-tts backend ──
      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch(`${API_BASE}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 500), lang }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`TTS API returned ${response.status}`);

      const blob = await response.blob();
      if (blob.size === 0) throw new Error('Empty audio response');

      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Set playback rate
      audio.playbackRate = opts.rate ?? 1.0;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        opts.onEnd?.();
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        // Fall through to browser fallback
        fallbackSpeak(text, lang, opts);
      };

      await audio.play();

    } catch (err) {
      if (err.name === 'AbortError') {
        setIsSpeaking(false);
        return;
      }
      console.warn('[TTS] Neural TTS failed, falling back to browser:', err.message);
      fallbackSpeak(text, lang, opts);
    }
  }, []);

  /**
   * Fallback: Browser-native SpeechSynthesis (works offline, lower quality)
   */
  const fallbackSpeak = useCallback((text, lang, opts = {}) => {
    if (!('speechSynthesis' in window)) {
      setIsSpeaking(false);
      opts.onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();

    const LANG_MAP = { en: 'en-IN', hi: 'hi-IN', kn: 'kn-IN' };
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_MAP[lang] || 'en-IN';
    utterance.rate = opts.rate ?? 1.0;

    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices();
    const targetLang = LANG_MAP[lang] || 'en-IN';
    const voice = voices.find(v => v.lang === targetLang)
      || voices.find(v => v.lang.startsWith(lang))
      || voices.find(v => v.lang.startsWith('en'));
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      setIsSpeaking(false);
      opts.onEnd?.();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      opts.onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  /**
   * Internal stop — cancels both audio element and browser synth.
   */
  const stopInternal = useCallback(() => {
    // Abort fetch if in-flight
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    // Stop audio element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    // Stop browser synth
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  /**
   * Stop all speech immediately (exposed to consumers).
   */
  const stop = useCallback(() => {
    stopInternal();
    setIsSpeaking(false);
  }, [stopInternal]);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported: true, // Always supported — backend + browser fallback
  };
};
