"""
mock_bank.py — Artha AI Mock Bank Simulation Backend
A fake bank backend for hackathon demo. No real bank connections.
All data is in-memory. Python standard library only.
"""

import copy
from datetime import datetime, timedelta

# ─── ACCOUNTS DATABASE ───────────────────────────────────────────────

ACCOUNTS = {
    "JD-1001": {
        "account_id": "JD-1001",
        "name": "Ramesh Kumar",
        "age": 45,
        "gender": "male",
        "language": {"primary": "hindi", "display_languages": ["hindi", "english"]},
        "occupation": "farmer",
        "location": "Barabanki",
        "location_type": "village",
        "state": "Uttar Pradesh",
        "balance": 4200.0,
        "account_type": "Jan Dhan",
        "linked_aadhaar": "234567890123",
        "linked_schemes": ["PM-KISAN", "PMJDY"],
        "transaction_history": [
            {"date": "2026-04-25", "type": "credit", "amount": 2000.0, "description": "PM-KISAN installment"},
            {"date": "2026-04-20", "type": "debit", "amount": 500.0, "description": "Fertilizer purchase"},
            {"date": "2026-04-15", "type": "credit", "amount": 1500.0, "description": "Crop sale"},
            {"date": "2026-04-10", "type": "debit", "amount": 300.0, "description": "Electricity bill"},
            {"date": "2026-04-05", "type": "debit", "amount": 200.0, "description": "Mobile recharge"},
        ],
        "has_smartphone": False,
        "phone_number": "9876543210",
        "bpl_card": False,
        "land_acres": 2.5,
        "fraud_history": False,
        "fraud_notes": None,
    },
    "SB-2001": {
        "account_id": "SB-2001",
        "name": "Savitha Gowda",
        "age": 32,
        "gender": "female",
        "language": {"primary": "kannada", "display_languages": ["kannada", "english"]},
        "occupation": "farm_labour",
        "location": "Mandya",
        "location_type": "village",
        "state": "Karnataka",
        "balance": 1800.0,
        "account_type": "savings",
        "linked_aadhaar": "345678901234",
        "linked_schemes": ["MGNREGA"],
        "transaction_history": [
            {"date": "2026-04-28", "type": "credit", "amount": 1200.0, "description": "MGNREGA wages"},
            {"date": "2026-04-22", "type": "debit", "amount": 400.0, "description": "Ration purchase"},
            {"date": "2026-04-18", "type": "debit", "amount": 100.0, "description": "Mobile recharge"},
            {"date": "2026-04-12", "type": "credit", "amount": 800.0, "description": "Daily wage payment"},
            {"date": "2026-04-06", "type": "debit", "amount": 250.0, "description": "Medical expense"},
        ],
        "has_smartphone": False,
        "phone_number": "9876543211",
        "bpl_card": True,
        "land_acres": None,
        "fraud_history": False,
        "fraud_notes": None,
    },
    "SB-2002": {
        "account_id": "SB-2002",
        "name": "Meera Devi",
        "age": 38,
        "gender": "female",
        "language": {"primary": "hindi", "display_languages": ["tamil", "hindi", "english"]},
        "occupation": "homemaker",
        "location": "Thanjavur",
        "location_type": "town",
        "state": "Tamil Nadu",
        "balance": 6500.0,
        "account_type": "savings",
        "linked_aadhaar": "456789012345",
        "linked_schemes": ["PM Ujjwala Yojana", "Ayushman Bharat"],
        "transaction_history": [
            {"date": "2026-04-27", "type": "debit", "amount": 800.0, "description": "LPG cylinder refill"},
            {"date": "2026-04-21", "type": "credit", "amount": 3000.0, "description": "Husband salary transfer"},
            {"date": "2026-04-16", "type": "debit", "amount": 1200.0, "description": "School fees"},
            {"date": "2026-04-11", "type": "debit", "amount": 350.0, "description": "Electricity bill"},
            {"date": "2026-04-04", "type": "credit", "amount": 500.0, "description": "Savings deposit"},
        ],
        "has_smartphone": True,
        "phone_number": "9876543212",
        "bpl_card": False,
        "land_acres": None,
        "fraud_history": False,
        "fraud_notes": None,
    },
    "SB-3001": {
        "account_id": "SB-3001",
        "name": "Arjun Singh",
        "age": 40,
        "gender": "male",
        "language": {"primary": "hindi", "display_languages": ["hindi", "english"]},
        "occupation": "shop_owner",
        "location": "Varanasi",
        "location_type": "city",
        "state": "Uttar Pradesh",
        "balance": 22000.0,
        "account_type": "savings",
        "linked_aadhaar": "567890123456",
        "linked_schemes": ["PM Mudra Yojana"],
        "gst_number": "09ABCDE1234F1Z5",
        "transaction_history": [
            {"date": "2026-04-29", "type": "credit", "amount": 8000.0, "description": "Shop sales"},
            {"date": "2026-04-24", "type": "debit", "amount": 5000.0, "description": "Wholesale stock purchase"},
            {"date": "2026-04-19", "type": "debit", "amount": 1500.0, "description": "Shop rent"},
            {"date": "2026-04-14", "type": "credit", "amount": 3500.0, "description": "UPI collections"},
            {"date": "2026-04-09", "type": "debit", "amount": 700.0, "description": "Insurance premium"},
        ],
        "has_smartphone": True,
        "phone_number": "9876543213",
        "bpl_card": False,
        "land_acres": None,
        "fraud_history": False,
        "fraud_notes": None,
    },
    "JD-1002": {
        "account_id": "JD-1002",
        "name": "Fatima Bi",
        "age": 55,
        "gender": "female",
        "language": {"primary": "hindi", "display_languages": ["urdu", "hindi"]},
        "occupation": "unemployed",
        "location": "Gulbarga",
        "location_type": "town",
        "state": "Karnataka",
        "balance": 900.0,
        "account_type": "Jan Dhan",
        "linked_aadhaar": "678901234567",
        "linked_schemes": ["PMJDY"],
        "transaction_history": [
            {"date": "2026-04-26", "type": "credit", "amount": 500.0, "description": "Widow pension"},
            {"date": "2026-04-20", "type": "debit", "amount": 300.0, "description": "Medicine purchase"},
            {"date": "2026-04-15", "type": "credit", "amount": 500.0, "description": "Govt aid transfer"},
            {"date": "2026-04-08", "type": "debit", "amount": 200.0, "description": "Ration purchase"},
            {"date": "2026-04-02", "type": "debit", "amount": 150.0, "description": "Electricity bill"},
        ],
        "has_smartphone": False,
        "phone_number": "9876543214",
        "bpl_card": True,
        "land_acres": None,
        "fraud_history": False,
        "fraud_notes": None,
    },
    "NONE-0001": {
        "account_id": "NONE-0001",
        "name": "Suresh Nayak",
        "age": 28,
        "gender": "male",
        "language": {"primary": "kannada", "display_languages": ["kannada"]},
        "occupation": "daily_wager",
        "location": "Raichur",
        "location_type": "village",
        "state": "Karnataka",
        "balance": 0.0,
        "account_type": "none",
        "linked_aadhaar": "789012345678",
        "linked_schemes": [],
        "transaction_history": [],
        "has_smartphone": False,
        "phone_number": "9876543215",
        "bpl_card": True,
        "land_acres": None,
        "fraud_history": False,
        "fraud_notes": None,
    },
}


