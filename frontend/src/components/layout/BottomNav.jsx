import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, IndianRupee, FileText, BookOpen, Mic, ShieldAlert } from 'lucide-react';

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-container-lowest border-t border-surface-variant flex justify-around items-center h-20 px-2 pb-4 pt-2 md:hidden z-50">
      <NavLink 
        to="/" 
        className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-secondary'}`}
      >
        <Home size={24} />
        <span className="text-[10px] font-semibold">Home</span>
      </NavLink>

      <NavLink 
        to="/transactions" 
        className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-secondary'}`}
      >
        <IndianRupee size={24} />
        <span className="text-[10px] font-semibold">History</span>
      </NavLink>

      {/* Voice Button is Central and Prominent */}
      <NavLink 
        to="/voice" 
        className="flex flex-col items-center justify-center -mt-6"
      >
        <div className="bg-primary text-on-primary w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-4 border-surface-container-lowest">
          <Mic size={28} />
        </div>
      </NavLink>

      <NavLink 
        to="/schemes" 
        className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-secondary'}`}
      >
        <FileText size={24} />
        <span className="text-[10px] font-semibold">Schemes</span>
      </NavLink>

      <NavLink 
        to="/fraud-detection" 
        className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-error' : 'text-secondary'}`}
      >
        <ShieldAlert size={24} />
        <span className="text-[10px] font-semibold">Fraud</span>
      </NavLink>

      <NavLink 
        to="/education" 
        className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-secondary'}`}
      >
        <BookOpen size={24} />
        <span className="text-[10px] font-semibold">Learn</span>
      </NavLink>
    </nav>
  );
};
