import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { useSession } from '../../context/SessionContext';
import { LogOut } from 'lucide-react';

export const Layout = () => {
  const { isInitialized, profile, logout } = useSession();

  if (!isInitialized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="h2 text-primary mb-4 animate-pulse">Artha Mitra</h1>
          <p className="text-secondary">Connecting to Banking System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {/* Top bar for mobile only */}
        <header className="md:hidden flex justify-between items-center mb-6">
          <h1 className="h3 text-primary">Artha Mitra</h1>
          <div className="flex items-center gap-2">
            <button onClick={logout} className="p-1 text-secondary hover:text-error transition-colors" title="Logout">
              <LogOut size={18} />
            </button>
            <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-on-surface font-bold text-sm">
              {profile?.name?.[0] || '?'}
            </div>
          </div>
        </header>

        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};