# ─── INSTALLMENTS DATABASE ────────────────────────────────────────────

INSTALLMENTS = {
    "JD-1001": [
        {"type": "PM-KISAN Installment", "amount": 2000.0, "due_date": "2026-06-01", "status": "upcoming", "frequency": "quarterly"},
        {"type": "Crop Insurance Premium", "amount": 450.0, "due_date": "2026-05-20", "status": "upcoming", "frequency": "seasonal"},
        {"type": "Electricity Bill", "amount": 300.0, "due_date": "2026-05-15", "status": "overdue", "frequency": "monthly"},
    ],
    "SB-2001": [
        {"type": "MGNREGA Wage Credit", "amount": 1200.0, "due_date": "2026-05-28", "status": "upcoming", "frequency": "monthly"},
        {"type": "Mobile Recharge", "amount": 100.0, "due_date": "2026-05-18", "status": "upcoming", "frequency": "monthly"},
    ],
    "SB-2002": [
        {"type": "LPG Cylinder Refill", "amount": 800.0, "due_date": "2026-05-25", "status": "upcoming", "frequency": "bi-monthly"},
        {"type": "School Fees", "amount": 1200.0, "due_date": "2026-06-05", "status": "upcoming", "frequency": "quarterly"},
        {"type": "Insurance Premium", "amount": 500.0, "due_date": "2026-05-12", "status": "overdue", "frequency": "monthly"},
    ],
    "SB-3001": [
        {"type": "Shop Rent", "amount": 1500.0, "due_date": "2026-05-10", "status": "overdue", "frequency": "monthly"},
        {"type": "Mudra Loan EMI", "amount": 2500.0, "due_date": "2026-05-20", "status": "upcoming", "frequency": "monthly"},
        {"type": "Insurance Premium", "amount": 700.0, "due_date": "2026-06-01", "status": "upcoming", "frequency": "monthly"},
    ],
    "JD-1002": [
        {"type": "Widow Pension Credit", "amount": 500.0, "due_date": "2026-05-26", "status": "upcoming", "frequency": "monthly"},
        {"type": "Medicine Expense", "amount": 300.0, "due_date": "2026-05-15", "status": "overdue", "frequency": "monthly"},
    ],
    "NONE-0001": [],
}


