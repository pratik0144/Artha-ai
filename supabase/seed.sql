-- =============================================================================
-- Artha AI (DigiSeva) — Supabase Seed Data
-- All data from mock_bank.py, schemes_database.json, fraud_detection_agent.py
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ACCOUNTS (6 accounts from ACCOUNTS dict + SPENDING_LIMITS merged)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO accounts (account_id, name, age, gender, language, occupation, location, location_type, state, balance, account_type, linked_aadhaar, linked_schemes, has_smartphone, phone_number, bpl_card, land_acres, gst_number, monthly_limit, fraud_history, fraud_notes)
VALUES
    ('JD-1001', 'Ramesh Kumar', 45, 'male',
     '{"primary":"hindi","display_languages":["hindi","english"]}'::JSONB,
     'farmer', 'Barabanki', 'village', 'Uttar Pradesh',
     4200.00, 'Jan Dhan', '234567890123',
     ARRAY['PM-KISAN','PMJDY'],
     FALSE, '9876543210', FALSE, 2.5, NULL, 3000.00,
     FALSE, NULL),

    ('SB-2001', 'Savitha Gowda', 32, 'female',
     '{"primary":"kannada","display_languages":["kannada","english"]}'::JSONB,
     'farm_labour', 'Mandya', 'village', 'Karnataka',
     1800.00, 'savings', '345678901234',
     ARRAY['MGNREGA'],
     FALSE, '9876543211', TRUE, NULL, NULL, 2000.00,
     FALSE, NULL),

    ('SB-2002', 'Meera Devi', 38, 'female',
     '{"primary":"hindi","display_languages":["tamil","hindi","english"]}'::JSONB,
     'homemaker', 'Thanjavur', 'town', 'Tamil Nadu',
     6500.00, 'savings', '456789012345',
     ARRAY['PM Ujjwala Yojana','Ayushman Bharat'],
     TRUE, '9876543212', FALSE, NULL, NULL, 5000.00,
     FALSE, NULL),

    ('SB-3001', 'Arjun Singh', 40, 'male',
     '{"primary":"hindi","display_languages":["hindi","english"]}'::JSONB,
     'shop_owner', 'Varanasi', 'city', 'Uttar Pradesh',
     22000.00, 'savings', '567890123456',
     ARRAY['PM Mudra Yojana'],
     TRUE, '9876543213', FALSE, NULL, '09ABCDE1234F1Z5', 10000.00,
     FALSE, NULL),

    ('JD-1002', 'Fatima Bi', 55, 'female',
     '{"primary":"hindi","display_languages":["urdu","hindi"]}'::JSONB,
     'unemployed', 'Gulbarga', 'town', 'Karnataka',
     900.00, 'Jan Dhan', '678901234567',
     ARRAY['PMJDY'],
     FALSE, '9876543214', TRUE, NULL, NULL, 1500.00,
     FALSE, NULL),

    ('NONE-0001', 'Suresh Nayak', 28, 'male',
     '{"primary":"kannada","display_languages":["kannada"]}'::JSONB,
     'daily_wager', 'Raichur', 'village', 'Karnataka',
     0.00, 'none', '789012345678',
     ARRAY[]::TEXT[],
     FALSE, '9876543215', TRUE, NULL, NULL, 0.00,
     FALSE, NULL);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TRANSACTIONS (all transaction_history entries from ACCOUNTS)
-- ─────────────────────────────────────────────────────────────────────────────

-- JD-1001 (Ramesh Kumar)
INSERT INTO transactions (account_id, date, type, amount, description) VALUES
    ('JD-1001', '2026-04-25', 'credit', 2000.00, 'PM-KISAN installment'),
    ('JD-1001', '2026-04-20', 'debit',  500.00,  'Fertilizer purchase'),
    ('JD-1001', '2026-04-15', 'credit', 1500.00, 'Crop sale'),
    ('JD-1001', '2026-04-10', 'debit',  300.00,  'Electricity bill'),
    ('JD-1001', '2026-04-05', 'debit',  200.00,  'Mobile recharge');

-- SB-2001 (Savitha Gowda)
INSERT INTO transactions (account_id, date, type, amount, description) VALUES
    ('SB-2001', '2026-04-28', 'credit', 1200.00, 'MGNREGA wages'),
    ('SB-2001', '2026-04-22', 'debit',  400.00,  'Ration purchase'),
    ('SB-2001', '2026-04-18', 'debit',  100.00,  'Mobile recharge'),
    ('SB-2001', '2026-04-12', 'credit', 800.00,  'Daily wage payment'),
    ('SB-2001', '2026-04-06', 'debit',  250.00,  'Medical expense');

-- SB-2002 (Meera Devi)
INSERT INTO transactions (account_id, date, type, amount, description) VALUES
    ('SB-2002', '2026-04-27', 'debit',  800.00,  'LPG cylinder refill'),
    ('SB-2002', '2026-04-21', 'credit', 3000.00, 'Husband salary transfer'),
    ('SB-2002', '2026-04-16', 'debit',  1200.00, 'School fees'),
    ('SB-2002', '2026-04-11', 'debit',  350.00,  'Electricity bill'),
    ('SB-2002', '2026-04-04', 'credit', 500.00,  'Savings deposit');

