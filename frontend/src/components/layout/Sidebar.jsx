import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, IndianRupee, FileText, BookOpen, Mic, LogOut, ShieldAlert, Heart } from 'lucide-react';
import { useSession } from '../../context/SessionContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Circular progress ring for the health score
const ScoreRing = ({ score, grade, size = 56 }) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--surface-variant)" strokeWidth="4" />
      <circle
        cx={size/2} cy={size/2} r={radius} fill="none"
        stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - progress}
        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
      />
      <text
        x={size/2} y={size/2}
        textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="13" fontWeight="700"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
      >
        {grade}
      </text>
    </svg>
  );
};

export const Sidebar = () => {
  const { profile, t, logout, appLang } = useSession();
  const [healthScore, setHealthScore] = useState(null);

  // Fetch health score when profile is available
  useEffect(() => {
    if (!profile?.account_id) return;
    const fetchScore = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/status?type=health-score&account_id=${profile.account_id}`);
        const data = await res.json();
        if (data.status === 'success') setHealthScore(data);
      } catch { /* non-critical */ }
    };
    fetchScore();
  }, [profile?.account_id]);

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen border-r border-surface-variant bg-surface-container-low sticky top-0">
      <div className="p-6 border-b border-surface-variant">
        <h1 className="h3 text-primary">Artha Mitra</h1>
        <p className="body-sm text-secondary mt-1">
          {profile ? `${t.hello}, ${profile.name}` : 'Loading...'}
        </p>
      </div>

      {/* Financial Health Score Badge */}
      {healthScore && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-surface-container border border-surface-variant">
          <div className="flex items-center gap-3">
            <ScoreRing score={healthScore.score} grade={healthScore.grade} />
            <div className="flex-1 min-w-0">
              <p className="label text-on-surface text-xs font-bold uppercase tracking-wide">
                <Heart size={12} className="inline mr-1" style={{ color: healthScore.score >= 75 ? '#22c55e' : healthScore.score >= 50 ? '#f59e0b' : '#ef4444' }} />
                {appLang === 'hi' ? 'वित्तीय स्वास्थ्य' : appLang === 'kn' ? 'ಆರ್ಥಿಕ ಆರೋಗ್ಯ' : 'Financial Health'}
              </p>
              <p className="text-2xl font-black" style={{ color: healthScore.score >= 75 ? '#22c55e' : healthScore.score >= 50 ? '#f59e0b' : '#ef4444' }}>
                {healthScore.score}<span className="text-xs font-normal text-secondary">/100</span>
              </p>
            </div>
          </div>
          {healthScore.driver && (
            <p className="text-xs text-secondary mt-2 leading-relaxed">
              {healthScore.driver[appLang] || healthScore.driver.en}
            </p>
          )}
        </div>
      )}

      <nav className="flex-1 p-4 flex flex-col gap-2">
        <NavLink
          to="/"
          className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-md font-semibold transition-colors ${isActive ? 'bg-primary-container text-on-primary-container' : 'text-on-surface hover:bg-surface-container'}`}
        >
          <Home size={20} />
          <span>{t.dashboard}</span>
        </NavLink>

        <NavLink
          to="/transactions"
          className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-md font-semibold transition-colors ${isActive ? 'bg-primary-container text-on-primary-container' : 'text-on-surface hover:bg-surface-container'}`}
        >
          <IndianRupee size={20} />
          <span>{t.transactions}</span>
        </NavLink>

        <NavLink
          to="/schemes"
          className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-md font-semibold transition-colors ${isActive ? 'bg-primary-container text-on-primary-container' : 'text-on-surface hover:bg-surface-container'}`}
        >
          <FileText size={20} />
          <span>{t.schemes}</span>
        </NavLink>

        <NavLink
          to="/education"
          className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-md font-semibold transition-colors ${isActive ? 'bg-primary-container text-on-primary-container' : 'text-on-surface hover:bg-surface-container'}`}
        >
          <BookOpen size={20} />
          <span>{t.literacy}</span>
        </NavLink>

        <NavLink
          to="/fraud-detection"
          className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-md font-semibold transition-colors ${isActive ? 'bg-primary-container text-on-primary-container' : 'text-on-surface hover:bg-surface-container'}`}
        >
          <ShieldAlert size={20} className="text-error" />
          <span>{t.fraudDetection || 'Fraud Detection'}</span>
        </NavLink>

        <div className="mt-8 px-4">
          <p className="label text-secondary uppercase mb-2">Actions</p>
          <NavLink
            to="/voice"
            className="flex items-center gap-3 px-4 py-3 rounded-full font-semibold bg-primary text-on-primary hover:opacity-90 shadow-md transition-opacity"
          >
            <Mic size={20} />
            <span>{t.voiceAssistant}</span>
          </NavLink>
        </div>
      </nav>

      <div className="p-4 border-t border-surface-variant flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface font-bold">
            {profile?.name?.[0] || '?'}
          </div>
          <div>
            <p className="label">{profile?.name || 'User'}</p>
            <p className="text-xs text-secondary">{profile?.account_id || '---'}</p>
          </div>
        </div>
        <button onClick={logout} className="p-2 text-secondary hover:text-error transition-colors" title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};