# ─── LOANS DATABASE ──────────────────────────────────────────────────

LOANS = {
    "JD-1001": [
        {
            "loan_id": "LN-KCC-001",
            "loan_type": "Kisan Credit Card",
            "bank_name": "State Bank of India",
            "principal": 50000.0,
            "outstanding": 32000.0,
            "emi_amount": 2200.0,
            "interest_rate": 4.0,
            "tenure_months": 24,
            "remaining_emis": 15,
            "start_date": "2025-08-01",
            "status": "active",
        },
    ],
    "SB-2001": [],
    "SB-2002": [
        {
            "loan_id": "LN-PL-002",
            "loan_type": "Personal Loan",
            "bank_name": "Punjab National Bank",
            "principal": 30000.0,
            "outstanding": 18500.0,
            "emi_amount": 1800.0,
            "interest_rate": 10.5,
            "tenure_months": 18,
            "remaining_emis": 11,
            "start_date": "2025-10-15",
            "status": "active",
        },
    ],
    "SB-3001": [
        {
            "loan_id": "LN-MUDRA-003",
            "loan_type": "Mudra Loan (Shishu)",
            "bank_name": "Bank of Baroda",
            "principal": 50000.0,
            "outstanding": 35000.0,
            "emi_amount": 2500.0,
            "interest_rate": 7.5,
            "tenure_months": 24,
            "remaining_emis": 14,
            "start_date": "2025-07-01",
            "status": "active",
        },
        {
            "loan_id": "LN-OLD-004",
            "loan_type": "Equipment Loan",
            "bank_name": "Canara Bank",
            "principal": 20000.0,
            "outstanding": 0.0,
            "emi_amount": 1200.0,
            "interest_rate": 9.0,
            "tenure_months": 18,
            "remaining_emis": 0,
            "start_date": "2024-01-01",
            "status": "closed",
        },
    ],
    "JD-1002": [],
    "NONE-0001": [],
}


# ─── SPENDING LIMITS DATABASE ────────────────────────────────────────

SPENDING_LIMITS = {
    "JD-1001": {"monthly_limit": 3000.0},
    "SB-2001": {"monthly_limit": 2000.0},
    "SB-2002": {"monthly_limit": 5000.0},
    "SB-3001": {"monthly_limit": 10000.0},
    "JD-1002": {"monthly_limit": 1500.0},
    "NONE-0001": {"monthly_limit": 0.0},
}


# ─── FIXED DEPOSITS DATABASE ─────────────────────────────────────────

FD_INTEREST_RATE = 6.0  # Fixed 6% simple interest for all FDs

# In-memory store for FDs keyed by account_id
FIXED_DEPOSITS = {
    "JD-1001": [
        {
            "fd_id": "FD-001",
            "principal": 10000.0,
            "duration_months": 12,
            "interest_rate": FD_INTEREST_RATE,
            "maturity_amount": 10600.0,
            "interest_earned": 600.0,
            "start_date": "2025-11-01",
            "maturity_date": "2026-11-01",
            "status": "active",
        },
    ],
    "SB-2001": [],
    "SB-2002": [],
    "SB-3001": [
        {
            "fd_id": "FD-002",
            "principal": 25000.0,
            "duration_months": 24,
            "interest_rate": FD_INTEREST_RATE,
            "maturity_amount": 28000.0,
            "interest_earned": 3000.0,
            "start_date": "2025-06-15",
            "maturity_date": "2027-06-15",
            "status": "active",
        },
    ],
    "JD-1002": [],
    "NONE-0001": [],
}


# ─── SCHEMES DATABASE ─────────────────────────────────────────────────

