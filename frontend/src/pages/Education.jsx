import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BookOpen, ShieldCheck, TrendingUp, PlayCircle, X, Volume2, Square } from 'lucide-react';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

const LITERACY_CONTENT = [
  {
    id: 1,
    category: "SECURITY",
    icon: "shield",
    title: "Safe UPI Payments",
    description: "Learn how to spot fake QR codes and never enter your PIN to receive money.",
    read_time: "3 min read",
    type: "read",
    content: `UPI is safe — but only if YOU are careful.

Rules to never break:
1. You NEVER need to enter your UPI PIN to RECEIVE money. PIN is only for SENDING.
2. Never scan a QR code sent by a stranger — scammers send fake QR codes that deduct money.
3. Never click "Request Money" links from unknown numbers.
4. Your UPI PIN is like your ATM PIN — never share it with anyone, not even bank staff.
5. If someone says "I'm sending you money, approve this request" — that is a SCAM. Hang up.

Real example: A vegetable seller in Pune lost ₹8,000 by scanning a QR code a "customer" sent on WhatsApp. The QR code was a payment request, not a payment.

What to do if scammed: Call 1930 (National Cyber Crime Helpline) immediately.`
  },
  {
    id: 2,
    category: "SCHEMES",
    icon: "book",
    title: "Understanding Crop Insurance (PMFBY)",
    description: "A simple guide to PMFBY and how to claim it during adverse weather.",
    read_time: "5 min read",
    type: "read",
    content: `PM Fasal Bima Yojana (PMFBY) protects farmers from crop loss due to:
- Natural disasters (flood, drought, cyclone)
- Pest attacks
- Disease

Premium you pay:
- Kharif crops: only 2% of sum insured
- Rabi crops: only 1.5%
- Horticulture: 5%
Government pays the rest.

How to enroll:
1. Visit your nearest bank or CSC (Common Service Centre)
2. Carry: Aadhaar, land records (7/12 extract), bank passbook
3. Enroll before the deadline — Kharif: July 31, Rabi: December 31

How to claim:
1. Inform your bank OR call crop insurance helpline: 14447
2. Must report within 72 hours of crop damage
3. A surveyor will visit your field
4. Compensation directly to your bank account

Important: If you have a Kisan Credit Card (KCC), you are auto-enrolled.`
  },
  {
    id: 3,
    category: "SAVINGS",
    icon: "trending-up",
    title: "Saving for the Future",
    description: "The magic of compound interest and recurring deposits.",
    read_time: "2 min video",
    type: "watch",
    content: `Compound interest means your savings earn interest, and then that interest also earns interest. It grows like a snowball.

Example:
If you save ₹500 every month in a Recurring Deposit (RD) at 7% interest:
- After 1 year: ₹6,000 saved → you get ₹6,230 (₹230 extra)
- After 5 years: ₹30,000 saved → you get ₹35,900 (₹5,900 extra)
- After 10 years: ₹60,000 saved → you get ₹86,900 (₹26,900 extra)

The longer you save, the more free money you earn.

Best options for rural India:
- Post Office RD: Available at every post office, minimum ₹100/month
- SBI RD: Minimum ₹100/month, 6.8% interest (2025 rate)
- Jan Dhan account savings: Earns 4% interest automatically

Start today: Even ₹50/month matters.
₹50/month for 20 years at 7% = ₹26,000+ in your account.`
  },
  {
    id: 4,
    category: "SECURITY",
    icon: "shield",
    title: "How to Identify a Loan Scam",
    description: "Warning signs of fake loan apps and agents that steal your money.",
    read_time: "4 min read",
    type: "read",
    content: `Fake loan scams are one of the most common frauds in India in 2024-25.

RED FLAGS — these are SCAMS:
1. "Loan approved without any documents" — real loans need documents
2. "Pay ₹500 processing fee first, then get ₹50,000 loan" — real fees are deducted from loan
3. App asks for full access to your contacts and photos — they will blackmail you
4. Interest rate not clearly mentioned upfront
5. No RBI registration number mentioned — check at rbi.org.in

Safe loan options:
- PM Mudra Yojana: Up to ₹10 lakh, through real banks
- Kisan Credit Card: For farmers, through nationalized banks
- SHG loans: Through Self Help Groups in your village

If trapped by fake app: File complaint at cybercrime.gov.in or call 1930.`
  },
  {
    id: 5,
    category: "SCHEMES",
    icon: "book",
    title: "Jan Dhan Account — Hidden Benefits",
    description: "Most Jan Dhan holders don't know about the ₹2 lakh insurance included free.",
    read_time: "3 min read",
    type: "read",
    content: `Your Jan Dhan (PMJDY) account comes with FREE benefits most people don't use:

1. ₹2 lakh accident insurance (RuPay card holders)
   - Free if you use your RuPay card at least once in 45 days
   - Claim: Visit nearest bank with FIR and death/disability certificate

2. ₹30,000 life insurance (accounts opened before Jan 2015)
   - Check with your bank if eligible

3. ₹10,000 overdraft facility
   - After 6 months of good account activity
   - No collateral needed
   - Available to one person per household (prefer women)

4. Direct Benefit Transfer (DBT)
   - PM-KISAN, LPG subsidy, MGNREGA wages — all come directly here
   - No middleman, no deduction

5. Zero minimum balance
   - Never pay penalty for low balance

How to activate RuPay insurance:
Use your RuPay debit card for any transaction (even ₹1 at a shop) once every 45 days to keep the ₹2 lakh insurance active.`
  },
  {
    id: 6,
    category: "SAVINGS",
    icon: "trending-up",
    title: "What is a Self Help Group (SHG)?",
    description: "How women in villages are using SHGs to escape debt and build savings.",
    read_time: "4 min read",
    type: "read",
    content: `A Self Help Group (SHG) is a small group of 10-20 people (usually women) who save together and help each other.

How it works:
1. Group meets weekly or monthly
2. Everyone saves a small amount (₹50-200)
3. The pooled money can be lent to members at low interest
4. After 6 months, banks give loans to the group at 7% interest (normal moneylenders charge 36-60%)

Benefits:
- Escape from local moneylenders who charge huge interest
- Loans for house repair, children's education, medical emergency
- Under NRLM (National Rural Livelihood Mission), government gives ₹10,000 revolving fund to each SHG free
- Bank linkage loans: ₹1-10 lakh at 7% after track record

How to join or form one:
- Contact your Gram Panchayat or Anganwadi worker
- Or contact nearest bank's RSETi (Rural Self Employment Training Institute)
- Search: nrlm.gov.in to find SHGs in your area

Over 9 crore women are part of SHGs in India (2025).`
  },
  {
    id: 7,
    category: "SECURITY",
    icon: "shield",
    title: "Aadhaar-Enabled Payment Frauds",
    description: "How fraudsters misuse Aadhaar biometrics and how to lock your Aadhaar.",
    read_time: "4 min read",
    type: "read",
    content: `A new fraud in rural India: Fake agents with a PoS machine visit villages, say "free ration check" or "government survey" and take your fingerprint. They use it to withdraw money from your bank account via Aadhaar-linked payment.

This is called AePS (Aadhaar-enabled Payment System) fraud.

How to protect yourself RIGHT NOW:
1. Lock your Aadhaar biometrics:
   - Go to myaadhaar.uidai.gov.in
   - Click "Lock/Unlock Biometrics"
   - Lock it — unlock only when YOU go to a bank or govt office

2. Never give fingerprint to unknown agents at your door

3. Check your Aadhaar transaction history:
   - SMS "UIDAI" to 1947
   - Or check resident.uidai.gov.in

4. If fraud happens:
   - Call UIDAI helpline: 1947
   - Call bank immediately to freeze account
   - File complaint: cybercrime.gov.in

Important: Locking biometrics does NOT affect your Aadhaar for other uses like SIM, passport, or govt documents.`
  },
  {
    id: 8,
    category: "SCHEMES",
    icon: "book",
    title: "PM Vishwakarma Yojana — For Skilled Workers",
    description: "New 2023 scheme giving ₹3 lakh loans and training to artisans and craftsmen.",
    read_time: "3 min read",
    type: "read",
    content: `PM Vishwakarma Yojana launched September 2023 — one of the newest schemes.

Who is it for? 18 traditional occupations including:
Carpenter, Blacksmith, Potter, Weaver, Tailor, Barber, Washerman, Cobbler, Goldsmith, Mason, Boat maker, Toy maker, Fishing net maker, Locksmith, Sculptor

What you get:
1. Recognition: PM Vishwakarma certificate and ID card
2. Skill training: Free 5-7 day basic training + ₹500/day stipend
3. Toolkit grant: ₹15,000 free (e-voucher for buying tools)
4. Loan: ₹1 lakh first (5% interest), then ₹2 lakh second loan (much lower than market rate of 24-36%)
5. Digital payments incentive: ₹1 per transaction up to 100 transactions/month
6. Marketing support: Connecting to GeM portal and national fairs

How to apply:
- Visit nearest CSC (Common Service Centre) with Aadhaar + mobile
- Or apply at pmvishwakarma.gov.in
- Verification done by Gram Panchayat

Budget: ₹13,000 crore over 5 years (2023-2028)`
  },
  {
    id: 9,
    category: "SAVINGS",
    icon: "trending-up",
    title: "Understanding Loan Interest — Don't Get Trapped",
    description: "Simple math that shows how moneylender loans destroy savings.",
    read_time: "3 min read",
    type: "read",
    content: `Many rural families borrow from local moneylenders without realizing how much they actually pay back.

Real comparison for ₹10,000 loan:

Local moneylender (3% per month):
- Monthly interest: ₹300
- After 1 year — you paid ₹3,600 in interest
- The original ₹10,000 is STILL owed
- Total paid after 2 years if only paying interest: ₹7,200 — and still owe ₹10,000

Bank loan (12% per year):
- Monthly EMI for 1 year: ₹888
- Total paid: ₹10,656
- Loan fully closed — nothing more owed

Post Office / SHG loan (7% per year):
- Monthly EMI for 1 year: ₹870
- Total paid: ₹10,440
- Loan fully closed

Key lesson:
"3% per month" sounds small but is 36% per year — 3x more than a bank.

Always ask: "What is the annual interest rate?" (Saalaana byaaj kitna hai?)

Emergency loan options (in order of preference):
1. SHG loan (7%)
2. Jan Dhan overdraft (0% for first 6 months)
3. PM Mudra loan through bank (10-12%)
4. AVOID: local moneylender (36-120%)`
  },
  {
    id: 10,
    category: "SCHEMES",
    icon: "book",
    title: "Free Health Insurance — Ayushman Bharat",
    description: "How to check if your family is covered and how to use it at hospitals.",
    read_time: "4 min read",
    type: "read",
    content: `Ayushman Bharat PM-JAY gives ₹5 lakh health insurance FREE to low-income families — covers 12 crore families in India.

Are you covered? Check in 30 seconds:
- SMS "PMJAY" to 14555
- Or visit beneficiary.nha.gov.in
- Or call helpline: 14555

What is covered:
- 1,961 medical procedures including surgery, cancer, heart surgery
- ICU charges, doctor fees, medicines, tests — ALL free
- Pre and post hospitalization (3 days before, 15 days after)
- Works at 29,000+ empanelled hospitals across India
- No cash payment needed at hospital

How to use at hospital:
1. Go to Ayushman Bharat empanelled hospital (look for PM-JAY board)
2. Show Aadhaar card at Ayushman Mitra desk
3. They verify online — takes 5 minutes
4. Get admitted — hospital bills government directly

Important updates (2024-25):
- Now extended to ALL senior citizens above 70 years regardless of income (Ayushman Vaya Vandana scheme)
- Covers ANGIOPLASTY, KNEE REPLACEMENT, CANCER TREATMENT — procedures that cost ₹2-5 lakh in private hospitals

If hospital refuses: Call 14555 immediately.`
  }
];

