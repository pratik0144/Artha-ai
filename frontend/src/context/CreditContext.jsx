import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getCredits } from '../api';

const CreditContext = createContext();

export const useCredits = () => useContext(CreditContext);

const DEFAULT_STATE = {
  totalCredits: 50,
  usedCredits: 0,
  activeKeyIndex: 0,
  keyStatuses: [
    { active: true, calls: 0 },
    { active: true, calls: 0 },
    { active: true, calls: 0 },
  ],
  isLow: false,
  isCritical: false,
  lastUpdated: null,
};

export const CreditProvider = ({ children }) => {
  const [creditState, setCreditState] = useState(DEFAULT_STATE);
  const [isPulsing, setIsPulsing] = useState(false);
  const pulseTimeoutRef = useRef(null);

  // Update credits from API response data
  const updateCredits = useCallback((data) => {
    if (!data) return;

    setIsPulsing(true);
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = setTimeout(() => setIsPulsing(false), 1000);

    setCreditState((prev) => {
      const totalCredits = data.total_credits ?? prev.totalCredits;
      const usedCredits = data.credits_used ?? prev.usedCredits;
      const remaining = totalCredits - usedCredits;
      const activeKeyIndex = data.active_key_index ?? prev.activeKeyIndex;
      const keyStatuses = data.key_statuses ?? prev.keyStatuses;

      return {
        totalCredits,
        usedCredits,
        activeKeyIndex,
        keyStatuses,
        isLow: remaining <= 10 && remaining > 3,
        isCritical: remaining <= 3,
        lastUpdated: Date.now(),
      };
    });
  }, []);

  // Poll credits from the GET /api/credits endpoint
  const refreshCredits = useCallback(async (sessionId) => {
    try {
      const data = await getCredits(sessionId);
      if (data) {
        updateCredits(data);
      }
    } catch (err) {
      console.warn('Failed to refresh credits:', err);
    }
  }, [updateCredits]);

  // Reset credits (e.g., on new session)
  const resetCredits = useCallback(() => {
    setCreditState(DEFAULT_STATE);
  }, []);

  // Listen for custom credit-update events dispatched by the API client
  useEffect(() => {
    const handler = (e) => {
      if (e.detail) {
        updateCredits(e.detail);
      }
    };
    window.addEventListener('credit-update', handler);
    return () => window.removeEventListener('credit-update', handler);
  }, [updateCredits]);

  // Cleanup pulse timeout on unmount
  useEffect(() => {
    return () => {
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    };
  }, []);

  const remaining = creditState.totalCredits - creditState.usedCredits;

  return (
    <CreditContext.Provider
      value={{
        ...creditState,
        remaining,
        isPulsing,
        updateCredits,
        refreshCredits,
        resetCredits,
      }}
    >
      {children}
    </CreditContext.Provider>
  );
};