SCHEMES_DB = {
    "PM-KISAN": {
        "name": "PM-KISAN",
        "description_hindi": "Pradhan Mantri Kisan Samman Nidhi — kisaano ko saalana ₹6,000 seedhi madad, teen kiston mein.",
        "description_kannada": "Pradhan Mantri Kisan Samman Nidhi — raitarigalige varshakke ₹6,000 nera sahaya, mooru kuntugalalli.",
        "eligibility_criteria": {
            "occupation": ["farmer"],
            "max_income": 500000,
            "bpl_required": False,
            "land_required": True,
            "age_range": [18, 80],
            "gender": "any",
        },
        "benefit_amount": "₹6,000/year",
        "frequency": "3 installments per year",
        "how_to_apply": "Visit nearest CSC centre or apply online at pmkisan.gov.in with Aadhaar and land records.",
    },
    "PMJDY": {
        "name": "Pradhan Mantri Jan Dhan Yojana",
        "description_hindi": "Sab ke liye bank account — zero balance, RuPay card, aur ₹2 lakh ka durghatana bima.",
        "description_kannada": "Ellarigoo bank account — zero balance, RuPay card, mattu ₹2 lakh apaghaata vime.",
        "eligibility_criteria": {
            "occupation": ["any"],
            "max_income": None,
            "bpl_required": False,
            "land_required": False,
            "age_range": [10, 99],
            "gender": "any",
        },
        "benefit_amount": "Zero balance account + ₹2 lakh accident insurance",
        "frequency": "One-time",
        "how_to_apply": "Visit any bank branch with Aadhaar card. No minimum balance required.",
    },
    "PM Ujjwala Yojana": {
        "name": "PM Ujjwala Yojana",
        "description_hindi": "BPL parivaar ki mahilaon ko muft LPG connection aur pehla cylinder.",
        "description_kannada": "BPL kutumbada mahileyarigae uchita LPG connection mattu modala cylinder.",
        "eligibility_criteria": {
            "occupation": ["any"],
            "max_income": 200000,
            "bpl_required": True,
            "land_required": False,
            "age_range": [18, 99],
            "gender": "female",
        },
        "benefit_amount": "Free LPG connection + first refill",
        "frequency": "One-time",
        "how_to_apply": "Apply at nearest LPG distributor with BPL card and Aadhaar.",
    },
    "PM Fasal Bima Yojana": {
        "name": "PM Fasal Bima Yojana",
        "description_hindi": "Fasal ka bima — prakritik aapda ya keede se nuksan hone par muavza milega.",
        "description_kannada": "Bele vime — naisargika vipatthu athava keeta haanige parahara siguttade.",
        "eligibility_criteria": {
            "occupation": ["farmer"],
            "max_income": None,
            "bpl_required": False,
            "land_required": True,
            "age_range": [18, 70],
            "gender": "any",
        },
        "benefit_amount": "Varies by crop and damage",
        "frequency": "Per crop season",
        "how_to_apply": "Apply through bank or CSC centre before sowing season with land records.",
    },
    "Atal Pension Yojana": {
        "name": "Atal Pension Yojana",
        "description_hindi": "60 saal ke baad har mahine ₹1,000 se ₹5,000 tak pension paayein.",
        "description_kannada": "60 vayassinantara prati tingalu ₹1,000 rinda ₹5,000 varegu pension padeyiri.",
        "eligibility_criteria": {
            "occupation": ["any"],
            "max_income": None,
            "bpl_required": False,
            "land_required": False,
            "age_range": [18, 40],
            "gender": "any",
        },
        "benefit_amount": "₹1,000–₹5,000/month after age 60",
        "frequency": "Monthly (post-retirement)",
        "how_to_apply": "Open through any bank where you have a savings account. Auto-debit from account.",
    },
    "PM Awas Yojana": {
        "name": "PM Awas Yojana",
        "description_hindi": "Gareebon ko pakka ghar banane ke liye ₹1.2 lakh ki madad.",
        "description_kannada": "Badavarigae pakka mane kattalu ₹1.2 lakh sahaya.",
        "eligibility_criteria": {
            "occupation": ["any"],
            "max_income": 300000,
            "bpl_required": True,
            "land_required": False,
            "age_range": [18, 99],
            "gender": "any",
        },
        "benefit_amount": "₹1,20,000 (rural) / ₹2,50,000 (urban)",
        "frequency": "One-time",
        "how_to_apply": "Apply through Gram Panchayat or municipal office with BPL card and Aadhaar.",
    },
    "MGNREGA": {
        "name": "MGNREGA",
        "description_hindi": "Har saal 100 din ka rozgaar guarantee — gram panchayat se kaam paayein.",
        "description_kannada": "Prati varsha 100 dina udyoga khatri — grama panchayathininda kelasa padeyiri.",
        "eligibility_criteria": {
            "occupation": ["farmer", "farm_labour", "daily_wager", "unemployed"],
            "max_income": None,
            "bpl_required": False,
            "land_required": False,
            "age_range": [18, 65],
            "gender": "any",
        },
        "benefit_amount": "₹250–₹350/day (varies by state)",
        "frequency": "Daily wage for up to 100 days/year",
        "how_to_apply": "Register at Gram Panchayat with Aadhaar. Get Job Card issued.",
    },
    "Sukanya Samriddhi Yojana": {
        "name": "Sukanya Samriddhi Yojana",
        "description_hindi": "Beti ke bhavishya ke liye bachat yojana — 8% byaaj ke saath.",
        "description_kannada": "Magaḷa bhavishyakke uchcha byaajadharada bachat yojane — 8% byaaja.",
        "eligibility_criteria": {
            "occupation": ["any"],
            "max_income": None,
            "bpl_required": False,
            "land_required": False,
            "age_range": [18, 99],
            "gender": "any",
            "has_daughter_under_10": True,
        },
        "benefit_amount": "8%+ interest on deposits",
        "frequency": "Annual deposits (min ₹250)",
        "how_to_apply": "Open at any post office or bank with daughter's birth certificate and Aadhaar.",
    },
    "PM Mudra Yojana": {
        "name": "PM Mudra Yojana",
        "description_hindi": "Chhote vyapaariyon ko ₹50,000 se ₹10 lakh tak ka loan bina guarantee ke.",
        "description_kannada": "Sanna udyamigaligae ₹50,000 rinda ₹10 lakh varegu saala bina guarantee.",
        "eligibility_criteria": {
            "occupation": ["shop_owner", "self_employed"],
            "max_income": None,
            "bpl_required": False,
            "land_required": False,
            "age_range": [18, 65],
            "gender": "any",
        },
        "benefit_amount": "Loans: Shishu (₹50K), Kishore (₹5L), Tarun (₹10L)",
        "frequency": "One-time loan with repayment schedule",
        "how_to_apply": "Apply at any bank or NBFC with business plan and Aadhaar/PAN.",
    },
    "Ayushman Bharat": {
        "name": "Ayushman Bharat",
        "description_hindi": "Garib parivaar ko saalana ₹5 lakh tak ka muft ilaaj — PMJAY card se.",
        "description_kannada": "Badava kutumbakke varshakke ₹5 lakh varegu uchita chikitse — PMJAY card inda.",
        "eligibility_criteria": {
            "occupation": ["any"],
            "max_income": 300000,
            "bpl_required": False,
            "land_required": False,
            "age_range": [0, 99],
            "gender": "any",
        },
        "benefit_amount": "₹5,00,000/year health cover per family",
        "frequency": "Annual",
        "how_to_apply": "Check eligibility at mera.pmjay.gov.in or nearest Ayushman Mitra at hospital.",
    },
}


