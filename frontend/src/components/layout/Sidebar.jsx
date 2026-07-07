import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, IndianRupee, FileText, BookOpen, Mic, LogOut, ShieldAlert } from 'lucide-react';
import { useSession } from '../../context/SessionContext';

export const Sidebar = () => {
  const { profile, t, logout } = useSession();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen border-r border-surface-variant bg-surface-container-low sticky top-0">
      <div className="p-6 border-b border-surface-variant">
        <h1 className="h3 text-primary">Artha AI</h1>
        <p className="body-sm text-secondary mt-1">
          {profile ? `${t.hello}, ${profile.name}` : 'Loading...'}
        </p>
      </div>

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
