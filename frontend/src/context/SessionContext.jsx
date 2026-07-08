import React, { createContext, useContext, useState, useEffect } from 'react';
import { onboardUser, sendChatMessage, resetSession, getFraudHistory } from '../api';

const SessionContext = createContext();

export const useSession = () => useContext(SessionContext);

// Hardcoded for demo purposes as per backend tests
const DEFAULT_ACCOUNT = {
  account_id: "JD-1001",
  name: "Ramesh",
  language: "en", // Default to English as requested
  occupation: "farmer",
  income_bracket: "low",
  has_smartphone: false,
  location: "village",
  fraud_risk: "high",
  eligible_schemes: ["PM-KISAN"]
};

// Global UI Dictionary
export const UI_DICT = {
  en: {
    dashboard: "Dashboard",
    transactions: "Transactions",
    schemes: "Government Schemes",
    literacy: "Financial Literacy",
    fraudDetection: "Fraud Detection",
    voiceAssistant: "Voice Assistant",
    hello: "Hello",
    heroText: "Tap the microphone or type below to check your balance, review transactions, or ask about schemes.",
    startVoice: "Start Voice Assistant",
    quickChat: "Quick Chat",
    typeQuestion: "Type your question...",
    recentInsights: "Recent Insights",
    noInsights: "Ask Artha Mitra a question to see insights here.",
    quickActions: "Quick Actions",
    checkBalance: "Check Balance",
    viewAccounts: "View accounts",
    mySchemes: "My Schemes",
    active: "active",
    learnUpi: "Learn UPI",
    quickTutorial: "Quick tutorial",
    payBill: "Pay Bill",
    networkError: "Sorry, I am having trouble connecting right now. Please try again.",
    offlineMode: "Hello! Artha Mitra is running in offline mode. Please start the backend.",
    greeting: "Session cleared. How can I help you?",
  },
  hi: {
    dashboard: "Dashboard",
    transactions: "Transactions",
    schemes: "Sarkari Yojna",
    literacy: "Financial Siksha",
    fraudDetection: "Dhokhadhadi Bachav",
    voiceAssistant: "Voice Assistant",
    hello: "Namaste",
    heroText: "Microphone dabayein ya niche type karein apna balance, transactions, ya schemes ke baare mein janne ke liye.",
    startVoice: "Voice Assistant Shuru Karein",
    quickChat: "Quick Chat",
    typeQuestion: "Apna sawal likhein...",
    recentInsights: "Taza Jaankari",
    noInsights: "Artha Mitra se sawal puchein aur yahan jankari dekhein.",
    quickActions: "Quick Actions",
    checkBalance: "Balance Check Karein",
    viewAccounts: "Accounts dekhein",
    mySchemes: "Meri Yojna",
    active: "active",
    learnUpi: "UPI Sikhein",
    quickTutorial: "Quick tutorial",
    payBill: "Bill Bharein",
    networkError: "माफ़ करें, अभी नेटवर्क में समस्या है। कृपया फिर से कोशिश करें।",
    offlineMode: "नमस्ते! Artha Mitra is running in offline mode. Please start the backend.",
    greeting: "Session clear ho gaya. Main aapki kaise madad kar sakta hoon?",
  },
  kn: {
    dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    transactions: "ವಹಿವಾಟುಗಳು",
    schemes: "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು",
    literacy: "ಹಣಕಾಸು ಸಾಕ್ಷರತೆ",
    fraudDetection: "ವಂಚನೆ ಪತ್ತೆ",
    voiceAssistant: "ಧ್ವನಿ ಸಹಾಯಕಿ",
    hello: "ನಮಸ್ಕಾರ",
    heroText: "ನಿಮ್ಮ ಬ್ಯಾಲೆನ್ಸ್, ವಹಿವಾಟುಗಳು ಅಥವಾ ಯೋಜನೆಗಳ ಬಗ್ಗೆ ಕೇಳಲು ಮೈಕ್ರೊಫೋನ್ ಟ್ಯಾಪ್ ಮಾಡಿ ಅಥವಾ ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ.",
    startVoice: "ಧ್ವನಿ ಸಹಾಯಕಿ ಪ್ರಾರಂಭಿಸಿ",
    quickChat: "ತ್ವರಿತ ಚಾಟ್",
    typeQuestion: "ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ...",
    recentInsights: "ಇತ್ತೀಚಿನ ಒಳನೋಟಗಳು",
    noInsights: "ಒಳನೋಟಗಳನ್ನು ನೋಡಲು Artha Mitra ಅನ್ನು ಪ್ರಶ್ನೆ ಕೇಳಿ.",
    quickActions: "ತ್ವರಿತ ಕ್ರಿಯೆಗಳು",
    checkBalance: "ಬ್ಯಾಲೆನ್ಸ್ ಪರಿಶೀಲಿಸಿ",
    viewAccounts: "ಖಾತೆಗಳನ್ನು ವೀಕ್ಷಿಸಿ",
    mySchemes: "ನನ್ನ ಯೋಜನೆಗಳು",
    active: "ಸಕ್ರಿಯ",
    learnUpi: "UPI ಕಲಿಯಿರಿ",
    quickTutorial: "ತ್ವರಿತ ಟ್ಯುಟೋರಿಯಲ್",
    payBill: "ಬಿಲ್ ಪಾವತಿಸಿ",
    networkError: "ಕ್ಷಮಿಸಿ, ಈಗ ನೆಟ್‌ವರ್ಕ್‌ನಲ್ಲಿ ಸಮಸ್ಯೆಯಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    offlineMode: "ನಮಸ್ಕಾರ! Artha Mitra ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದೆ.",
    greeting: "ಸೆಶನ್ ತೆರವುಗೊಳಿಸಲಾಗಿದೆ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
  }
};