# ─── FRAUD RED-FLAG PHRASES ───────────────────────────────────────────

FRAUD_RED_FLAGS = [
    "otp batao",
    "otp share",
    "otp bata do",
    "pin share karo",
    "pin batao",
    "pin bata do",
    "bank official bol raha hoon",
    "bank se bol raha hoon",
    "aapka account band hoga",
    "account block ho jayega",
    "prize jeeta hai",
    "lottery jeeti hai",
    "aapne prize jeeta",
    "kyc update karo abhi",
    "kyc expire ho gaya",
    "link pe click karo",
    "paisa double",
    "urgent payment",
    "fine lagega",
    "police case hoga",
]


# ─── HELPER FUNCTIONS ─────────────────────────────────────────────────


def get_account(account_id: str) -> dict | None:
    """Returns the account dict for the given ID, or None if not found."""
    return copy.deepcopy(ACCOUNTS.get(account_id))


def get_balance(account_id: str) -> str:
    """Returns formatted balance string like '₹4,200.00', or error message."""
    acct = ACCOUNTS.get(account_id)
    if not acct:
        return "Account not found"
    return f"₹{acct['balance']:,.2f}"


def get_transactions(account_id: str, last_n: int = 5) -> list:
    """Returns the last N transactions for the given account."""
    acct = ACCOUNTS.get(account_id)
    if not acct:
        return []
    return copy.deepcopy(acct["transaction_history"][-last_n:])


def get_installments(account_id: str) -> list:
    """Returns upcoming installments/reminders for the given account."""
    return copy.deepcopy(INSTALLMENTS.get(account_id, []))


def get_loans(account_id: str) -> list:
    """Returns loan records for the given account."""
    return copy.deepcopy(LOANS.get(account_id, []))


