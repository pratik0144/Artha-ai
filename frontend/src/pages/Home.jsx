import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AlertBanner } from '../components/ui/AlertBanner';
import { useSession } from '../context/SessionContext';
import {
  Mic, ArrowRight, ShieldAlert, Sparkles, Send, Globe,
  Bell, Landmark, TrendingUp, CalendarClock, AlertTriangle,
  CheckCircle2, PiggyBank, Wallet, Volume2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

export const Home = () => {
  const { profile, latestFraudAlert, dismissFraudAlert, history, sendMessage, isLoading, t, appLang, changeLanguage } = useSession();
  const navigate = useNavigate();
  const { speak, stop, isSpeaking } = useSpeechSynthesis();
  const [textInput, setTextInput] = useState('');

  // --- Live data states ---
  const [installments, setInstallments] = useState([]);
  const [loans, setLoans] = useState([]);
  const [spending, setSpending] = useState(null);
  const [fixedDeposits, setFixedDeposits] = useState([]);
  const [eligibleSchemes, setEligibleSchemes] = useState([]);
  const [budgetInput, setBudgetInput] = useState('');

  const asText = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(', ');
    if (typeof value === 'object') {
      return value.name || value.title || value.benefits || value.description || JSON.stringify(value);
    }
    return String(value);
  };

  // --- Fetch live data on mount ---
  useEffect(() => {
    if (!profile?.account_id) return;
    const id = profile.account_id;

    // Installments
    fetch(`/api/installments?account_id=${id}`)
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setInstallments(d.installments); })
      .catch(() => { });

    // Loans
    fetch(`/api/loans?account_id=${id}`)
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setLoans(d.loans); })
      .catch(() => { });

    // Spending
    fetch(`/api/spending?account_id=${id}`)
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setSpending(d); })
      .catch(() => { });

    // Fixed Deposits
    fetch(`/api/fixed_deposits?account_id=${id}`)
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setFixedDeposits(d.fixed_deposits || []); })
      .catch(() => { });

    // Eligible schemes (not-yet-enrolled)
    fetch(`/api/eligible_schemes?account_id=${id}`)
      .then(r => r.json())
      .then(d => { if (d.status === 'success') setEligibleSchemes(d.eligible_schemes || []); })
      .catch(() => { });
  }, [profile]);

  const handleSend = (e) => {
    e.preventDefault();
    if (textInput.trim()) {
      sendMessage(textInput);
      setTextInput('');
    }
  };

  const handleSetBudget = async () => {
    const val = parseFloat(budgetInput);
    if (isNaN(val) || val <= 0) return;
    try {
      const res = await fetch(`/api/spending/limit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: profile.account_id, limit: val }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        // Refresh spending data
        const refreshRes = await fetch(`/api/spending?account_id=${profile.account_id}`);
        const refreshData = await refreshRes.json();
        if (refreshData.status === 'success') setSpending(refreshData);
        setBudgetInput('');
      }
    } catch (e) { console.error(e); }
  };

  // Get last few assistant messages that are not greetings
  const recentInsights = history
    .filter(msg => msg.role === 'assistant' && msg.agent !== 'greeting')
    .slice(-3)
    .reverse();

  const overdueInstallments = installments.filter(i => i.status === 'overdue');
  const activeLoans = loans.filter(l => l.status === 'active');

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full relative">

      {/* Top right language toggle */}
      <div className="absolute -top-4 right-0 z-50">
        <div className="bg-surface-container-low border border-outline-variant rounded-full flex items-center px-3 py-1 shadow-sm">
          <Globe size={16} className="text-primary mr-2" />
          <select
            value={appLang}
            onChange={(e) => changeLanguage(e.target.value)}
            className="bg-transparent text-primary body-sm font-semibold focus:outline-none cursor-pointer"
            disabled={isLoading}
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="kn">ಕನ್ನಡ</option>
          </select>
        </div>
      </div>

      {latestFraudAlert && (
        <AlertBanner
          type="fraud"
          title="⚠️ Fraud Alert Detected"
          message={latestFraudAlert.warning}
          onDismiss={dismissFraudAlert}
        />
      )}

      {/* Hero / Voice Prompt Section */}
      <Card elevated className="bg-primary-container text-on-primary-container border-none relative overflow-hidden mt-6">
        <div className="relative z-10 py-6 md:py-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-surface text-primary rounded-full flex items-center justify-center mb-6 shadow-lg animate-pulse">
            <Mic size={40} />
          </div>
          <h2 className="h2 mb-2">{t.hello}, {profile?.name}</h2>
          <p className="body-md opacity-90 max-w-md">
            {t.heroText}
          </p>

          <Button
            variant="secondary"
            className="mt-8 bg-surface text-primary border-surface hover:bg-surface-variant hover:text-primary"
            onClick={() => navigate('/voice')}
          >
            {t.startVoice}
          </Button>
        </div>
      </Card>

      {/* ======= OVERDUE INSTALLMENT ALERTS ======= */}
      {overdueInstallments.length > 0 && (
        <div className="bg-error-container border border-error/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={24} className="text-error shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-on-error-container mb-1">
              {overdueInstallments.length} Overdue Payment{overdueInstallments.length > 1 ? 's' : ''}
            </h3>
            {overdueInstallments.map((inst, i) => (
              <p key={i} className="text-sm text-on-error-container/80">
                • {inst.type} — ₹{inst.amount.toLocaleString('en-IN')} (Due: {inst.due_date})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ======= SCHEME NOTIFICATIONS ======= */}
      {eligibleSchemes.length > 0 && (
        <Card className="border-l-4 border-l-primary">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={18} className="text-primary" />
            <h3 className="label text-primary uppercase">New Schemes Available For You</h3>
          </div>
          <div className="flex flex-col gap-2">
            {eligibleSchemes.slice(0, 3).map((scheme, i) => (
              <div key={i} className="flex items-center justify-between bg-primary-container/30 rounded-lg p-3">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{asText(scheme.name)}</p>
                  <p className="text-xs text-secondary">{asText(scheme.benefit_amount)}</p>
                </div>
                <button
                  onClick={() => sendMessage(`Tell me about ${asText(scheme.name)}`)}
                  className="text-xs bg-primary text-on-primary px-3 py-1.5 rounded-full font-semibold hover:opacity-90 transition-opacity"
                >
                  Ask AI
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Text Fallback Chat */}
      <Card className="flex flex-col">
        <h3 className="label text-secondary uppercase mb-4">{t.quickChat}</h3>
        <div className="flex-1 min-h-[150px] mb-4 bg-surface-container-lowest p-4 rounded-md border border-surface-variant overflow-y-auto max-h-[300px]">
          {history.slice(-4).map((msg, idx) => (
            <div key={idx} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-primary text-on-primary rounded-tr-sm' : (msg.fraud_triggered ? 'bg-error-container text-on-error-container rounded-tl-sm border border-error' : 'bg-surface-container text-on-surface rounded-tl-sm')}`}>
                <p className="body-sm">{msg.content}</p>
                {msg.role === 'assistant' && msg.agent && (
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-[10px] opacity-70 uppercase tracking-wider font-bold">
                      {msg.fraud_triggered ? <ShieldAlert size={10} className="inline mr-1" /> : <Sparkles size={10} className="inline mr-1" />}
                      {msg.agent.replace('_', ' ')}
                    </p>
                    <button
                      onClick={() => {
                        if (isSpeaking) { stop(); return; }
                        speak(msg.content, appLang || 'en', { rate: appLang === 'en' ? 1.0 : 0.9 });
                      }}
                      className="ml-2 p-1 rounded-full hover:bg-surface-variant/40 transition-colors"
                      title="Listen to this message"
                    >
                      <Volume2 size={12} className={isSpeaking ? 'animate-pulse text-primary' : 'opacity-60'} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-surface-container text-on-surface p-3 rounded-xl rounded-tl-sm">
                <p className="body-sm animate-pulse">...</p>
              </div>
            </div>
          )}
        </div>
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={t.typeQuestion}
            className="flex-1 bg-surface-container-low border border-outline-variant rounded-full px-4 py-3 focus:outline-none focus:border-primary body-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !textInput.trim()}
            className="bg-primary text-on-primary w-12 h-12 rounded-full flex items-center justify-center disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </form>
      </Card>

      {/* ======= FEATURE CARDS GRID ======= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── Installment Reminders Card ── */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock size={18} className="text-primary" />
            <h3 className="label text-secondary uppercase">Upcoming Payments</h3>
          </div>
          {installments.length > 0 ? (
            <div className="flex flex-col gap-2">
              {installments.map((inst, i) => (
                <div key={i} className={`flex justify-between items-center p-3 rounded-lg border ${inst.status === 'overdue' ? 'bg-error-container/30 border-error/30' : 'bg-surface-container-low border-surface-variant'}`}>
                  <div>
                    <p className="font-semibold text-sm">{inst.type}</p>
                    <p className="text-xs text-secondary">{inst.due_date} • {inst.frequency}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">₹{inst.amount.toLocaleString('en-IN')}</p>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${inst.status === 'overdue' ? 'bg-error text-on-primary' : 'bg-primary-container text-primary'}`}>
                      {inst.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="body-sm text-secondary">No upcoming payments 🎉</p>
          )}
          <button
            onClick={() => sendMessage("Show my installments and reminders")}
            className="mt-3 text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
          >
            Ask AI about reminders <ArrowRight size={12} />
          </button>
        </Card>

        {/* ── Active Loans Card ── */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Landmark size={18} className="text-primary" />
            <h3 className="label text-secondary uppercase">Active Loans</h3>
          </div>
          {activeLoans.length > 0 ? (
            <div className="flex flex-col gap-3">
              {activeLoans.map((loan, i) => (
                <div key={i} className="p-3 bg-surface-container-low rounded-lg border border-surface-variant">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-sm">{loan.loan_type}</p>
                      <p className="text-xs text-secondary">{loan.bank_name}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-primary-container text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={10} /> {loan.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center bg-surface-container rounded-md p-2">
                    <div>
                      <p className="text-[10px] text-secondary uppercase">Outstanding</p>
                      <p className="font-bold text-sm text-error">₹{loan.outstanding.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-secondary uppercase">EMI</p>
                      <p className="font-bold text-sm">₹{loan.emi_amount.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-secondary uppercase">Interest</p>
                      <p className="font-bold text-sm">{loan.interest_rate}%</p>
                    </div>
                  </div>
                  <p className="text-xs text-secondary mt-2">{loan.remaining_emis} EMIs remaining • Started {loan.start_date}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="body-sm text-secondary">No active loans ✨</p>
              <p className="text-xs text-secondary mt-1">You're debt-free!</p>
            </div>
          )}
          <button
            onClick={() => sendMessage("Show my loan details")}
            className="mt-3 text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
          >
            Ask AI about loans <ArrowRight size={12} />
          </button>
        </Card>

        {/* ── Fixed Deposits Card ── */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={18} className="text-primary" />
            <h3 className="label text-secondary uppercase">Fixed Deposits</h3>
          </div>
          {fixedDeposits.length > 0 ? (
            <div className="flex flex-col gap-3">
              {fixedDeposits.map((fd, i) => (
                <div key={i} className="p-3 bg-surface-container-low rounded-lg border border-surface-variant">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-sm">FD-{fd.fd_id.slice(-4)}</p>
                      <p className="text-xs text-secondary">{fd.duration_months} Months</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-primary-container text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={10} /> {fd.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center bg-surface-container rounded-md p-2">
                    <div>
                      <p className="text-[10px] text-secondary uppercase">Principal</p>
                      <p className="font-bold text-sm">₹{fd.principal.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-secondary uppercase">Interest</p>
                      <p className="font-bold text-sm text-primary">+{fd.interest_rate}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-secondary uppercase">Maturity</p>
                      <p className="font-bold text-sm text-primary">₹{fd.maturity_amount.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <p className="text-xs text-secondary mt-2">Matures on {fd.maturity_date}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="body-sm text-secondary">No fixed deposits yet 📈</p>
              <p className="text-xs text-secondary mt-1">Invest and watch your money grow!</p>
            </div>
          )}
          <button
            onClick={() => sendMessage("I want to create a fixed deposit")}
            className="mt-3 text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
          >
            Ask AI to invest <ArrowRight size={12} />
          </button>
        </Card>

        {/* ── Smart Spending Tracker ── */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <PiggyBank size={18} className="text-primary" />
            <h3 className="label text-secondary uppercase">Smart Spending</h3>
          </div>
          {spending && spending.monthly_limit > 0 ? (
            <div>
              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-secondary">Spent this month</span>
                  <span className={`font-bold ${spending.over_budget ? 'text-error' : 'text-primary'}`}>
                    {spending.percentage}%
                  </span>
                </div>
                <div className="w-full bg-surface-container rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${spending.over_budget ? 'bg-error' : spending.percentage > 75 ? 'bg-yellow-500' : 'bg-primary'}`}
                    style={{ width: `${Math.min(spending.percentage, 100)}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="bg-surface-container-low rounded-md p-2">
                  <p className="text-[10px] text-secondary uppercase">Spent</p>
                  <p className="font-bold text-sm">₹{spending.total_spent.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-surface-container-low rounded-md p-2">
                  <p className="text-[10px] text-secondary uppercase">Budget</p>
                  <p className="font-bold text-sm">₹{spending.monthly_limit.toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-surface-container-low rounded-md p-2">
                  <p className="text-[10px] text-secondary uppercase">Left</p>
                  <p className={`font-bold text-sm ${spending.over_budget ? 'text-error' : 'text-primary'}`}>
                    ₹{spending.remaining.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              {spending.over_budget && (
                <div className="bg-error-container/40 border border-error/30 rounded-lg p-2 text-center mb-2">
                  <p className="text-xs font-bold text-error">⚠️ You've exceeded your monthly budget!</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="body-sm text-secondary mb-2">Set a monthly budget to track spending</p>
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <input
              type="number"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              placeholder="₹ Set budget..."
              className="flex-1 bg-surface-container-low border border-outline-variant rounded-full px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <button
              onClick={handleSetBudget}
              disabled={!budgetInput}
              className="bg-primary text-on-primary px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              Set
            </button>
          </div>
          <button
            onClick={() => sendMessage("How much have I spent this month?")}
            className="mt-3 text-xs text-primary font-semibold flex items-center gap-1 hover:underline"
          >
            Ask AI about spending <ArrowRight size={12} />
          </button>
        </Card>

        {/* ── Quick Actions Card ── */}
        <Card>
          <h3 className="label text-secondary uppercase mb-4">{t.quickActions}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button onClick={() => navigate('/transactions')} className="p-4 bg-surface-container-low rounded-md text-left hover:bg-surface-container transition-colors">
              <p className="font-semibold mb-1">{t.checkBalance}</p>
              <p className="text-xs text-secondary">{t.viewAccounts}</p>
            </button>
            <button onClick={() => navigate('/schemes')} className="p-4 bg-surface-container-low rounded-md text-left hover:bg-surface-container transition-colors">
              <p className="font-semibold mb-1">{t.mySchemes}</p>
              <p className="text-xs text-secondary">{profile?.eligible_schemes?.length || 0} {t.active}</p>
            </button>
            <button onClick={() => navigate('/education')} className="p-4 bg-surface-container-low rounded-md text-left hover:bg-surface-container transition-colors">
              <p className="font-semibold mb-1">{t.learnUpi}</p>
              <p className="text-xs text-secondary">{t.quickTutorial}</p>
            </button>
            <button onClick={() => navigate('/voice', { state: { initialMessage: appLang === 'hi' ? "मुझे पैसे ट्रांसफर करने हैं" : appLang === 'kn' ? "ನಾನು ಹಣವನ್ನು ವರ್ಗಾಯಿಸಲು ಬಯಸುತ್ತೇನೆ" : "I want to transfer money" } })} className="p-4 bg-surface-container-low rounded-md text-left hover:bg-surface-container transition-colors flex flex-col justify-between">
              <p className="font-semibold mb-1">{appLang === 'hi' ? "पैसे भेजें" : appLang === 'kn' ? "ಹಣ ವರ್ಗಾವಣೆ" : "Transfer Money"}</p>
              <ArrowRight size={16} className="text-primary self-end" />
            </button>
            <button onClick={() => navigate('/voice', { state: { initialMessage: appLang === 'hi' ? "मुझे बिल का भुगतान करना है" : appLang === 'kn' ? "ನಾನು ಬಿಲ್ ಪಾವತಿಸಬೇಕು" : "I want to pay a bill" } })} className="p-4 bg-surface-container-low rounded-md text-left hover:bg-surface-container transition-colors flex flex-col justify-between">
              <p className="font-semibold mb-1">{t.payBill}</p>
              <ArrowRight size={16} className="text-primary self-end" />
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
