"""
schemes_scraper_and_recommender.py — Artha AI
Standalone scheme recommender. 50 schemes hardcoded in data/schemes_database.json.
No API keys needed. No scraping needed. Pure offline.
"""

import re, os, json
from datetime import datetime
from flask import request

_DIR = os.path.dirname(__file__)
_DB = os.path.join(_DIR, "..", "data", "schemes_database.json")

# ═══════════════════════════════════════════════════════════════
# LOAD SCHEMES FROM LOCAL JSON
# ═══════════════════════════════════════════════════════════════

def _load_schemes():
    with open(_DB, "r", encoding="utf-8") as f:
        return json.load(f)

ALL_SCHEMES = _load_schemes()
print(f"[SCHEMES] Loaded {len(ALL_SCHEMES)} schemes from local database")

# ═══════════════════════════════════════════════════════════════
# RECOMMENDATION ENGINE
# ═══════════════════════════════════════════════════════════════

_INCOME = {"₹0 – ₹5,000":60000,"₹5,000 – ₹15,000":180000,"₹15,000 – ₹30,000":360000,"₹30,000+":999999}
_OCC = {"Kisan (Farmer)":["farmer"],"Mazdoor (Labour)":["labour"],"Vyapar (Small business)":["entrepreneur"],
        "Naukri (Job)":["any"],"Homemaker":["any"],"farmer":["farmer"],"farm_labour":["labour"],
        "shop_owner":["entrepreneur"],"daily_wager":["labour"],"homemaker":["any"],"unemployed":["any"]}

_WHY_HI = {
    "pm-kisan":"Aap kisan hain — har saal ₹6,000 seedha bank mein aayega.",
    "pmjdy":"Aapka zero balance bank account ban sakta hai, saath mein ₹1 lakh ka bima.",
    "pm-ujjwala":"Mahilaon ko free LPG gas connection milta hai.",
    "pm-fasal-bima":"Fasal ka nuksan hone par bima se paisa milega.",
    "atal-pension":"₹1,000-₹5,000 mahina pension milegi 60 saal ke baad.",
    "ayushman-bharat":"₹5 lakh tak ka free ilaaj hospital mein milega.",
    "pm-awas-gramin":"Pucca ghar banane ke liye ₹1.2 lakh milega.",
    "pm-mudra":"Apna chhota business shuru karne ke liye ₹10 lakh tak loan.",
    "mgnrega":"100 din ka kaam guarantee ke saath, rozana ₹267+ milega.",
    "sukanya-samriddhi":"Beti ki padhai aur shaadi ke liye 8.2% byaaj wali bachat.",
    "kisan-credit-card":"Kisan ko sirf 4% byaaj par loan milta hai.",
    "pm-matru-vandana":"Pehle bacche ke janm par ₹5,000 milte hain.",
    "pm-suraksha-bima":"Sirf ₹20/saal mein ₹2 lakh ka durghatna bima.",
    "pm-jeevan-jyoti":"Sirf ₹436/saal mein ₹2 lakh ka jeevan bima.",
    "stand-up-india":"SC/ST aur mahilaon ke liye ₹1 crore tak ka business loan.",
    "pm-vishwakarma":"Karigar aur shilpkaaron ko ₹3 lakh loan + training.",
    "day-nrlm":"Mahila SHG ko ₹3 lakh tak ka bank loan milta hai.",
    "pm-surya-ghar":"Ghar ki chhat par solar lagao, ₹78K subsidy + free bijli.",
    "janani-suraksha":"Hospital mein delivery karane par ₹1,400 milte hain.",
    "pmsby":"Asangathit majdooron ko 60 ke baad ₹3,000/mahina pension.",
    "soil-health-card":"Free mitti jaanch + kaun sa khad dalein woh batayenge.",
    "pm-kaushal-vikas":"Free skill training + certificate + naukri dhundhne mein madad.",
    "digital-india":"Gaon ke paas CSC se 400+ sarkari seva milti hai.",
    "national-pension":"Pension bachat yojana — tax benefit bhi milta hai.",
    "pm-awas-urban":"Sheher mein ghar khareedne par ₹2.67 lakh subsidy.",
    "mid-day-meal":"School mein bachchon ko free khana milta hai.",
    "beti-bachao":"Beti ki suraksha aur padhai ke liye sarkari madad.",
    "ujjwala-2":"Bina pata proof ke bhi LPG connection mil sakta hai.",
    "swachh-bharat-gramin":"Toilet banane ke liye ₹12,000 milte hain.",
    "jal-jeevan":"Ghar tak nal ka paani free milega.",
    "free-ration":"Har mahine 5 kg gehun/chawal + 1 kg dal free.",
    "agri-infra-fund":"Kisan infrastructure ke liye ₹2 crore loan, 3% subsidy.",
    "e-shram":"Majdoor card banao — ₹2 lakh bima milega.",
    "namo-drone-didi":"Mahila SHG ko drone training + ₹15,000/mahina kamai.",
    "pm-svanidhi":"Thele-rehri waalon ko ₹50,000 tak loan.",
    "pradhan-mantri-gram-sadak":"Gaon tak pakki sadak banayi jaati hai.",
    "samagra-shiksha":"School mein free kitaab + uniform milti hai.",
    "one-nation-one-ration":"Kahi bhi jao, apna ration card chalega.",
    "national-social-pension":"Buzurg/vidhwa/divyang ko ₹200-500/mahina pension.",
    "deen-dayal-upadhyaya":"Gaon ke naujawan ko free training + naukri + ₹1,500 stipend.",
    "national-health-mission":"Sarkari hospital mein free ilaaj + dawai + jaanch.",
    "pmegp":"Naya business shuru karne par 35% tak subsidy.",
    "annapurna":"65+ buzurg ko 10 kg free ration milta hai.",
    "scholarship-sc-st":"SC/ST chhatro ko ₹150-350/mahina scholarship.",
    "post-matric-scholarship":"SC/ST 11th+ chhatro ko puri fees + ₹1,200/mahina.",
    "rashtriya-swasthya-bima":"BPL parivaar ko ₹30,000 hospital bima.",
    "national-livelihood-urban":"Sheher ke gareeb ko skill training + loan.",
    "indira-gandhi-widow":"Vidhwa mahilaon ko ₹300/mahina pension.",
    "indira-gandhi-disability":"Divyang logo ko ₹300/mahina pension.",
    "livestock-insurance":"Pashu bima par 50% subsidy.",
    "krishi-sinchai":"Drip/sprinkler par 55-100% subsidy.",
}