def get_spending_summary(account_id: str) -> dict:
    """
    Calculates total debits for the current month vs the user's spending limit.
    Returns a dict with spent, limit, remaining, and percentage.
    """
    acct = ACCOUNTS.get(account_id)
    if not acct:
        return {"error": "Account not found"}

    limit_data = SPENDING_LIMITS.get(account_id, {"monthly_limit": 0.0})
    monthly_limit = limit_data["monthly_limit"]

    # Calculate total debits this month
    now = datetime.now()
    current_month = now.strftime("%Y-%m")
    total_spent = 0.0
    for txn in acct.get("transaction_history", []):
        if txn["type"] == "debit" and txn["date"].startswith(current_month):
            total_spent += txn["amount"]

    remaining = max(0.0, monthly_limit - total_spent)
    percentage = (total_spent / monthly_limit * 100) if monthly_limit > 0 else 0.0

    return {
        "account_id": account_id,
        "monthly_limit": monthly_limit,
        "total_spent": total_spent,
        "remaining": remaining,
        "percentage": round(min(percentage, 100.0), 1),
        "over_budget": total_spent > monthly_limit if monthly_limit > 0 else False,
        "month": current_month,
    }


def set_spending_limit(account_id: str, limit: float) -> dict:
    """Sets or updates the monthly spending limit for a user."""
    if account_id not in ACCOUNTS:
        return {"success": False, "error": "Account not found"}
    if limit < 0:
        return {"success": False, "error": "Limit must be non-negative"}

    SPENDING_LIMITS[account_id] = {"monthly_limit": limit}
    return {
        "success": True,
        "message": f"Monthly spending limit set to ₹{limit:,.2f}",
        "new_limit": limit,
    }


def get_fixed_deposits(account_id: str) -> list:
    """Returns fixed deposits for the given account."""
    return copy.deepcopy(FIXED_DEPOSITS.get(account_id, []))


def create_fixed_deposit(account_id: str, amount: float, duration_months: int) -> dict:
    """Creates a new fixed deposit and deducts from account balance."""
    acct = ACCOUNTS.get(account_id)
    if not acct:
        return {"success": False, "error": "Account not found"}

    if amount <= 0:
        return {"success": False, "error": "Amount must be positive"}
    
    if duration_months <= 0:
        return {"success": False, "error": "Duration must be positive"}

    if acct["balance"] < amount:
        return {"success": False, "error": "Insufficient balance"}

    # Deduct from balance
    acct["balance"] -= amount
    
    # Calculate simple interest
    interest_earned = (amount * FD_INTEREST_RATE * (duration_months / 12)) / 100
    maturity_amount = amount + interest_earned

    now = datetime.now()
    maturity_date = now + timedelta(days=30 * duration_months) # Approximation

    # Create FD record
    fd_id = f"FD-{int(datetime.now().timestamp())}"
    new_fd = {
        "fd_id": fd_id,
        "principal": amount,
        "duration_months": duration_months,
        "interest_rate": FD_INTEREST_RATE,
        "maturity_amount": maturity_amount,
        "interest_earned": interest_earned,
        "start_date": now.strftime("%Y-%m-%d"),
        "maturity_date": maturity_date.strftime("%Y-%m-%d"),
        "status": "active",
    }
    
    if account_id not in FIXED_DEPOSITS:
        FIXED_DEPOSITS[account_id] = []
        
    FIXED_DEPOSITS[account_id].append(new_fd)
    
    # Add transaction record
    txn = {
        "txn_id": f"TXN-{int(datetime.now().timestamp())}",
        "date": now.strftime("%Y-%m-%d %H:%M"),
        "type": "debit",
        "amount": amount,
        "description": f"Fixed Deposit Creation ({duration_months} months)",
    }
    acct["transaction_history"].append(txn)

    return {
        "success": True,
        "message": f"Fixed deposit of ₹{amount:,.2f} created successfully for {duration_months} months.",
        "fd": new_fd
    }


