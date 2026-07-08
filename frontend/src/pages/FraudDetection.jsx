import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { submitFraudReport } from '../api';
import {
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  Shield,
  Phone,
  HelpCircle,
  Clock,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Lock,
  Eye,
  AlertCircle
} from 'lucide-react';

export const FraudDetection = () => {
  const { profile, fraudHistory = [], liveRiskLevel = 'low', fetchFraudHistory, t, appLang } = useSession();
  const [reportState, setReportState] = useState({
    contact: '',
    details: '',
    submitting: false,
    submitted: false,
    error: null,
    submittedReport: null
  });

  const getRiskDetails = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'high':
        return {
          title: appLang === 'hi' ? 'उच्च सुरक्षा जोखिम' : appLang === 'kn' ? 'ಹೆಚ್ಚಿನ ಭದ್ರತಾ ಅಪಾಯ' : 'HIGH SECURITY RISK',
          desc: appLang === 'hi'
            ? 'आपके खाते पर हाल ही में कई संदिग्ध गतिविधियां दर्ज की गई हैं। कृपया तुरंत सतर्क हो जाएं।'
            : appLang === 'kn'
            ? 'ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿ ಇತ್ತೀಚೆಗೆ ಹಲವಾರು ಶಂಕಾಸ್ಪದ ಚಟುವಟಿಕೆಗಳು ಕಂಡುಬಂದಿವೆ. ದಯವಿಟ್ಟು ತಕ್ಷಣ ಎಚ್ಚರದಿಂದಿರಿ.'
            : 'Multiple suspicious activities have been detected on your account recently. Please stay vigilant.',
          style: 'border-2 border-error bg-error-container/20 text-on-error-container',
          badgeStyle: 'bg-error text-on-primary animate-pulse',
          icon: <AlertTriangle size={32} className="text-error" />
        };
      case 'medium':
        return {
          title: appLang === 'hi' ? 'मध्यम सुरक्षा जोखिम' : appLang === 'kn' ? 'ಮಧ್ಯಮ ಭದ್ರತಾ ಅಪಾಯ' : 'MEDIUM SECURITY RISK',
          desc: appLang === 'hi'
            ? 'आपके खाते पर हाल ही में कुछ सुरक्षा चेतावनी मिली हैं। सतर्कता बरतें।'
            : appLang === 'kn'
            ? 'ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿ ಇತ್ತೀಚೆಗೆ ಕೆಲವು ಭದ್ರತಾ ಎಚ್ಚರಿಕೆಗಳು ಬಂದಿವೆ. ಜಾಗರೂಕರಾಗಿರಿ.'
            : 'A few security warnings have been detected. Exercise caution and verify transactions.',
          style: 'border-2 border-tertiary bg-tertiary-container/20 text-on-tertiary-container',
          badgeStyle: 'bg-tertiary text-on-primary',
          icon: <AlertCircle size={32} className="text-tertiary" />
        };
      case 'low':
      default:
        return {
          title: appLang === 'hi' ? 'खाता सुरक्षित है' : appLang === 'kn' ? 'ಖಾತೆ ಸುರಕ್ಷಿತವಾಗಿದೆ' : 'ACCOUNT SECURE',
          desc: appLang === 'hi'
            ? 'आपके खाते पर कोई हालिया संदिग्ध गतिविधि नहीं मिली है। आपका फंड सुरक्षित है।'
            : appLang === 'kn'
            ? 'ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿ ಯಾವುದೇ ಇತ್ತೀಚಿನ ಶಂಕಾಸ್ಪದ ಚಟುವಟಿಕೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ. ನಿಮ್ಮ ಹಣ ಸುರಕ್ಷಿತವಾಗಿದೆ.'
            : 'No suspicious activities detected recently. Your funds are protected by Artha Mitra Guard.',
          style: 'border border-outline bg-surface-container text-on-surface',
          badgeStyle: 'bg-primary text-on-primary',
          icon: <ShieldCheck size={32} className="text-primary" />
        };
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-error text-on-primary text-xs font-bold px-2 py-0.5 rounded';
      case 'high':
        return 'bg-error-container text-on-error-container text-xs font-bold px-2 py-0.5 rounded';
      case 'medium':
        return 'bg-tertiary-fixed text-on-tertiary-fixed text-xs font-semibold px-2 py-0.5 rounded';
      case 'low':
      default:
        return 'bg-primary-container text-primary text-xs font-semibold px-2 py-0.5 rounded';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reportState.contact.trim() || !reportState.details.trim()) return;
    setReportState(s => ({ ...s, submitting: true, error: null }));
    try {
      const response = await submitFraudReport(
        profile.account_id,
        reportState.contact.trim(),
        reportState.details.trim()
      );
      if (response && response.status === 'success') {
        setReportState({
          contact: '',
          details: '',
          submitting: false,
          submitted: true,
          error: null,
          submittedReport: response.report
        });
      } else {
        throw new Error('Response did not indicate success');
      }
    } catch (err) {
      setReportState(s => ({
        ...s,
        submitting: false,
        error: appLang === 'hi'
          ? 'रिपोर्ट जमा करने में असमर्थ — कृपया दोबारा प्रयास करें।'
          : appLang === 'kn'
          ? 'ವರದಿ ಸಲ್ಲಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ — ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸಿ.'
          : 'Could not submit report — please check your internet and try again.'
      }));
    }
  };

  const risk = getRiskDetails(liveRiskLevel);

  return (
    <div className="animate-fade-in max-w-4xl mx-auto w-full px-4 md:px-0">
      <header className="mb-8">
        <h1 className="h2 text-primary flex items-center gap-3">
          <ShieldAlert size={36} className="text-primary animate-pulse" />
          {appLang === 'hi' ? 'धोखाधड़ी और सुरक्षा कवच' : appLang === 'kn' ? 'ವಂಚನೆ ಮತ್ತು ಭದ್ರತಾ ಕವಚ' : 'Artha Mitra Guard'}
        </h1>
        <p className="body-sm text-secondary mt-2">
          {appLang === 'hi'
            ? 'अपने खाते की सुरक्षा स्थिति की निगरानी करें, अलर्ट इतिहास देखें और संदिग्ध गतिविधि की रिपोर्ट करें।'
            : appLang === 'kn'
            ? 'ನಿಮ್ಮ ಖಾತೆಯ ಭದ್ರತಾ ಸ್ಥಿತಿಯನ್ನು ಮೇಲ್ವಿಚಾರಣೆ ಮಾಡಿ, ಎಚ್ಚರಿಕೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ವಂಚನೆಯನ್ನು ವರದಿ ಮಾಡಿ.'
            : 'Monitor your account security level, review automated threat logs, and submit incident reports.'}
        </p>
      </header>

      {/* Real-time Risk Profile Card */}
      <div className={`rounded-2xl p-6 mb-8 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-sm transition-all duration-300 ${risk.style}`}>
        <div className="flex gap-4 items-center">
          <div className="p-3 bg-surface-container-lowest rounded-full shadow-inner">
            {risk.icon}
          </div>
          <div>
            <h2 className="label text-secondary uppercase tracking-wider mb-0.5">
              {appLang === 'hi' ? 'खाता जोखिम प्रोफ़ाइल' : appLang === 'kn' ? 'ಖಾತೆ ಭದ್ರತಾ ಪ್ರೊಫೈಲ್' : 'Real-time Security Status'}
            </h2>
            <p className="h3 font-bold mb-1 text-on-background">{profile?.name}</p>
            <p className="text-xs opacity-85 leading-relaxed max-w-lg">{risk.desc}</p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-full flex items-center gap-2 font-bold tracking-wide text-sm shrink-0 self-end md:self-auto ${risk.badgeStyle}`}>
          {liveRiskLevel === 'low' ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
          {risk.title}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Alerts History Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="h3 text-primary flex items-center gap-2">
              <Clock size={20} />
              {appLang === 'hi' ? 'सुरक्षा चेतावनी इतिहास' : appLang === 'kn' ? 'ಭದ್ರತಾ ಎಚ್ಚರಿಕೆ ಇತಿಹಾಸ' : 'Security Audit Timeline'}
            </h2>
            {fraudHistory.length > 0 && (
              <span className="bg-surface-container-high text-on-surface text-xs font-bold px-3 py-1 rounded-full border border-outline-variant">
                {fraudHistory.length} {appLang === 'hi' ? 'अलर्ट' : appLang === 'kn' ? 'ಎಚ್ಚರಿಕೆಗಳು' : 'Alerts'}
              </span>
            )}
          </div>

          {fraudHistory.length === 0 ? (
            <div className="card text-center py-16 border-2 border-dashed border-outline-variant rounded-2xl bg-surface-container-lowest">
              <Shield size={64} className="mx-auto text-primary/30 mb-4 animate-bounce" />
              <p className="body-lg font-bold text-on-surface">
                {appLang === 'hi' ? 'कोई संदिग्ध गतिविधि नहीं मिली' : appLang === 'kn' ? 'ಯಾವುದೇ ಶಂಕಾಸ್ಪದ ಚಟುವಟಿಕೆ ಇಲ್ಲ' : 'All Clear — No Threats Detected'}
              </p>
              <p className="text-sm text-secondary mt-2 max-w-md mx-auto leading-relaxed">
                {appLang === 'hi'
                  ? 'आपका खाता वर्तमान में पूरी तरह सुरक्षित है। जब भी आप बातचीत करेंगे, हमारा सुरक्षा कवच आपकी निगरानी करता रहेगा।'
                  : appLang === 'kn'
                  ? 'ನಿಮ್ಮ ಖಾತೆಯು ಪ್ರಸ್ತುತ ಸುರಕ್ಷಿತವಾಗಿದೆ. ಚಾಟ್ ಮಾಡುವಾಗ ಯಾವುದೇ ವಂಚನೆ ಕಂಡುಬಂದರೆ ನಾವಿಲ್ಲಿ ಎಚ್ಚರಿಕೆ ನೀಡುತ್ತೇವೆ.'
                  : 'Your account is in good standing. Artha Mitra Guard monitors your active chat sessions in real time to filter out OTP phishing and deposit scams.'}
              </p>
            </div>
          ) : (
            /* Beautiful Vertical Timeline Spine */
            <div className="relative pl-6 border-l-2 border-outline-variant space-y-8 ml-3">
              {fraudHistory.map((alert, index) => (
                <div key={alert.id || index} className="relative group">
                  {/* Timeline Marker Dot */}
                  <span className={`absolute -left-[31px] top-1.5 p-1 rounded-full border-4 border-surface ${alert.severity === 'critical' || alert.severity === 'high' ? 'bg-error' : 'bg-tertiary'}`}>
                    <span className="block w-2.5 h-2.5 rounded-full bg-surface animate-ping absolute -top-0.5 -left-0.5 opacity-75" />
                  </span>
                  
                  {/* Timeline Content Card */}
                  <div className="card bg-surface-container-lowest hover:border-outline transition-all duration-200 shadow-sm rounded-xl p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={getSeverityBadge(alert.severity)}>
                          {alert.severity?.toUpperCase() || 'HIGH'}
                        </span>
                        <h3 className="font-bold text-base text-on-surface capitalize">
                          {alert.matched_patterns && alert.matched_patterns.length > 0
                            ? alert.matched_patterns.join(', ')
                            : (alert.intent || 'Suspicious Phishing Attempt').replace(/_/g, ' ')}
                        </h3>
                      </div>
                      <span className="text-xs text-secondary font-semibold shrink-0">
                        {new Date(alert.logged_at).toLocaleString(appLang === 'hi' ? 'hi-IN' : appLang === 'kn' ? 'kn-IN' : 'en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="body-sm text-on-surface-variant bg-surface-container-low rounded-lg p-3 border-l-4 border-error/50 leading-relaxed italic">
                      "{alert.message || alert.warning}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Suspicious Activity Report Form */}
        <div className="space-y-6">
          <div className="card bg-surface-container-low border border-outline-variant shadow-sm rounded-2xl p-6">
            <h2 className="h3 text-primary mb-2">
              {appLang === 'hi' ? 'सुरक्षा रिपोर्ट दर्ज करें' : appLang === 'kn' ? 'ವಂಚನೆ ವರದಿ ಮಾಡಿ' : 'Secure Incident Report'}
            </h2>
            <p className="body-sm text-secondary mb-6 leading-relaxed">
              {appLang === 'hi'
                ? 'क्या आपको कोई संदिग्ध फोन आया या कोई ओटीपी मांग रहा है? इसे तुरंत यहां दर्ज करें।'
                : appLang === 'kn'
                ? 'ಯಾರಾದರೂ ನಿಮಗೆ ಶಂಕಾಸ್ಪದ ಕರೆ ಅಥವಾ ಒಟಿಪಿ ಕೇಳಿದ್ದಾರೆಯೇ? ಇಲ್ಲಿ ವರदी ಮಾಡಿ ಭದ್ರತೆ ಹೆಚ್ಚಿಸಿ.'
                : 'Did you receive a suspicious call, scam link, or pressure to share your PIN? Report it directly to protect your account.'}
            </p>

            {reportState.submitted ? (
              /* Success Confirmation View (Animated inline transition) */
              <div className="text-center py-6 animate-fadeIn">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary/20">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="font-bold text-lg text-on-surface mb-2">
                  {appLang === 'hi' ? 'रिपोर्ट दर्ज कर ली गई है' : appLang === 'kn' ? 'ವರದಿ ದಾಖಲಾಗಿದೆ' : 'Incident Report Filed'}
                </h3>
                <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant text-left text-xs mb-6 space-y-2">
                  <p className="text-secondary"><strong>{appLang === 'hi' ? 'संपर्क:' : appLang === 'kn' ? 'ಸಂಪರ್ಕ:' : 'Target:'}</strong> {reportState.submittedReport?.contact_info}</p>
                  <p className="text-secondary leading-relaxed"><strong>{appLang === 'hi' ? 'विवरण:' : appLang === 'kn' ? 'ವಿವರಗಳು:' : 'Details:'}</strong> {reportState.submittedReport?.details}</p>
                </div>
                <p className="text-xs text-secondary leading-relaxed mb-6">
                  {appLang === 'hi'
                    ? 'हमारी सुरक्षा टीम जांच कर रही है। रमेश जी, सतर्क रहें — किसी को अपना पिन न बताएं।'
                    : appLang === 'kn'
                    ? 'ನಮ್ಮ ಭದ್ರತಾ ತಂಡ ಪರಿಶೀಲಿಸುತ್ತಿದೆ. ರಮೇಶ್ ಅವರೇ, ಜಾಗರೂಕರಾಗಿರಿ — ಪಿನ್ ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.'
                    : 'Our cybersecurity desk is investigating. We appreciate your vigilance. Artha Mitra will never call to ask for your passwords.'}
                </p>
                <button
                  onClick={() => setReportState(s => ({ ...s, submitted: false }))}
                  className="btn-secondary w-full justify-center text-sm font-semibold rounded-full"
                >
                  {appLang === 'hi' ? 'एक और रिपोर्ट दर्ज करें' : appLang === 'kn' ? 'ಮತ್ತೊಂದು ವರದಿ ಸಲ್ಲಿಸಿ' : 'File Another Report'}
                </button>
              </div>
            ) : (
              /* Report Submission Form */
              <form className="space-y-5" onSubmit={handleSubmit}>
                {reportState.error && (
                  <div className="bg-error-container border border-error/20 rounded-xl p-3 flex gap-2 items-start animate-fadeIn">
                    <AlertTriangle size={18} className="text-error shrink-0 mt-0.5" />
                    <p className="text-xs text-on-error-container font-semibold leading-relaxed">
                      {reportState.error}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block label text-on-surface-variant font-bold mb-1.5">
                    {appLang === 'hi' ? 'संदिग्ध फोन नंबर या यूपीआई आईडी' : appLang === 'kn' ? 'ಶಂಕಾಸ್ಪದ ನಂಬರ್ ಅಥವಾ ಯುಪಿಐ ಐಡಿ' : 'Scam Source (Phone / UPI ID)'}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 text-secondary" size={18} />
                    <input
                      type="text"
                      required
                      value={reportState.contact}
                      onChange={(e) => setReportState(s => ({ ...s, contact: e.target.value }))}
                      placeholder="e.g. +91 99887 76655"
                      className="w-full bg-surface-container-lowest p-3 pl-10 rounded-xl border border-outline-variant focus:border-primary focus:outline-none text-sm placeholder:opacity-60"
                      disabled={reportState.submitting}
                    />
                  </div>
                </div>

                <div>
                  <label className="block label text-on-surface-variant font-bold mb-1.5">
                    {appLang === 'hi' ? 'धोखाधड़ी का विवरण' : appLang === 'kn' ? 'ವಂಚನೆಯ ವಿವರಗಳು' : 'Details of Fraud Attempt'}
                  </label>
                  <textarea
                    required
                    rows="4"
                    value={reportState.details}
                    onChange={(e) => setReportState(s => ({ ...s, details: e.target.value }))}
                    placeholder={appLang === 'hi' ? 'फोन पर क्या कहा गया? क्या ओटीपी मांगा?' : appLang === 'kn' ? 'ಅವರು ಏನೆಂದು ಹೇಳಿದರು? ಒಟಿಪಿ ಕೇಳಿದರೇ?' : 'What did they say? Did they request an OTP or transaction approval?'}
                    className="w-full bg-surface-container-lowest p-3 rounded-xl border border-outline-variant focus:border-primary focus:outline-none text-sm placeholder:opacity-60 resize-none leading-relaxed"
                    maxLength={1000}
                    disabled={reportState.submitting}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={reportState.submitting || !reportState.contact.trim() || !reportState.details.trim()}
                  className="btn-primary w-full justify-center rounded-full text-sm font-bold tracking-wide flex items-center gap-2 shadow-sm"
                >
                  {reportState.submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      {appLang === 'hi' ? 'सुरक्षित सबमिशन हो रहा है...' : appLang === 'kn' ? 'ವರದಿ ಸಲ್ಲಿಕೆಯಾಗುತ್ತಿದೆ...' : 'Securing Upload...'}
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      {appLang === 'hi' ? 'सुरक्षित रिपोर्ट जमा करें' : appLang === 'kn' ? 'ವರದಿ ಸಲ್ಲಿಸಿ' : 'File Secure Report'}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
