import React, { createContext, useContext, useState, useEffect } from 'react';
import { onboardUser, sendChatMessage, resetSession } from '../api';

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
    noInsights: "Ask Artha AI a question to see insights here.",
    quickActions: "Quick Actions",
    checkBalance: "Check Balance",
    viewAccounts: "View accounts",
    mySchemes: "My Schemes",
    active: "active",
    learnUpi: "Learn UPI",
    quickTutorial: "Quick tutorial",
    payBill: "Pay Bill",
    networkError: "Sorry, I am having trouble connecting right now. Please try again.",
    offlineMode: "Hello! Artha AI is running in offline mode. Please start the backend.",
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
    noInsights: "Artha AI se sawal puchein aur yahan jankari dekhein.",
    quickActions: "Quick Actions",
    checkBalance: "Balance Check Karein",
    viewAccounts: "Accounts dekhein",
    mySchemes: "Meri Yojna",
    active: "active",
    learnUpi: "UPI Sikhein",
    quickTutorial: "Quick tutorial",
    payBill: "Bill Bharein",
    networkError: "माफ़ करें, अभी नेटवर्क में समस्या है। कृपया फिर से कोशिश करें।",
    offlineMode: "नमस्ते! Artha AI is running in offline mode. Please start the backend.",
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
    noInsights: "ಒಳನೋಟಗಳನ್ನು ನೋಡಲು Artha AI ಅನ್ನು ಪ್ರಶ್ನೆ ಕೇಳಿ.",
    quickActions: "ತ್ವರಿತ ಕ್ರಿಯೆಗಳು",
    checkBalance: "ಬ್ಯಾಲೆನ್ಸ್ ಪರಿಶೀಲಿಸಿ",
    viewAccounts: "ಖಾತೆಗಳನ್ನು ವೀಕ್ಷಿಸಿ",
    mySchemes: "ನನ್ನ ಯೋಜನೆಗಳು",
    active: "ಸಕ್ರಿಯ",
    learnUpi: "UPI ಕಲಿಯಿರಿ",
    quickTutorial: "ತ್ವರಿತ ಟ್ಯುಟೋರಿಯಲ್",
    payBill: "ಬಿಲ್ ಪಾವತಿಸಿ",
    networkError: "ಕ್ಷಮಿಸಿ, ಈಗ ನೆಟ್‌ವರ್ಕ್‌ನಲ್ಲಿ ಸಮಸ್ಯೆಯಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    offlineMode: "ನಮಸ್ಕಾರ! Artha AI ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದೆ.",
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
  const [appLang, setAppLang] = useState('en'); // Holds the current selected language code

  // App initialization
  const initializeApp = async (lang = 'en', accountId = 'JD-1001') => {
    setIsLoading(true);
    try {
      // 1. Fetch from Mock Bank
      const bankRes = await fetch(`http://localhost:5001/account/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId })
      });

      const bankData = await bankRes.json();

      if (bankData.status !== 'success') {
        throw new Error("Invalid account ID");
      }

      const acct = bankData.data;

      const accountData = {
        account_id: acct.account_id,
        name: acct.name,
        language: lang,
        occupation: acct.occupation,
        income_bracket: acct.bpl_card ? "low" : "medium",
        has_smartphone: acct.has_smartphone,
        location: acct.location_type,
        fraud_risk: acct.fraud_history ? "high" : "low",
        eligible_schemes: acct.linked_schemes || []
      };

      const result = await onboardUser(accountData);

      if (result.status === 'success') {
        setProfile(result.profile);
        setSchemes(result.eligible_schemes);
        setActiveAgents(result.active_agents);
        setIsInitialized(true);
        setAppLang(lang);

        // Add initial greeting to history
        setHistory([
          { role: 'assistant', content: result.greeting, agent: 'greeting' }
        ]);
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

  const sendMessage = async (messageText) => {
    if (!messageText.trim() || !profile) return;

    // Add user message to UI immediately
    const userMsg = { role: 'user', content: messageText };
    setHistory(prev => [...prev, userMsg]);
    setIsLoading(true);
    setLatestFraudAlert(null);

    try {
      const result = await sendChatMessage(profile.account_id, messageText);

      if (result.status === 'success') {
        // If fraud was triggered, handle it prominently
        if (result.fraud_triggered) {
          const alertData = {
            id: Date.now(),
            warning: result.response,
            intent: result.intent_detected,
            timestamp: new Date().toISOString()
          };
          setLatestFraudAlert(alertData);
          setFraudHistory(prev => [alertData, ...prev]);
        }

        // Add assistant response
        const asstMsg = {
          role: 'assistant',
          content: result.response,
          agent: result.agent_used,
          model: result.model_used,
          intent: result.intent_detected,
          fraud_triggered: result.fraud_triggered
        };

        setHistory(prev => [...prev, asstMsg]);
        return result;
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