export const SessionProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [schemes, setSchemes] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeAgents, setActiveAgents] = useState([]);
  const [latestFraudAlert, setLatestFraudAlert] = useState(null);
  const [fraudHistory, setFraudHistory] = useState([]);
  const [liveRiskLevel, setLiveRiskLevel] = useState('low');
  const [appLang, setAppLang] = useState('en'); // Holds the current selected language code

  const asText = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(', ');
    if (typeof value === 'object') {
      return value.name || value.title || value.benefits || value.description || JSON.stringify(value);
    }
    return String(value);
  };

  const fetchFraudHistory = async (accountId) => {
    try {
      const result = await getFraudHistory(accountId);
      if (result && result.status === 'success') {
        setFraudHistory(result.alerts);
        setLiveRiskLevel(result.risk_level);
        return result;
      }
    } catch (error) {
      console.error("Failed to fetch fraud history", error);
    }
  };

  // App initialization
  const initializeApp = async (lang = 'en', accountId = 'JD-1001') => {
    setIsLoading(true);
    try {
      const result = await onboardUser({ account_id: accountId, language: lang });

      if (result.status === 'success') {
        setProfile(result.profile);
        setSchemes(result.eligible_schemes);
        setActiveAgents(result.active_agents);
        setIsInitialized(true);
        setAppLang(lang);

        // Fetch real-time live fraud history
        await fetchFraudHistory(accountId);

        // Add initial greeting to history, followed by RM nudges (if any)
        const initialHistory = [
          { role: 'assistant', content: result.greeting, agent: 'greeting' }
        ];
        // Inject proactive nudges from the AI Relationship Manager
        if (result.rm_nudges && result.rm_nudges.length > 0) {
          for (const nudge of result.rm_nudges) {
            initialHistory.push({
              role: 'assistant',
              content: nudge,
              agent: 'relationship-manager'
            });
          }
        }
        setHistory(initialHistory);
        return true;
      }
    } catch (error) {
      console.error("Failed to initialize session", error);
      return false;
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  const login = async (accountId) => {
    return await initializeApp(appLang, accountId);
  };

  const logout = () => {
    setProfile(null);
    setHistory([]);
    setFraudHistory([]);
    setLiveRiskLevel('low');
    setIsInitialized(false);
  };

  useEffect(() => {
    // Auto-login the default tester

    initializeApp('en', 'JD-1001');
  }, []);

  const changeLanguage = async (newLang) => {
    if (newLang === appLang) return;
    setAppLang(newLang);
    // Re-onboard the user to update the backend orchestrator
    await initializeApp(newLang);
  };

  const sendMessage = async (messageText, language = null) => {
    if (!messageText.trim() || !profile) return;

    // Check session message limit (max 30 queries)
    const sessionKey = `artha_session_msg_count_${profile.account_id}`;
    const currentCount = parseInt(sessionStorage.getItem(sessionKey) || '0', 10);
    const limit = 30;

    if (currentCount >= limit) {
      const errorContent = 
        appLang === 'hi' ? `⚠️ सत्र संदेश सीमा समाप्त (अधिकतम ${limit} प्रश्न)। कृपया अपना सत्र रीसेट करें।` :
        appLang === 'kn' ? `⚠️ ಸೆಷನ್ ಸಂದೇಶ ಮಿತಿ ತಲುಪಿದೆ (ಗರಿಷ್ಠ ${limit} ಪ್ರಶ್ನೆಗಳು). ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸೆಷನ್ ಮರುಹೊಂದಿಸಿ.` :
        `⚠️ Session query limit reached (max ${limit} queries). Please reset your session.`;

      const userMsg = { role: 'user', content: messageText };
      const limitNotice = {
        role: 'assistant',
        content: errorContent,
        agent: 'system'
      };
      setHistory(prev => [...prev, userMsg, limitNotice]);
      return null;
    }

    // Add user message to UI immediately
    const userMsg = { role: 'user', content: messageText };
    setHistory(prev => [...prev, userMsg]);
    setIsLoading(true);
    setLatestFraudAlert(null);

    try {
      const result = await sendChatMessage(profile.account_id, messageText, language || appLang);

      if (result.status === 'success') {
        // Increment message count on success
        sessionStorage.setItem(sessionKey, (currentCount + 1).toString());

        // If fraud was triggered, handle it prominently
        if (result.fraud_triggered) {
          const alertData = {
            id: Date.now(),
            warning: result.response,
            intent: result.intent_detected,
            timestamp: new Date().toISOString()
          };
          setLatestFraudAlert(alertData);
          await fetchFraudHistory(profile.account_id);
        }

        // Add assistant response
        const asstMsg = {
          role: 'assistant',
          content: asText(result.response),
          agent: result.agent_used,
          model: result.model_used,
          intent: result.intent_detected,
          fraud_triggered: result.fraud_triggered
        };

        setHistory(prev => [...prev, asstMsg]);
        return {
          ...result,
          response: asText(result.response),
        };
      }
    } catch (error) {
      console.error("Error sending message", error);

      const t = UI_DICT[appLang] || UI_DICT['en'];
      const errorMsg = {
        role: 'assistant',
        content: t.networkError,
        agent: 'system'
      };
      setHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSession = async () => {
    if (profile) {
      await resetSession(profile.account_id);
      const sessionKey = `artha_session_msg_count_${profile.account_id}`;
      sessionStorage.removeItem(sessionKey);
      const t = UI_DICT[appLang] || UI_DICT['en'];
      setHistory([{ role: 'assistant', content: t.greeting, agent: 'greeting' }]);
      setLatestFraudAlert(null);
    }
  };

  const t = UI_DICT[appLang] || UI_DICT['en']; // Quick access variable for the provider

  return (
    <SessionContext.Provider value={{
      profile,
      schemes,
      history,
      isLoading,
      isInitialized,
      activeAgents,
      latestFraudAlert,
      appLang,
      fraudHistory,
      liveRiskLevel,
      fetchFraudHistory,
      t, // Provide the translated dictionary directly to components
      changeLanguage,
      sendMessage,
      clearSession,
      login,
      logout,
      dismissFraudAlert: () => setLatestFraudAlert(null)
    }}>
      {children}
    </SessionContext.Provider>
  );
};
