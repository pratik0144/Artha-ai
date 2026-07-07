import React from 'react';
import { useSession } from '../context/SessionContext';
import { ShieldAlert, AlertTriangle, ShieldCheck, Shield } from 'lucide-react';

export const FraudDetection = () => {
  const { profile, fraudHistory = [], t } = useSession();

  const getRiskColor = (risk) => {
    switch(risk?.toLowerCase()) {
      case 'high': return 'text-error bg-error-container';
      case 'medium': return 'text-tertiary bg-tertiary-container text-on-tertiary-container';
      case 'low': return 'text-primary bg-primary-container';
      default: return 'text-secondary bg-surface-variant';
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="h2 text-primary flex items-center gap-3">
          <ShieldAlert size={32} />
          {t.fraudDetection || 'Fraud Detection'}
        </h1>
        <p className="body-lg text-secondary mt-2">
          Monitor your account security and review AI-detected suspicious activities.
        </p>
      </header>

      {/* Risk Profile Card */}
      <div className="card-elevated mb-8 flex items-center justify-between">
        <div>
          <h2 className="label text-secondary uppercase tracking-wider mb-1">Account Risk Profile</h2>
          <p className="h3">
            {profile?.name}
          </p>
        </div>
        <div className={`px-4 py-2 rounded-full flex items-center gap-2 font-bold ${getRiskColor(profile?.fraud_risk)}`}>
          {profile?.fraud_risk === 'high' ? <AlertTriangle size={20} /> : <ShieldCheck size={20} />}
          {profile?.fraud_risk?.toUpperCase() || 'UNKNOWN'} RISK
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: History */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="h3 text-primary">Recent Alerts History</h2>
          
          {fraudHistory.length === 0 ? (
            <div className="card text-center py-12">
              <Shield size={48} className="mx-auto text-secondary opacity-50 mb-4" />
              <p className="body-lg font-semibold text-on-surface">No suspicious activity detected</p>
              <p className="text-secondary mt-2">Your account is currently secure. We will notify you if Artha AI detects any scams during your conversations.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {fraudHistory.map((alert) => (
                <div key={alert.id} className="card border-error">
                  <div className="flex items-start gap-4">
                    <div className="bg-error-container text-on-error-container p-3 rounded-full flex-shrink-0">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-error capitalize">{alert.intent.replace(/_/g, ' ')}</h3>
                        <span className="text-xs text-secondary">{new Date(alert.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="body-md text-on-surface">{alert.warning}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Report */}
        <div className="space-y-6">
          <div className="card bg-surface-container-high">
            <h2 className="h3 text-primary mb-4">Report Activity</h2>
            <p className="body-sm text-secondary mb-6">
              Did you receive a suspicious call or message? Report it here to help protect the community.
            </p>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Report submitted successfully."); }}>
              <div>
                <label className="block label text-secondary mb-1">Phone Number or UPI ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. +91 9876543210" 
                  className="w-full bg-surface p-3 rounded-md border border-outline focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block label text-secondary mb-1">Details</label>
                <textarea 
                  placeholder="What happened?" 
                  rows="4"
                  className="w-full bg-surface p-3 rounded-md border border-outline focus:border-primary focus:outline-none resize-none"
                ></textarea>
              </div>
              <button type="submit" className="btn-primary w-full justify-center">
                Submit Report
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
