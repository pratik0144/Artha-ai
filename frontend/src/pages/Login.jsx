import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { User, Key, ShieldCheck } from 'lucide-react';

export const Login = () => {
  const { login, isLoading } = useSession();
  const [accountId, setAccountId] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!accountId.trim()) {
      setError('Please enter an Account ID');
      return;
    }
    setError('');
    
    // Simulate login by passing the account ID to the session context
    // The context will fetch the full profile from Supabase via /api/onboard
    const success = await login(accountId.trim());
    if (!success) {
      setError('Invalid Account ID. Please try again.');
    }
  };

  const handleQuickLogin = (id) => {
    login(id);
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-container text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="h1 text-on-surface">Digi Seva Login</h1>
          <p className="body-md text-secondary mt-2">Sign in to access your digital banking services</p>
        </div>

        <Card className="mb-6">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="label text-on-surface mb-1 block">Account ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-outline" />
                </div>
                <input
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="e.g. JD-1001"
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-md focus:outline-none focus:border-primary text-on-surface"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Note: Passwords are not required for this mock prototype */}
            <div>
              <label className="label text-on-surface mb-1 block">PIN / Password (Mock)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key size={18} className="text-outline" />
                </div>
                <input
                  type="password"
                  placeholder="Any 4-digit PIN will work"
                  className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-md focus:outline-none focus:border-primary text-on-surface"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && <p className="text-error text-sm font-medium">{error}</p>}

            <Button type="submit" disabled={isLoading} className="w-full py-3 mt-2">
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </Card>

        {/* Developer Quick Login Section */}
        <Card className="bg-primary-container/20 border border-primary/30">
          <h3 className="label text-primary uppercase mb-3 text-center">Test Accounts (Dev Only)</h3>
          
          <div className="mb-4">
            <Button 
              variant="secondary" 
              className="w-full bg-primary text-on-primary hover:bg-primary/90"
              onClick={() => handleQuickLogin('JD-1001')}
              disabled={isLoading}
            >
              Log in as Default Tester (Ramesh, JD-1001)
            </Button>
          </div>

          <div className="text-xs text-secondary mb-2 text-center font-medium">Other Available Mock Accounts:</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <button onClick={() => handleQuickLogin('JD-1002')} className="p-2 bg-surface text-left rounded border hover:border-primary transition-colors">
              <div className="font-semibold text-on-surface">JD-1002</div>
              <div className="text-xs text-secondary">Fatima Bi (Unemployed)</div>
            </button>
            <button onClick={() => handleQuickLogin('SB-2001')} className="p-2 bg-surface text-left rounded border hover:border-primary transition-colors">
              <div className="font-semibold text-on-surface">SB-2001</div>
              <div className="text-xs text-secondary">Savitha Gowda (Laborer)</div>
            </button>
            <button onClick={() => handleQuickLogin('SB-2002')} className="p-2 bg-surface text-left rounded border hover:border-primary transition-colors">
              <div className="font-semibold text-on-surface">SB-2002</div>
              <div className="text-xs text-secondary">Meera Devi (Homemaker)</div>
            </button>
            <button onClick={() => handleQuickLogin('SB-3001')} className="p-2 bg-surface text-left rounded border hover:border-primary transition-colors">
              <div className="font-semibold text-on-surface">SB-3001</div>
              <div className="text-xs text-secondary">Arjun Singh (Shop Owner)</div>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