_WHY_KN = {
    "pm-kisan":"Nīvu raitharu — varshakke ₹6,000 nēraṃagi bank ge barum.",
    "pmjdy":"Zero balance bank account + ₹1 lakh vima siguttade.",
    "pm-ujjwala":"Mahiḷeyarige free LPG gas connection siguttade.",
    "pm-fasal-bima":"Bele hāṇiyādare vimā riṇa siguttade.",
    "atal-pension":"60 varsha nantar ₹1,000-₹5,000 tingaḷa pension.",
    "ayushman-bharat":"₹5 lakh varege free čikitse āspatreyli siguttade.",
    "pm-awas-gramin":"Pakka mane kaṭṭalu ₹1.2 lakh siguttade.",
    "pm-mudra":"Svaṃta vyāpāra shuru māḍalu ₹10 lakh loan.",
    "mgnrega":"100 dinada kelasa guarantee, dinakke ₹267+ siguttade.",
    "sukanya-samriddhi":"Magaḷa vidyābhyāsakke 8.2% byāja uḷitāya.",
    "kisan-credit-card":"Raithrige 4% byājadalli loan siguttade.",
    "pm-matru-vandana":"Modala magunige ₹5,000 siguttade.",
    "pm-suraksha-bima":"₹20/varshakke ₹2 lakh apagāta vima.",
    "pm-jeevan-jyoti":"₹436/varshakke ₹2 lakh jīvana vima.",
    "free-ration":"Tingaḷige 5 kg akki/gōdhi + 1 kg bēḷe free.",
    "e-shram":"Kārmikar card māḍi — ₹2 lakh vima siguttade.",
    "jal-jeevan":"Manege naḷada nīru free siguttade.",
}

class SchemeRecommender:
    def __init__(self, schemes=None):
        self.schemes = schemes or ALL_SCHEMES

    def match(self, user_profile):
        occ_tags = _OCC.get(user_profile.get("occupation",""), ["any"])
        income = _INCOME.get(user_profile.get("income_bracket",""), 999999)
        enrolled = [s.lower() for s in user_profile.get("enrolled_schemes", [])]
        concern = user_profile.get("concern","").lower()
        has_bank = user_profile.get("has_bank","")
        assets = user_profile.get("assets","")
        lang = user_profile.get("language","hi")
        why_map = _WHY_KN if lang == "kn" else _WHY_HI

        results = []
        for scheme in self.schemes:
            elig = scheme.get("eligibility", {})
            score = 0
            s_occ = elig.get("occupation", ["any"])
            if "any" in s_occ or any(o in s_occ for o in occ_tags):
                score += 40
            else:
                continue
            if not elig.get("max_income") or income <= elig["max_income"]:
                score += 20
            if not elig.get("bpl_required", False) or "bpl" in assets.lower():
                score += 15
            if not elig.get("land_required", False) or "land" in assets.lower():
                score += 10
            if scheme["id"] not in enrolled and scheme.get("name","").lower() not in [e.lower() for e in enrolled]:
                score += 10
            if elig.get("state","all") == "all":
                score += 5
            tags = " ".join(scheme.get("tags",[]))
            if concern == "savings" and ("savings" in tags or "pension" in tags):
                score += 10
            if concern == "health" and ("health" in tags or "insurance" in tags):
                score += 10
            if concern == "education" and ("education" in tags or "girl" in tags or "scholarship" in tags):
                score += 10
            if "no account" in has_bank.lower() and scheme["id"] == "pmjdy":
                score += 15
            if score >= 30:
                s_copy = dict(scheme)
                s_copy["score"] = score
                s_copy["why_for_you"] = why_map.get(scheme["id"], f"Aap {scheme['name']} ke liye eligible hain.")
                results.append(s_copy)

        results.sort(key=lambda x: x["score"], reverse=True)
        for i, r in enumerate(results):
            r["final_rank"] = i + 1
        return results[:10]

    def recommend(self, user_profile):
        return self.match(user_profile)