def transfer_funds(from_id: str, to_id: str, amount: float) -> dict:
    """
    Simulates a fund transfer between two accounts.
    Updates balances and transaction histories in-memory.
    Returns a success/failure dict.
    """
    sender = ACCOUNTS.get(from_id)
    receiver = ACCOUNTS.get(to_id)

    if not sender:
        return {"success": False, "error": f"Sender account '{from_id}' not found."}
    if not receiver:
        return {"success": False, "error": f"Receiver account '{to_id}' not found."}
    if sender["account_type"] == "none":
        return {"success": False, "error": "Sender does not have a bank account."}
    if receiver["account_type"] == "none":
        return {"success": False, "error": "Receiver does not have a bank account."}
    if amount <= 0:
        return {"success": False, "error": "Amount must be greater than zero."}
    if sender["balance"] < amount:
        return {
            "success": False,
            "error": f"Insufficient balance. Available: ₹{sender['balance']:,.2f}",
        }

    now = datetime.now().strftime("%Y-%m-%d")

    # Update balances
    sender["balance"] -= amount
    receiver["balance"] += amount

    # Append to transaction histories
    sender["transaction_history"].append({
        "date": now,
        "type": "debit",
        "amount": amount,
        "description": f"Transfer to {receiver['name']} ({to_id})",
    })
    receiver["transaction_history"].append({
        "date": now,
        "type": "credit",
        "amount": amount,
        "description": f"Transfer from {sender['name']} ({from_id})",
    })

    return {
        "success": True,
        "message": f"₹{amount:,.2f} transferred from {sender['name']} to {receiver['name']}.",
        "sender_new_balance": f"₹{sender['balance']:,.2f}",
        "receiver_new_balance": f"₹{receiver['balance']:,.2f}",
        "transaction_id": f"TXN-{now.replace('-', '')}-{abs(hash(from_id + to_id)) % 100000:05d}",
        "date": now,
    }


def check_scheme_eligibility(account_id: str) -> list:
    """
    Returns a list of scheme names that the user qualifies for
    but is NOT yet enrolled in.
    """
    acct = ACCOUNTS.get(account_id)
    if not acct:
        return []

    eligible = []
    already_enrolled = set(acct.get("linked_schemes", []))

    for scheme_name, scheme in SCHEMES_DB.items():
        if scheme_name in already_enrolled:
            continue

        criteria = scheme["eligibility_criteria"]

        # Check occupation
        occ_list = criteria.get("occupation", ["any"])
        if "any" not in occ_list and acct["occupation"] not in occ_list:
            continue

        # Check BPL requirement
        if criteria.get("bpl_required") and not acct.get("bpl_card"):
            continue

        # Check land requirement
        if criteria.get("land_required") and not acct.get("land_acres"):
            continue

        # Check age range
        age_range = criteria.get("age_range", [0, 99])
        if not (age_range[0] <= acct["age"] <= age_range[1]):
            continue

        # Check gender
        gender_req = criteria.get("gender", "any")
        if gender_req != "any" and acct["gender"] != gender_req:
            continue

        eligible.append(scheme_name)

    return eligible


def enroll_scheme(account_id: str, scheme_name: str) -> dict:
    """
    Adds a scheme to the user's linked_schemes list.
    Returns a confirmation dict.
    """
    acct = ACCOUNTS.get(account_id)
    if not acct:
        return {"success": False, "error": "Account not found."}

    if scheme_name not in SCHEMES_DB:
        return {"success": False, "error": f"Scheme '{scheme_name}' not found in database."}

    if scheme_name in acct["linked_schemes"]:
        return {"success": False, "error": f"Already enrolled in '{scheme_name}'."}

    # Check eligibility first
    eligible_schemes = check_scheme_eligibility(account_id)
    if scheme_name not in eligible_schemes:
        return {
            "success": False,
            "error": f"User does not meet eligibility criteria for '{scheme_name}'.",
        }

    acct["linked_schemes"].append(scheme_name)
    scheme = SCHEMES_DB[scheme_name]

    return {
        "success": True,
        "message": f"{acct['name']} has been enrolled in {scheme_name}.",
        "scheme_details": {
            "name": scheme["name"],
            "benefit": scheme["benefit_amount"],
            "frequency": scheme["frequency"],
        },
        "total_schemes_enrolled": len(acct["linked_schemes"]),
        "date": datetime.now().strftime("%Y-%m-%d"),
    }


