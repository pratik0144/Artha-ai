import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider, useSession } from './context/SessionContext';
import { CreditProvider } from './context/CreditContext';
import { Layout } from './components/layout/Layout';
import { CreditDisplay } from './components/CreditDisplay';
import { Home } from './pages/Home';
import { Transactions } from './pages/Transactions';
import { Schemes } from './pages/Schemes';
import { Education } from './pages/Education';
import { VoiceInteraction } from './pages/VoiceInteraction';
import { Login } from './pages/Login';
import { FraudDetection } from './pages/FraudDetection';

const AppContent = () => {
  const { profile, isInitialized } = useSession();

  if (!isInitialized && !profile) {
    // SessionContext auto-logs in JD-1001 on mount.
    // While it's initializing, we can return null or a loader.
    // But if they logged out, isInitialized is false and profile is null, so show Login.
    return <Login />;
  }

  if (!profile) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="schemes" element={<Schemes />} />
          <Route path="education" element={<Education />} />
          <Route path="fraud-detection" element={<FraudDetection />} />
        </Route>
        {/* Voice is outside layout to be fullscreen overlay on mobile */}
        <Route path="/voice" element={<VoiceInteraction />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* Floating credit display widget — always visible */}
      <CreditDisplay />
    </BrowserRouter>
  );
};

function App() {
  return (
    <CreditProvider>
      <SessionProvider>
        <AppContent />
      </SessionProvider>
    </CreditProvider>
  );
}

export default App;