# ═══════════════════════════════════════════════════════════════
# FLASK ROUTES
# ═══════════════════════════════════════════════════════════════

def register_schemes_routes(app):
    @app.route("/schemes/all", methods=["GET"])
    def schemes_all():
        return {"status":"success","count":len(ALL_SCHEMES),"schemes":ALL_SCHEMES}

    @app.route("/schemes/recommend", methods=["GET"])
    def schemes_recommend():
        aid = request.args.get("account_id","JD-1001")
        profile = {
            "account_id":aid, "language":request.args.get("lang","hi"),
            "occupation":request.args.get("occupation","farmer"),
            "income_bracket":request.args.get("income_bracket","₹0 – ₹5,000"),
            "has_bank":request.args.get("has_bank","Jan Dhan account"),
            "assets":request.args.get("assets",""),
            "concern":request.args.get("concern",""),
            "enrolled_schemes":[],
        }
        r = SchemeRecommender()
        results = r.recommend(profile)
        return {"status":"success","account_id":aid,"recommended":results,
                "total_schemes":len(ALL_SCHEMES),"language":profile["language"]}

    @app.route("/schemes/search", methods=["GET"])
    def schemes_search():
        q = request.args.get("q","").lower()
        if not q:
            return {"status":"error","message":"q parameter required"}, 400
        matched = [s for s in ALL_SCHEMES if q in s["name"].lower() or q in s.get("description","").lower() or q in " ".join(s.get("tags",[]))]
        return {"status":"success","query":q,"count":len(matched),"schemes":matched}


# ═══════════════════════════════════════════════════════════════
# SELF-TEST
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 60)
    print("  Artha AI — Scheme Recommender (Offline, 50 Schemes)")
    print("=" * 60)

    r = SchemeRecommender()

    print("\n📌 Test 1 — Kannada farmer, low income, has land:")
    res = r.recommend({"language":"kn","occupation":"Kisan (Farmer)","income_bracket":"₹0 – ₹5,000","has_bank":"Jan Dhan account","assets":"Land","concern":"Savings","enrolled_schemes":[]})
    for s in res[:5]:
        print(f"  #{s['final_rank']} {s['name']} (score:{s['score']})")
        print(f"     → {s['why_for_you']}")

    print("\n📌 Test 2 — Hindi business owner:")
    res2 = r.recommend({"language":"hi","occupation":"Vyapar (Small business)","income_bracket":"₹15,000 – ₹30,000","has_bank":"SBI","assets":"House","concern":"","enrolled_schemes":["PM-KISAN"]})
    for s in res2[:5]:
        print(f"  #{s['final_rank']} {s['name']} — {s['why_for_you']}")

    print("\n📌 Test 3 — BPL woman, no bank account:")
    res3 = r.recommend({"language":"hi","occupation":"Homemaker","income_bracket":"₹0 – ₹5,000","has_bank":"No account","assets":"BPL card","concern":"Health","enrolled_schemes":[]})
    for s in res3[:5]:
        print(f"  #{s['final_rank']} {s['name']} — {s['why_for_you']}")

    print("\n📌 Test 4 — Young daily wager:")
    res4 = r.recommend({"language":"hi","occupation":"Mazdoor (Labour)","income_bracket":"₹5,000 – ₹15,000","has_bank":"Jan Dhan account","assets":"","concern":"","enrolled_schemes":[]})
    for s in res4[:5]:
        print(f"  #{s['final_rank']} {s['name']} — {s['why_for_you']}")

    print(f"\n✅ Total schemes in database: {len(ALL_SCHEMES)}")
    print("=" * 60)