-- SB-3001 (Arjun Singh)
INSERT INTO transactions (account_id, date, type, amount, description) VALUES
    ('SB-3001', '2026-04-29', 'credit', 8000.00, 'Shop sales'),
    ('SB-3001', '2026-04-24', 'debit',  5000.00, 'Wholesale stock purchase'),
    ('SB-3001', '2026-04-19', 'debit',  1500.00, 'Shop rent'),
    ('SB-3001', '2026-04-14', 'credit', 3500.00, 'UPI collections'),
    ('SB-3001', '2026-04-09', 'debit',  700.00,  'Insurance premium');

-- JD-1002 (Fatima Bi)
INSERT INTO transactions (account_id, date, type, amount, description) VALUES
    ('JD-1002', '2026-04-26', 'credit', 500.00,  'Widow pension'),
    ('JD-1002', '2026-04-20', 'debit',  300.00,  'Medicine purchase'),
    ('JD-1002', '2026-04-15', 'credit', 500.00,  'Govt aid transfer'),
    ('JD-1002', '2026-04-08', 'debit',  200.00,  'Ration purchase'),
    ('JD-1002', '2026-04-02', 'debit',  150.00,  'Electricity bill');

-- NONE-0001 (Suresh Nayak) — no transactions


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. INSTALLMENTS (all from INSTALLMENTS dict)
-- ─────────────────────────────────────────────────────────────────────────────

-- JD-1001
INSERT INTO installments (account_id, type, amount, due_date, status, frequency) VALUES
    ('JD-1001', 'PM-KISAN Installment',    2000.00, '2026-06-01', 'upcoming', 'quarterly'),
    ('JD-1001', 'Crop Insurance Premium',   450.00,  '2026-05-20', 'upcoming', 'seasonal'),
    ('JD-1001', 'Electricity Bill',          300.00,  '2026-05-15', 'overdue',  'monthly');

-- SB-2001
INSERT INTO installments (account_id, type, amount, due_date, status, frequency) VALUES
    ('SB-2001', 'MGNREGA Wage Credit',     1200.00, '2026-05-28', 'upcoming', 'monthly'),
    ('SB-2001', 'Mobile Recharge',           100.00,  '2026-05-18', 'upcoming', 'monthly');

-- SB-2002
INSERT INTO installments (account_id, type, amount, due_date, status, frequency) VALUES
    ('SB-2002', 'LPG Cylinder Refill',      800.00,  '2026-05-25', 'upcoming', 'bi-monthly'),
    ('SB-2002', 'School Fees',              1200.00, '2026-06-05', 'upcoming', 'quarterly'),
    ('SB-2002', 'Insurance Premium',         500.00,  '2026-05-12', 'overdue',  'monthly');

-- SB-3001
INSERT INTO installments (account_id, type, amount, due_date, status, frequency) VALUES
    ('SB-3001', 'Shop Rent',               1500.00, '2026-05-10', 'overdue',  'monthly'),
    ('SB-3001', 'Mudra Loan EMI',           2500.00, '2026-05-20', 'upcoming', 'monthly'),
    ('SB-3001', 'Insurance Premium',         700.00,  '2026-06-01', 'upcoming', 'monthly');

-- JD-1002
INSERT INTO installments (account_id, type, amount, due_date, status, frequency) VALUES
    ('JD-1002', 'Widow Pension Credit',      500.00,  '2026-05-26', 'upcoming', 'monthly'),
    ('JD-1002', 'Medicine Expense',          300.00,  '2026-05-15', 'overdue',  'monthly');