def pay_bill(account_id: str, bill_type: str, amount: float) -> dict:
    """
    Deducts bill amount from account balance and returns a receipt dict.
    Supported bill_type: electricity, mobile_recharge, ration, insurance_premium
    """
    valid_bill_types = ["electricity", "mobile_recharge", "ration", "insurance_premium"]
    acct = ACCOUNTS.get(account_id)

    if not acct:
        return {"success": False, "error": "Account not found."}
    if acct["account_type"] == "none":
        return {"success": False, "error": "User does not have a bank account."}
    if bill_type not in valid_bill_types:
        return {
            "success": False,
            "error": f"Invalid bill type. Must be one of: {', '.join(valid_bill_types)}",
        }
    if amount <= 0:
        return {"success": False, "error": "Amount must be greater than zero."}
    if acct["balance"] < amount:
        return {
            "success": False,
            "error": f"Insufficient balance. Available: ₹{acct['balance']:,.2f}",
        }

    now = datetime.now().strftime("%Y-%m-%d")
    bill_labels = {
        "electricity": "Electricity bill payment",
        "mobile_recharge": "Mobile recharge",
        "ration": "Ration shop payment",
        "insurance_premium": "Insurance premium payment",
    }

    acct["balance"] -= amount
    acct["transaction_history"].append({
        "date": now,
        "type": "debit",
        "amount": amount,
        "description": bill_labels[bill_type],
    })

    return {
        "success": True,
        "receipt": {
            "receipt_id": f"RCPT-{now.replace('-', '')}-{abs(hash(account_id + bill_type)) % 100000:05d}",
            "account_id": account_id,
            "name": acct["name"],
            "bill_type": bill_type,
            "amount_paid": f"₹{amount:,.2f}",
            "remaining_balance": f"₹{acct['balance']:,.2f}",
            "date": now,
            "status": "PAID",
        },
    }


def get_mini_statement(account_id: str) -> str:
    """
    Returns a formatted mini-statement string of the last 5 transactions.
    Suitable for SMS/USSD-style output.
    """
    acct = ACCOUNTS.get(account_id)
    if not acct:
        return "❌ Account not found."
    if acct["account_type"] == "none":
        return "❌ No bank account linked. Visit nearest bank to open a Jan Dhan account."
    if not acct["transaction_history"]:
        return f"📋 Mini Statement — {acct['name']}\nNo transactions yet."

    lines = [
        f"📋 Mini Statement — {acct['name']} ({acct['account_id']})",
        f"Balance: ₹{acct['balance']:,.2f}",
        "─" * 40,
    ]

    for txn in acct["transaction_history"][-5:]:
        symbol = "+" if txn["type"] == "credit" else "-"
        lines.append(
            f"  {txn['date']}  {symbol}₹{txn['amount']:,.2f}  {txn['description']}"
        )

    lines.append("─" * 40)
    return "\n".join(lines)


def flag_fraud_risk(text: str) -> dict:
    """
    Scans input text for known fraud red-flag phrases.
    Returns a dict with detection results and bilingual warnings.
    """
    text_lower = text.lower()
    matched = [phrase for phrase in FRAUD_RED_FLAGS if phrase in text_lower]

    if matched:
        return {
            "is_suspicious": True,
            "matched_phrases": matched,
            "warning_hindi": (
                "⚠️ SAVDHAN! Yeh message fraud ho sakta hai. "
                "Koi bhi bank aapse phone pe OTP, PIN ya password nahi maangta. "
                "Aise messages ka jawab na dein. Turant 1930 pe call karein."
            ),
            "warning_kannada": (
                "⚠️ ECHARIKE! Ee message mosadi irabahudu. "
                "Yaavudee bank nimmannu phone-nalli OTP, PIN athava password keluvudilla. "
                "Inthaha message-galigae uttara kodi bedi. Tatkshana 1930-ge call maadi."
            ),
        }

    return {
        "is_suspicious": False,
        "matched_phrases": [],
        "warning_hindi": None,
        "warning_kannada": None,
    }


# ─── QUICK TEST ────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=== Artha AI — Mock Bank Backend ===\n")

    # Test get_balance
    print(f"Ramesh balance: {get_balance('JD-1001')}")
    print(f"Fatima balance: {get_balance('JD-1002')}")

    # Test mini statement
    print(f"\n{get_mini_statement('JD-1001')}")

    # Test scheme eligibility
    print(f"\nRamesh eligible for: {check_scheme_eligibility('JD-1001')}")
    print(f"Fatima eligible for: {check_scheme_eligibility('JD-1002')}")
    print(f"Suresh eligible for: {check_scheme_eligibility('NONE-0001')}")

    # Test fraud detection
    fraud_test = flag_fraud_risk("Hello ji, main bank official bol raha hoon, apna OTP batao")
    print(f"\nFraud test: suspicious={fraud_test['is_suspicious']}, matched={fraud_test['matched_phrases']}")

    # Test transfer
    result = transfer_funds("JD-1001", "SB-2001", 500.0)
    print(f"\nTransfer result: {result}")

    # Test bill payment
    receipt = pay_bill("SB-2002", "electricity", 350.0)
    print(f"\nBill payment: {receipt}")

    print("\n✅ All mock bank functions operational.")
