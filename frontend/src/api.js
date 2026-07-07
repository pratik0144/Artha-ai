import axios from 'axios';

// Empty base URL for Vercel deployment (relative paths → /api/*)
// In local dev with vite proxy, this also works via vite.config.js proxy
const API_BASE_URL = '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Helper: extract and broadcast credit info from API responses ───
// ─── Helper: extract and broadcast credit info from API responses ───
const dispatchCreditUpdate = (responseData) => {
  if (!responseData) return;

  const total = responseData.credits_total ?? responseData.total_credits;
  const used = responseData.credits_used ?? responseData.used_credits;
  const remaining = responseData.credits_remaining ?? responseData.remaining_credits;

  if (total !== undefined || used !== undefined || remaining !== undefined) {
    const totalVal = total !== undefined ? total : 50;
    const usedVal = used !== undefined ? used : (remaining !== undefined ? totalVal - remaining : 0);
    const keyStats = responseData.key_statuses ?? responseData.key_stats;

    const event = new CustomEvent('credit-update', {
      detail: {
        total_credits: totalVal,
        credits_used: usedVal,
        active_key_index: responseData.active_key_index,
        key_statuses: keyStats,
      },
    });
    window.dispatchEvent(event);
  }
};

// ─── Session ID management ───
let _sessionId = null;

export const setSessionId = (id) => {
  _sessionId = id;
};

export const getSessionId = () => _sessionId;

// Add session ID header to all requests
apiClient.interceptors.request.use((config) => {
  if (_sessionId) {
    config.headers['X-Session-Id'] = _sessionId;
  }
  return config;
});

// ─── API Functions ───

export const checkHealth = async () => {
  try {
    const response = await apiClient.get('/api/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

export const onboardUser = async (profileData) => {
  try {
    const response = await apiClient.post('/api/onboard', profileData);
    dispatchCreditUpdate(response.data);
    return response.data;
  } catch (error) {
    console.error('Onboarding failed:', error);
    throw error;
  }
};

export const sendChatMessage = async (accountId, message, language = null) => {
  try {
    const payload = {
      account_id: accountId,
      message,
    };
    if (language) {
      payload.language = language;
    }
    const response = await apiClient.post('/api/chat', payload);
    dispatchCreditUpdate(response.data);
    return response.data;
  } catch (error) {
    console.error('Chat failed:', error);
    throw error;
  }
};

export const resetSession = async (accountId) => {
  try {
    const response = await apiClient.post('/api/reset', {
      account_id: accountId,
    });
    dispatchCreditUpdate(response.data);
    return response.data;
  } catch (error) {
    console.error('Reset failed:', error);
    throw error;
  }
};

export const transcribeAudio = async (audioBlob, hintLanguage = null) => {
  try {
    // Convert Blob to base64 string
    const reader = new FileReader();
    const base64Promise = new Promise((resolve, reject) => {
      reader.onloadend = () => {
        // base64 url prefix looks like: "data:audio/webm;base64,..."
        const base64data = reader.result.split(',')[1];
        resolve(base64data);
      };
      reader.onerror = reject;
    });
    reader.readAsDataURL(audioBlob);
    const base64Audio = await base64Promise;

    const response = await apiClient.post('/api/stt', {
      audio_base64: base64Audio,
      mime_type: audioBlob.type || 'audio/webm',
      hint_language: hintLanguage
    });
    
    dispatchCreditUpdate(response.data);
    return response.data;
  } catch (error) {
    console.error('STT failed:', error);
    throw error;
  }
};

// TTS is handled via useSpeechSynthesis hook:
//   PRIMARY:  /api/tts (msedge-tts neural voices — Siri/Alexa quality)
//   FALLBACK: Browser SpeechSynthesis API (offline)


export const getCredits = async (sessionId) => {
  try {
    const params = sessionId ? { session_id: sessionId } : {};
    const response = await apiClient.get('/api/credits', { params });
    return response.data;
  } catch (error) {
    console.error('Get credits failed:', error);
    throw error;
  }
};

export const getAllSchemes = async () => {
  try {
    const response = await apiClient.get('/api/schemes/all');
    dispatchCreditUpdate(response.data);
    return response.data;
  } catch (error) {
    console.error('Get schemes failed:', error);
    throw error;
  }
};

export const recommendSchemes = async (profileData) => {
  try {
    const response = await apiClient.post('/api/schemes/recommend', profileData);
    dispatchCreditUpdate(response.data);
    return response.data;
  } catch (error) {
    console.error('Recommend schemes failed:', error);
    throw error;
  }
};