-- NONE-0001 — no installments


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. LOANS (all from LOANS dict)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO loans (loan_id, account_id, loan_type, bank_name, principal, outstanding, emi_amount, interest_rate, tenure_months, remaining_emis, start_date, status) VALUES
    ('LN-KCC-001',   'JD-1001', 'Kisan Credit Card',   'State Bank of India', 50000.00, 32000.00, 2200.00, 4.0,  24, 15, '2025-08-01', 'active'),
    ('LN-PL-002',    'SB-2002', 'Personal Loan',       'Punjab National Bank', 30000.00, 18500.00, 1800.00, 10.5, 18, 11, '2025-10-15', 'active'),
    ('LN-MUDRA-003', 'SB-3001', 'Mudra Loan (Shishu)', 'Bank of Baroda',      50000.00, 35000.00, 2500.00, 7.5,  24, 14, '2025-07-01', 'active'),
    ('LN-OLD-004',   'SB-3001', 'Equipment Loan',      'Canara Bank',         20000.00, 0.00,     1200.00, 9.0,  18, 0,  '2024-01-01', 'closed');


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FIXED DEPOSITS (all from FIXED_DEPOSITS dict)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO fixed_deposits (fd_id, account_id, principal, duration_months, interest_rate, maturity_amount, interest_earned, start_date, maturity_date, status) VALUES
    ('FD-001', 'JD-1001', 10000.00, 12, 6.00, 10600.00, 600.00,  '2025-11-01', '2026-11-01', 'active'),
    ('FD-002', 'SB-3001', 25000.00, 24, 6.00, 28000.00, 3000.00, '2025-06-15', '2027-06-15', 'active');


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. GOVERNMENT SCHEMES (10 from SCHEMES_DB in mock_bank.py)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO government_schemes (name, description_hindi, description_kannada, eligibility_criteria, benefit_amount, frequency, how_to_apply) VALUES
    ('PM-KISAN',
     'Pradhan Mantri Kisan Samman Nidhi — kisaano ko saalana ₹6,000 seedhi madad, teen kiston mein.',
     'Pradhan Mantri Kisan Samman Nidhi — raitarigalige varshakke ₹6,000 nera sahaya, mooru kuntugalalli.',
     '{"occupation":["farmer"],"max_income":500000,"bpl_required":false,"land_required":true,"age_range":[18,80],"gender":"any"}'::JSONB,
     '₹6,000/year', '3 installments per year',
     'Visit nearest CSC centre or apply online at pmkisan.gov.in with Aadhaar and land records.'),

    ('Pradhan Mantri Jan Dhan Yojana',
     'Sab ke liye bank account — zero balance, RuPay card, aur ₹2 lakh ka durghatana bima.',
     'Ellarigoo bank account — zero balance, RuPay card, mattu ₹2 lakh apaghaata vime.',
     '{"occupation":["any"],"max_income":null,"bpl_required":false,"land_required":false,"age_range":[10,99],"gender":"any"}'::JSONB,
     'Zero balance account + ₹2 lakh accident insurance', 'One-time',
     'Visit any bank branch with Aadhaar card. No minimum balance required.'),

    ('PM Ujjwala Yojana',
     'BPL parivaar ki mahilaon ko muft LPG connection aur pehla cylinder.',
     'BPL kutumbada mahileyarigae uchita LPG connection mattu modala cylinder.',
     '{"occupation":["any"],"max_income":200000,"bpl_required":true,"land_required":false,"age_range":[18,99],"gender":"female"}'::JSONB,
     'Free LPG connection + first refill', 'One-time',
     'Apply at nearest LPG distributor with BPL card and Aadhaar.'),

    ('PM Fasal Bima Yojana',
     'Fasal ka bima — prakritik aapda ya keede se nuksan hone par muavza milega.',
     'Bele vime — naisargika vipatthu athava keeta haanige parahara siguttade.',
     '{"occupation":["farmer"],"max_income":null,"bpl_required":false,"land_required":true,"age_range":[18,70],"gender":"any"}'::JSONB,
     'Varies by crop and damage', 'Per crop season',
     'Apply through bank or CSC centre before sowing season with land records.'),

    ('Atal Pension Yojana',
     '60 saal ke baad har mahine ₹1,000 se ₹5,000 tak pension paayein.',
     '60 vayassinantara prati tingalu ₹1,000 rinda ₹5,000 varegu pension padeyiri.',
     '{"occupation":["any"],"max_income":null,"bpl_required":false,"land_required":false,"age_range":[18,40],"gender":"any"}'::JSONB,
     '₹1,000–₹5,000/month after age 60', 'Monthly (post-retirement)',
     'Open through any bank where you have a savings account. Auto-debit from account.'),

    ('PM Awas Yojana',
     'Gareebon ko pakka ghar banane ke liye ₹1.2 lakh ki madad.',
     'Badavarigae pakka mane kattalu ₹1.2 lakh sahaya.',
     '{"occupation":["any"],"max_income":300000,"bpl_required":true,"land_required":false,"age_range":[18,99],"gender":"any"}'::JSONB,
     '₹1,20,000 (rural) / ₹2,50,000 (urban)', 'One-time',
     'Apply through Gram Panchayat or municipal office with BPL card and Aadhaar.'),

    ('MGNREGA',
     'Har saal 100 din ka rozgaar guarantee — gram panchayat se kaam paayein.',
     'Prati varsha 100 dina udyoga khatri — grama panchayathininda kelasa padeyiri.',
     '{"occupation":["farmer","farm_labour","daily_wager","unemployed"],"max_income":null,"bpl_required":false,"land_required":false,"age_range":[18,65],"gender":"any"}'::JSONB,
     '₹250–₹350/day (varies by state)', 'Daily wage for up to 100 days/year',
     'Register at Gram Panchayat with Aadhaar. Get Job Card issued.'),

    ('Sukanya Samriddhi Yojana',
     'Beti ke bhavishya ke liye bachat yojana — 8% byaaj ke saath.',
     'Magaḷa bhavishyakke uchcha byaajadharada bachat yojane — 8% byaaja.',
     '{"occupation":["any"],"max_income":null,"bpl_required":false,"land_required":false,"age_range":[18,99],"gender":"any","has_daughter_under_10":true}'::JSONB,
     '8%+ interest on deposits', 'Annual deposits (min ₹250)',
     'Open at any post office or bank with daughter''s birth certificate and Aadhaar.'),

    ('PM Mudra Yojana',
     'Chhote vyapaariyon ko ₹50,000 se ₹10 lakh tak ka loan bina guarantee ke.',
     'Sanna udyamigaligae ₹50,000 rinda ₹10 lakh varegu saala bina guarantee.',
     '{"occupation":["shop_owner","self_employed"],"max_income":null,"bpl_required":false,"land_required":false,"age_range":[18,65],"gender":"any"}'::JSONB,
     'Loans: Shishu (₹50K), Kishore (₹5L), Tarun (₹10L)', 'One-time loan with repayment schedule',
     'Apply at any bank or NBFC with business plan and Aadhaar/PAN.'),

    ('Ayushman Bharat',
     'Garib parivaar ko saalana ₹5 lakh tak ka muft ilaaj — PMJAY card se.',
     'Badava kutumbakke varshakke ₹5 lakh varegu uchita chikitse — PMJAY card inda.',
     '{"occupation":["any"],"max_income":300000,"bpl_required":false,"land_required":false,"age_range":[0,99],"gender":"any"}'::JSONB,
     '₹5,00,000/year health cover per family', 'Annual',
     'Check eligibility at mera.pmjay.gov.in or nearest Ayushman Mitra at hospital.');


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SCHEMES DATABASE (50+ from schemes_database.json)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO schemes_database (id, name, ministry, description, benefits, eligibility, documents_required, tags, source_url) VALUES
    ('pm-kisan', 'PM Kisan Samman Nidhi', 'Agriculture', 'Income support to farmer families', '₹6,000/year in 3 installments of ₹2,000',
     '{"occupation":["farmer"],"gender":"any","age_min":18,"age_max":null,"bpl_required":false,"land_required":true,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Land records','Bank account'], ARRAY['farmer','income','agriculture'], 'https://pmkisan.gov.in'),

    ('pmjdy', 'Pradhan Mantri Jan Dhan Yojana', 'Finance', 'Zero balance bank account with RuPay card and insurance', 'Free account + ₹1L accident insurance + ₹10K overdraft',
     '{"occupation":["any"],"gender":"any","age_min":10,"age_max":null,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar or ID proof'], ARRAY['banking','unbanked','financial inclusion'], 'https://pmjdy.gov.in'),

    ('pm-ujjwala', 'PM Ujjwala Yojana', 'Petroleum', 'Free LPG connection to women from BPL households', 'Free LPG connection + first refill free',
     '{"occupation":["any"],"gender":"female","age_min":18,"age_max":null,"bpl_required":true,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','BPL card','Address proof'], ARRAY['women','BPL','cooking gas'], 'https://pmuy.gov.in'),

    ('pm-fasal-bima', 'PM Fasal Bima Yojana', 'Agriculture', 'Crop insurance against natural calamities', 'Full crop insurance at 2% premium for Kharif, 1.5% for Rabi',
     '{"occupation":["farmer"],"gender":"any","age_min":18,"age_max":null,"bpl_required":false,"land_required":true,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Land records','Bank account','Sowing certificate'], ARRAY['farmer','insurance','crop'], 'https://pmfby.gov.in'),

    ('atal-pension', 'Atal Pension Yojana', 'Finance', 'Pension for unorganised sector workers', '₹1,000-₹5,000 monthly pension after age 60',
     '{"occupation":["labour","farmer","any"],"gender":"any","age_min":18,"age_max":40,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Bank account','Mobile'], ARRAY['pension','retirement','savings'], 'https://npscra.nsdl.co.in'),

    ('ayushman-bharat', 'Ayushman Bharat PM-JAY', 'Health', 'Health insurance ₹5 lakh per family per year', '₹5 lakh cashless treatment at empanelled hospitals',
     '{"occupation":["any"],"gender":"any","age_min":null,"age_max":null,"bpl_required":true,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Ration card'], ARRAY['health','insurance','BPL','hospital'], 'https://pmjay.gov.in'),

    ('pm-awas-gramin', 'PM Awas Yojana Gramin', 'Rural Development', 'Financial help to build pucca house for rural poor', '₹1.2 lakh (plain) / ₹1.3 lakh (hilly areas)',
     '{"occupation":["any"],"gender":"any","age_min":18,"age_max":null,"bpl_required":true,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','BPL card','Land documents'], ARRAY['housing','rural','BPL'], 'https://pmayg.nic.in'),

    ('pm-mudra', 'PM Mudra Yojana', 'Finance', 'Loans up to ₹10 lakh for small business', 'Shishu: ₹50K | Kishore: ₹50K-5L | Tarun: ₹5L-10L',
     '{"occupation":["entrepreneur","any"],"gender":"any","age_min":18,"age_max":null,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','PAN','Business proof'], ARRAY['loan','business','entrepreneur','MSME'], 'https://mudra.org.in'),

    ('mgnrega', 'MGNREGA', 'Rural Development', '100 days guaranteed wage employment for rural households', '100 days work at ₹267-₹374/day (varies by state)',
     '{"occupation":["labour","any"],"gender":"any","age_min":18,"age_max":null,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Job card'], ARRAY['employment','rural','labour','wages'], 'https://nrega.nic.in'),

    ('sukanya-samriddhi', 'Sukanya Samriddhi Yojana', 'Finance', 'Savings for girl child education and marriage', '8.2% interest rate + tax benefits under 80C',
     '{"occupation":["any"],"gender":"female","age_min":0,"age_max":10,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Girl birth certificate','Parent Aadhaar'], ARRAY['girl child','savings','education','women'], 'https://nsiindia.gov.in'),

    ('kisan-credit-card', 'Kisan Credit Card', 'Agriculture', 'Short-term credit for farmers at subsidised interest', 'Loan up to ₹5 lakh at 4% interest (with subvention)',
     '{"occupation":["farmer"],"gender":"any","age_min":18,"age_max":75,"bpl_required":false,"land_required":true,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Land records','Bank account'], ARRAY['farmer','loan','credit','agriculture'], 'https://pmkisan.gov.in'),

    ('pm-matru-vandana', 'PM Matru Vandana Yojana', 'Women & Child', 'Cash incentive for pregnant women (first child)', '₹5,000 in 3 installments for first pregnancy',
     '{"occupation":["any"],"gender":"female","age_min":19,"age_max":null,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','MCP card','Bank account'], ARRAY['women','maternity','health','pregnancy'], 'https://pmmvy.wcd.gov.in'),

    ('pm-suraksha-bima', 'PM Suraksha Bima Yojana', 'Finance', 'Accident insurance at ₹20/year', '₹2 lakh for death/disability, ₹1 lakh partial disability',
     '{"occupation":["any"],"gender":"any","age_min":18,"age_max":70,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Bank account'], ARRAY['insurance','accident','cheap'], 'https://jansuraksha.gov.in'),

    ('pm-jeevan-jyoti', 'PM Jeevan Jyoti Bima', 'Finance', 'Life insurance at ₹436/year', '₹2 lakh life cover on death from any cause',
     '{"occupation":["any"],"gender":"any","age_min":18,"age_max":55,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Bank account'], ARRAY['insurance','life','cheap'], 'https://jansuraksha.gov.in'),

    ('stand-up-india', 'Stand Up India', 'Finance', 'Loans for SC/ST and women entrepreneurs', '₹10 lakh to ₹1 crore for greenfield enterprise',
     '{"occupation":["entrepreneur"],"gender":"any","age_min":18,"age_max":null,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','PAN','Business plan','Caste certificate'], ARRAY['entrepreneur','SC/ST','women','loan'], 'https://standupmitra.in'),

    ('pm-vishwakarma', 'PM Vishwakarma Yojana', 'MSME', 'Support for traditional artisans and craftspeople', '₹3 lakh loan + skill training + ₹500/day stipend',
     '{"occupation":["labour","entrepreneur"],"gender":"any","age_min":18,"age_max":null,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Artisan proof'], ARRAY['artisan','craftsman','loan','skill'], 'https://pmvishwakarma.gov.in'),

    ('day-nrlm', 'DAY-NRLM (Aajeevika)', 'Rural Development', 'Self-help groups for rural women''s livelihoods', 'Revolving fund ₹15K + bank credit up to ₹3 lakh',
     '{"occupation":["any"],"gender":"female","age_min":18,"age_max":null,"bpl_required":true,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','BPL card'], ARRAY['women','SHG','livelihood','rural'], 'https://aajeevika.gov.in'),

    ('pm-surya-ghar', 'PM Surya Ghar Muft Bijli', 'New & Renewable Energy', 'Free electricity via rooftop solar panels', 'Up to 300 units free electricity/month + ₹78K subsidy',
     '{"occupation":["any"],"gender":"any","age_min":18,"age_max":null,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Electricity bill','House ownership'], ARRAY['solar','electricity','energy','subsidy'], 'https://pmsuryaghar.gov.in'),

    ('janani-suraksha', 'Janani Suraksha Yojana', 'Health', 'Cash help for institutional delivery (hospital birth)', '₹1,400 (rural) / ₹1,000 (urban) per delivery',
     '{"occupation":["any"],"gender":"female","age_min":19,"age_max":null,"bpl_required":true,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','BPL card','MCP card'], ARRAY['women','maternity','health','BPL'], 'https://nhm.gov.in'),

    ('pmsby', 'PM Shram Yogi Maandhan', 'Labour', 'Pension for unorganised workers', '₹3,000/month pension after age 60',
     '{"occupation":["labour"],"gender":"any","age_min":18,"age_max":40,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Bank account','Mobile'], ARRAY['pension','labour','unorganised'], 'https://maandhan.in'),

    ('soil-health-card', 'Soil Health Card Scheme', 'Agriculture', 'Free soil testing and nutrient recommendations', 'Free soil analysis + fertilizer recommendations',
     '{"occupation":["farmer"],"gender":"any","age_min":18,"age_max":null,"bpl_required":false,"land_required":true,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Land records'], ARRAY['farmer','soil','agriculture'], 'https://soilhealth.dac.gov.in'),

    ('pm-kaushal-vikas', 'PM Kaushal Vikas Yojana', 'Skill Development', 'Free skill training and certification for youth', 'Free training + certificate + placement support',
     '{"occupation":["any"],"gender":"any","age_min":15,"age_max":45,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Class 10 marksheet'], ARRAY['skill','training','youth','employment'], 'https://pmkvyofficial.org'),

    ('digital-india', 'Digital India — CSC Services', 'Electronics & IT', 'Digital services access in rural areas via CSC centres', 'Access to 400+ government services near your village',
     '{"occupation":["any"],"gender":"any","age_min":null,"age_max":null,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar'], ARRAY['digital','rural','services'], 'https://csc.gov.in'),

    ('national-pension', 'National Pension System', 'Finance', 'Voluntary pension for all citizens', 'Market-linked returns + tax benefits up to ₹2 lakh',
     '{"occupation":["any"],"gender":"any","age_min":18,"age_max":70,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','PAN','Bank account'], ARRAY['pension','savings','retirement'], 'https://npscra.nsdl.co.in'),

    ('pm-awas-urban', 'PM Awas Yojana Urban', 'Housing', 'Affordable housing for urban poor', '₹2.67 lakh subsidy on home loan interest',
     '{"occupation":["any"],"gender":"any","age_min":18,"age_max":null,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Income proof','No house certificate'], ARRAY['housing','urban','subsidy'], 'https://pmaymis.gov.in'),

    ('mid-day-meal', 'PM Poshan (Mid Day Meal)', 'Education', 'Free nutritious lunch for school children', 'Free hot cooked meal every school day',
     '{"occupation":["any"],"gender":"any","age_min":6,"age_max":14,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['School enrollment'], ARRAY['education','children','nutrition','food'], 'https://mdm.gov.in'),

    ('beti-bachao', 'Beti Bachao Beti Padhao', 'Women & Child', 'Campaign for survival, protection and education of girl child', 'Awareness + institutional support + incentives',
     '{"occupation":["any"],"gender":"female","age_min":0,"age_max":18,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Birth certificate'], ARRAY['girl child','education','women'], 'https://wcd.nic.in'),

    ('ujjwala-2', 'Ujjwala 2.0', 'Petroleum', 'Extended LPG subsidy for migrants without address proof', 'Free LPG connection with self-declaration for address',
     '{"occupation":["any"],"gender":"female","age_min":18,"age_max":null,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Self-declaration'], ARRAY['women','cooking gas','migrant'], 'https://pmuy.gov.in'),

    ('swachh-bharat-gramin', 'Swachh Bharat Mission Gramin', 'Jal Shakti', 'Financial help for building household toilet', '₹12,000 for toilet construction',
     '{"occupation":["any"],"gender":"any","age_min":18,"age_max":null,"bpl_required":true,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','BPL card'], ARRAY['sanitation','rural','toilet','BPL'], 'https://swachhbharat.mygov.in'),

    ('jal-jeevan', 'Jal Jeevan Mission', 'Jal Shakti', 'Tap water connection to every rural household', 'Free tap water connection (55 lpcd)',
     '{"occupation":["any"],"gender":"any","age_min":null,"age_max":null,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Address proof'], ARRAY['water','rural','drinking water'], 'https://jaljeevanmission.gov.in'),

    ('free-ration', 'PM Garib Kalyan Anna Yojana', 'Consumer Affairs', 'Free food grains for 80 crore people', '5 kg rice/wheat + 1 kg dal free per person/month',
     '{"occupation":["any"],"gender":"any","age_min":null,"age_max":null,"bpl_required":true,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Ration card','Aadhaar'], ARRAY['food','ration','BPL','free grain'], 'https://nfsa.gov.in'),

    ('agri-infra-fund', 'Agriculture Infrastructure Fund', 'Agriculture', 'Loan for post-harvest infrastructure', '₹2 crore loan with 3% interest subvention',
     '{"occupation":["farmer","entrepreneur"],"gender":"any","age_min":18,"age_max":null,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','PAN','Project report'], ARRAY['farmer','infrastructure','loan','agriculture'], 'https://agriinfra.dac.gov.in'),

    ('e-shram', 'e-Shram Card', 'Labour', 'National database for unorganised workers', '₹2 lakh accidental insurance + scheme access',
     '{"occupation":["labour"],"gender":"any","age_min":16,"age_max":59,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Mobile','Bank account'], ARRAY['labour','insurance','registration','unorganised'], 'https://eshram.gov.in'),

    ('namo-drone-didi', 'Namo Drone Didi', 'Agriculture', 'Drones to women SHGs for precision agriculture', 'Free drone + training + ₹15,000/month earning potential',
     '{"occupation":["farmer"],"gender":"female","age_min":18,"age_max":null,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','SHG membership'], ARRAY['women','farmer','technology','drone'], 'https://agriculture.gov.in'),

    ('pm-svanidhi', 'PM SVANidhi', 'Housing', 'Micro-credit for street vendors', '₹10K-₹50K working capital loan at subsidised rate',
     '{"occupation":["entrepreneur"],"gender":"any","age_min":18,"age_max":null,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Vendor certificate','Bank account'], ARRAY['street vendor','loan','micro-credit'], 'https://pmsvanidhi.mohua.gov.in'),

    ('pradhan-mantri-gram-sadak', 'PM Gram Sadak Yojana', 'Rural Development', 'All-weather road connectivity to rural areas', 'Pucca road to habitations with 500+ population',
     '{"occupation":["any"],"gender":"any","age_min":null,"age_max":null,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY[]::TEXT[], ARRAY['rural','road','infrastructure'], 'https://pmgsy.nic.in'),

    ('samagra-shiksha', 'Samagra Shiksha Abhiyan', 'Education', 'Holistic education from pre-school to class 12', 'Free textbooks + uniform allowance + teacher training',
     '{"occupation":["any"],"gender":"any","age_min":3,"age_max":18,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['School enrollment','Aadhaar'], ARRAY['education','children','school'], 'https://samagra.education.gov.in'),

    ('one-nation-one-ration', 'One Nation One Ration Card', 'Consumer Affairs', 'Use ration card anywhere in India', 'Get subsidised ration from any fair price shop nationwide',
     '{"occupation":["any"],"gender":"any","age_min":null,"age_max":null,"bpl_required":true,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Ration card','Aadhaar'], ARRAY['food','ration','migrant','BPL'], 'https://nfsa.gov.in'),

    ('national-social-pension', 'National Social Assistance Programme', 'Rural Development', 'Pension for elderly, widows and disabled', '₹200-₹500/month pension (states add more)',
     '{"occupation":["any"],"gender":"any","age_min":60,"age_max":null,"bpl_required":true,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Age proof','BPL card'], ARRAY['pension','elderly','widow','disabled','BPL'], 'https://nsap.nic.in'),

    ('deen-dayal-upadhyaya', 'Deen Dayal Upadhyaya Grameen Kaushalya', 'Rural Development', 'Skill training for rural youth (15-35 years)', 'Free training + placement + ₹1,500 stipend/month',
     '{"occupation":["any"],"gender":"any","age_min":15,"age_max":35,"bpl_required":true,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','BPL card','Class 10 marksheet'], ARRAY['skill','training','youth','rural','employment'], 'https://ddugky.gov.in'),

    ('national-health-mission', 'National Health Mission', 'Health', 'Free healthcare at government hospitals', 'Free OPD + medicines + diagnostics + surgeries',
     '{"occupation":["any"],"gender":"any","age_min":null,"age_max":null,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar'], ARRAY['health','hospital','free treatment'], 'https://nhm.gov.in'),

    ('pmegp', 'PM Employment Generation Programme', 'MSME', 'Loans for new micro enterprises', '₹10-50 lakh with 15-35% subsidy on project cost',
     '{"occupation":["entrepreneur"],"gender":"any","age_min":18,"age_max":null,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','PAN','Project report','Class 8 pass'], ARRAY['entrepreneur','loan','subsidy','MSME'], 'https://kviconline.gov.in'),

    ('annapurna', 'Annapurna Scheme', 'Food', 'Free food grains for destitute senior citizens', '10 kg free food grains per month',
     '{"occupation":["any"],"gender":"any","age_min":65,"age_max":null,"bpl_required":true,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Age proof','Income certificate'], ARRAY['elderly','food','BPL','senior citizen'], 'https://dfpd.gov.in'),

    ('scholarship-sc-st', 'Pre-Matric Scholarship SC/ST', 'Social Justice', 'Scholarships for SC/ST students class 1-10', '₹150-₹350/month + book allowance',
     '{"occupation":["any"],"gender":"any","age_min":6,"age_max":16,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Caste certificate','School enrollment','Income proof'], ARRAY['education','SC/ST','scholarship','children'], 'https://scholarships.gov.in'),

    ('post-matric-scholarship', 'Post-Matric Scholarship SC/ST', 'Social Justice', 'Scholarships for SC/ST students class 11+', 'Full tuition fees + ₹1,200/month maintenance',
     '{"occupation":["any"],"gender":"any","age_min":16,"age_max":null,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Caste certificate','College enrollment','Income proof'], ARRAY['education','SC/ST','scholarship','youth'], 'https://scholarships.gov.in'),

    ('rashtriya-swasthya-bima', 'Rashtriya Swasthya Bima Yojana', 'Labour', 'Health insurance for BPL families in unorganised sector', '₹30,000 hospitalisation cover for family of 5',
     '{"occupation":["labour"],"gender":"any","age_min":null,"age_max":null,"bpl_required":true,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','BPL card','RSBY smart card'], ARRAY['health','insurance','labour','BPL'], 'https://labour.gov.in'),

    ('national-livelihood-urban', 'DAY-NULM (Urban Livelihoods)', 'Housing', 'Self-employment and skill training for urban poor', 'Interest subsidy + ₹2-10 lakh for self-employment',
     '{"occupation":["labour","entrepreneur"],"gender":"any","age_min":18,"age_max":null,"bpl_required":true,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','BPL card','Address proof'], ARRAY['urban','livelihood','loan','skill'], 'https://nulm.gov.in'),

    ('indira-gandhi-widow', 'Indira Gandhi Widow Pension', 'Rural Development', 'Monthly pension for widows from BPL families', '₹300/month (central) + state top-up',
     '{"occupation":["any"],"gender":"female","age_min":40,"age_max":79,"bpl_required":true,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Husband death certificate','BPL card'], ARRAY['widow','pension','BPL','women'], 'https://nsap.nic.in'),

    ('indira-gandhi-disability', 'Indira Gandhi Disability Pension', 'Rural Development', 'Monthly pension for disabled BPL persons', '₹300/month (central) + state top-up',
     '{"occupation":["any"],"gender":"any","age_min":18,"age_max":79,"bpl_required":true,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Disability certificate','BPL card'], ARRAY['disabled','pension','BPL'], 'https://nsap.nic.in'),

    ('livestock-insurance', 'Livestock Insurance Scheme', 'Animal Husbandry', 'Insurance for cattle and livestock', 'Coverage at 50% subsidy on premium',
     '{"occupation":["farmer"],"gender":"any","age_min":18,"age_max":null,"bpl_required":false,"land_required":false,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Cattle ownership proof'], ARRAY['farmer','livestock','insurance','cattle'], 'https://dahd.gov.in'),

    ('krishi-sinchai', 'PM Krishi Sinchai Yojana', 'Agriculture', 'Efficient irrigation to every farm (Har Khet Ko Pani)', '55-100% subsidy on drip/sprinkler irrigation',
     '{"occupation":["farmer"],"gender":"any","age_min":18,"age_max":null,"bpl_required":false,"land_required":true,"state":"all"}'::JSONB,
     ARRAY['Aadhaar','Land records'], ARRAY['farmer','irrigation','water','agriculture'], 'https://pmksy.gov.in');


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. FRAUD RED FLAGS (all phrases from FRAUD_RED_FLAGS list in mock_bank.py)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO fraud_red_flags (phrase, language) VALUES
    ('otp batao',                   'hindi'),
    ('otp share',                   'hindi'),
    ('otp bata do',                 'hindi'),
    ('pin share karo',              'hindi'),
    ('pin batao',                   'hindi'),
    ('pin bata do',                 'hindi'),
    ('bank official bol raha hoon', 'hindi'),
    ('bank se bol raha hoon',       'hindi'),
    ('aapka account band hoga',     'hindi'),
    ('account block ho jayega',     'hindi'),
    ('prize jeeta hai',             'hindi'),
    ('lottery jeeti hai',           'hindi'),
    ('aapne prize jeeta',           'hindi'),
    ('kyc update karo abhi',        'hindi'),
    ('kyc expire ho gaya',          'hindi'),
    ('link pe click karo',          'hindi'),
    ('paisa double',                'hindi'),
    ('urgent payment',              'english'),
    ('fine lagega',                  'hindi'),
    ('police case hoga',            'hindi');


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. FAMILY CONTACTS (from DUMMY_USERS in fraud_detection_agent.py)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO family_contacts (account_id, name, relation, email) VALUES
    ('JD-1001',   'Suresh Kumar',      'Beta (Son)',       'suresh.kumar.demo@gmail.com'),
    ('SB-2001',   'Ravi Gowda',        'Maga (Son)',       'ravi.gowda.demo@gmail.com'),
    ('SB-2002',   'Rajesh Devi',       'Pati (Husband)',   'rajesh.devi.demo@gmail.com'),
    ('SB-3001',   'Priya Singh',       'Patni (Wife)',     'priya.singh.demo@gmail.com'),
    ('JD-1002',   'Ayesha Bi',         'Beti (Daughter)',  'ayesha.bi.demo@gmail.com'),
    ('NONE-0001', 'Venkatesh Nayak',   'Anna (Brother)',   'venkatesh.nayak.demo@gmail.com');


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. API KEY USAGE (3 Gemini keys, all active)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO api_key_usage (key_index, calls_today, last_used_at, is_active, error_count, day_reset_at) VALUES
    (0, 0, NULL, TRUE, 0, now()),
    (1, 0, NULL, TRUE, 0, now()),
    (2, 0, NULL, TRUE, 0, now());


-- =============================================================================
-- END OF SEED DATA
-- =============================================================================
