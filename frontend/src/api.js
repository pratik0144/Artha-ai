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
const dispatchCreditUpdate = (responseData) => {
  if (
    responseData &&
    (responseData.credits_remaining !== undefined ||
      responseData.credits_used !== undefined ||
      responseData.total_credits !== undefined)
  ) {
    const event = new CustomEvent('credit-update', {
      detail: {
        credits_used: responseData.credits_used,
        total_credits: responseData.total_credits,
        active_key_index: responseData.active_key_index,
        key_statuses: responseData.key_statuses,
        // Support credits_remaining fallback
        ...(responseData.credits_remaining !== undefined && {
          credits_used:
            (responseData.total_credits ?? 50) - responseData.credits_remaining,
          total_credits: responseData.total_credits ?? 50,
        }),
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

export const sendChatMessage = async (accountId, message) => {
  try {
    const response = await apiClient.post('/api/chat', {
      account_id: accountId,
      message,
    });
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
    const formData = new FormData();
    // Use an arbitrary filename
    formData.append('audio', audioBlob, 'voice_input.webm');

    if (hintLanguage) {
      formData.append('hint_language', hintLanguage);
    }

    const headers = { 'Content-Type': 'multipart/form-data' };
    if (_sessionId) {
      headers['X-Session-Id'] = _sessionId;
    }

    const response = await axios.post(`${API_BASE_URL}/api/stt`, formData, {
      headers,
    });
    dispatchCreditUpdate(response.data);
    return response.data;
  } catch (error) {
    console.error('STT failed:', error);
    throw error;
  }
};

export const generateSpeech = async (text, lang = 'hi') => {
  try {
    const response = await apiClient.post(
      '/api/tts',
      { text, lang },
      { responseType: 'blob' } // Important for audio files
    );
    return response.data;
  } catch (error) {
    console.error('TTS failed:', error);
    throw error;
  }
};

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