export const Education = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [expandedTopic, setExpandedTopic] = useState(null);
  const [playingTopicId, setPlayingTopicId] = useState(null);
  const [playLang, setPlayLang] = useState('en-IN');
  const [speechChunks, setSpeechChunks] = useState([]);
  const [currentChunk, setCurrentChunk] = useState(0);

  const { speak, stop } = useSpeechSynthesis();

  // Cleanup speech on unmount
  useEffect(() => {
    return () => { stop(); };
  }, []);

  // Stop playing when card changes
  useEffect(() => {
    stopSpeech();
  }, [expandedTopic]);

  const stopSpeech = () => {
    stop();
    setPlayingTopicId(null);
    setSpeechChunks([]);
    setCurrentChunk(0);
  };

  // Chrome kills utterances after ~15s. Chunk text into safe sizes.
  const splitIntoChunks = (text) => {
    const cleaned = text
      .replace(/₹/g, ' rupees ')
      .replace(/[•]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const sentences = cleaned.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let buf = '';
    for (const s of sentences) {
      if ((buf + ' ' + s).length > 200 && buf) {
        chunks.push(buf.trim());
        buf = s;
      } else {
        buf += ' ' + s;
      }
    }
    if (buf.trim()) chunks.push(buf.trim());
    return chunks.length ? chunks : [cleaned];
  };

  const speakChunk = (chunks, idx, topicId) => {
    if (idx >= chunks.length) { stopSpeech(); return; }

    const shortLang = playLang.split('-')[0]; // convert 'en-IN' to 'en'
    speak(chunks[idx], shortLang, {
      rate: 1.0,
      onEnd: () => {
        const next = idx + 1;
        setCurrentChunk(next);
        speakChunk(chunks, next, topicId);
      }
    });
  };

  const handleSpeak = (e, text, topicId) => {
    e.stopPropagation();
    if (playingTopicId === topicId) { stopSpeech(); return; }

    stop();
    const chunks = splitIntoChunks(text);
    setSpeechChunks(chunks);
    setCurrentChunk(0);
    setPlayingTopicId(topicId);
    speakChunk(chunks, 0, topicId);
  };

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'shield': return <ShieldCheck className="text-primary" size={24} />;
      case 'book': return <BookOpen className="text-primary" size={24} />;
      case 'trending-up': return <TrendingUp className="text-primary" size={24} />;
      default: return <BookOpen className="text-primary" size={24} />;
    }
  };

  const formatContent = (content) => {
    return content.split('\n').map((line, i) => {
      if (!line.trim()) return <div key={i} className="h-3" />;
      const parts = line.split(/(₹[\d,]+(?:\.?\d+)?(?:\s*(?:lakh|crore))?|\d[\d,]*%)/gi);
      return (
        <p key={i} className="mb-1 text-sm leading-relaxed whitespace-pre-wrap">
          {parts.map((part, j) =>
            /^(₹[\d,]|\d[\d,]*%)/.test(part)
              ? <strong key={j} className="text-primary font-bold">{part}</strong>
              : part
          )}
        </p>
      );
    });
  };

  const filteredTopics = LITERACY_CONTENT.filter(t => activeTab === 'all' || t.category === activeTab);
  const isCardPlaying = (id) => playingTopicId === id;

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="h2 text-primary">Financial Literacy</h2>
        <p className="body-sm text-secondary mt-1">Simple lessons to build your financial confidence.</p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 hide-scrollbar">
        {[
          { key: 'all', label: 'All Topics' },
          { key: 'SECURITY', label: 'Security & Fraud' },
          { key: 'SCHEMES', label: 'Govt Schemes' },
          { key: 'SAVINGS', label: 'Savings' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-colors ${activeTab === tab.key ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTopics.map((topic) => (
          <Card
            key={topic.id}
            className={`flex flex-col h-full hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden ${isCardPlaying(topic.id) ? 'ring-2 ring-primary/40' : ''}`}
            onClick={() => {
              if (expandedTopic === topic.id) {
                stopSpeech();
                setExpandedTopic(null);
              } else {
                setExpandedTopic(topic.id);
              }
            }}
          >
            {/* Card header */}
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isCardPlaying(topic.id) ? 'bg-primary/10 animate-pulse' : 'bg-surface-container'}`}>
                {isCardPlaying(topic.id) ? <Volume2 className="text-primary" size={24} /> : getIcon(topic.icon)}
              </div>
              <span className="text-xs font-bold text-secondary bg-surface-variant px-2 py-1 rounded-sm uppercase tracking-wide">
                {topic.category}
              </span>
            </div>
            <h3 className="h3 mb-2">{topic.title}</h3>
            <p className="body-sm text-secondary mb-6 flex-1">{topic.description}</p>

            {/* Expanded view */}
            {expandedTopic === topic.id ? (
              <div className="mt-2 pt-4 border-t border-surface-variant animate-fadeIn">
                {/* Listen toolbar */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <select
                    className="text-xs bg-surface-container text-on-surface rounded-full px-3 py-1.5 outline-none border border-surface-variant cursor-pointer"
                    value={playLang}
                    onChange={(e) => { e.stopPropagation(); setPlayLang(e.target.value); if (playingTopicId) stopSpeech(); }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="en-IN">🇬🇧 English</option>
                    <option value="hi-IN">🇮🇳 Hindi</option>
                    <option value="kn-IN">🇮🇳 Kannada</option>
                  </select>

                  <Button
                    variant={isCardPlaying(topic.id) ? "primary" : "secondary"}
                    className="!min-h-0 !py-1.5 !px-4 text-xs flex items-center gap-1.5 rounded-full"
                    onClick={(e) => handleSpeak(e, topic.content, topic.id)}
                  >
                    {isCardPlaying(topic.id)
                      ? <><Square size={12} fill="currentColor" /> Stop</>
                      : <><Volume2 size={14} /> Listen</>
                    }
                  </Button>

                  {isCardPlaying(topic.id) && speechChunks.length > 1 && (
                    <span className="text-xs text-secondary ml-1">
                      Part {Math.min(currentChunk + 1, speechChunks.length)}/{speechChunks.length}
                    </span>
                  )}

                  <div className="ml-auto">
                    <Button
                      variant="secondary"
                      className="!p-1.5 !min-h-0 bg-surface-variant hover:bg-surface-container-high rounded-full"
                      onClick={(e) => { e.stopPropagation(); stopSpeech(); setExpandedTopic(null); }}
                    >
                      <X size={16} className="text-secondary" />
                    </Button>
                  </div>
                </div>

                {/* Progress bar */}
                {isCardPlaying(topic.id) && speechChunks.length > 1 && (
                  <div className="w-full h-1 bg-surface-variant rounded-full mb-3 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${((currentChunk + 1) / speechChunks.length) * 100}%` }}
                    />
                  </div>
                )}

                {/* Content */}
                <div className="bg-surface-container rounded-lg p-4 max-h-80 overflow-y-auto">
                  {formatContent(topic.content)}
                </div>
              </div>
            ) : (
              /* Collapsed footer */
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-surface-variant">
                <span className="text-sm font-semibold text-secondary flex items-center gap-1">
                  {topic.type === 'watch' ? <PlayCircle size={16} /> : <Volume2 size={16} />}
                  {topic.read_time}
                </span>
                <Button variant="secondary" className="!min-h-0 !py-1 !px-4 text-sm pointer-events-none">
                  {topic.type === 'watch' ? 'Watch' : 'Listen'}
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
