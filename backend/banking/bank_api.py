"""
bank_api.py — Artha AI Flask REST API
Wraps mock_bank.py and exposes endpoints for AI agents.
Run: python bank_api.py  (port 5001)
"""

import time
from functools import wraps
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

from mock_bank import (
    ACCOUNTS,
    SCHEMES_DB,
    get_account,
    get_balance,
    get_transactions,
    transfer_funds,
    check_scheme_eligibility,
    enroll_scheme,
    pay_bill,
    get_mini_statement,
    flag_fraud_risk,
    get_installments,
    get_loans,
    get_spending_summary,
    set_spending_limit,
    get_fixed_deposits,
    create_fixed_deposit,
)

app = Flask(__name__)
CORS(app)


# ─── LOGGING MIDDLEWARE ────────────────────────────────────────────────

@app.after_request
def log_request(response):
    """Prints a structured log line for every request."""
    method = request.method
    path = request.path
    status_code = response.status_code

    # Build context details from request body
    details = ""
    try:
        body = request.get_json(silent=True) or {}
        if "account_id" in body:
            details += f" | account: {body['account_id']}"
        if "from_id" in body:
            details += f" | from: {body['from_id']}"
        if "to_id" in body:
            details += f" | to: {body['to_id']}"
        if "amount" in body:
            details += f" | amount: ₹{body['amount']}"
        if "scheme_name" in body:
            details += f" | scheme: {body['scheme_name']}"
        if "bill_type" in body:
            details += f" | bill: {body['bill_type']}"
    except Exception:
        pass

    # Determine status label
    try:
        resp_data = response.get_json(silent=True) or {}
        status_label = resp_data.get("status", "unknown")
    except Exception:
        status_label = "unknown"

    try:
        print(f"[BANK API] {method} {path}{details} | status: {status_label}")
    except OSError:
        pass  # Suppress when stdout is unavailable (background mode)
    return response


# ─── SERVE FRONTEND ───────────────────────────────────────────────────

@app.route("/", methods=["GET"])
def serve_ui():
    return send_file("index.html")


# ─── HEALTH CHECK ──────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "mock_bank": "running",
        "accounts_loaded": len(ACCOUNTS),
        "schemes_loaded": len(SCHEMES_DB),
    })


# ─── ACCOUNT LOOKUP ───────────────────────────────────────────────────

@app.route("/account/lookup", methods=["POST"])
def account_lookup():
    body = request.get_json(silent=True) or {}
    account_id = body.get("account_id", "").strip()

    if not account_id:
        return jsonify({
            "status": "error",
            "error": "account_id is required",
            "message_hindi": "Kripya apna account number daalein.",
            "message_kannada": "Dayavittu nimma account number hakiri.",
        }), 400

    acct = get_account(account_id)
    if not acct:
        return jsonify({
            "status": "error",
            "error": f"Account '{account_id}' not found",
            "message_hindi": f"Account '{account_id}' nahi mila. Kripya sahi number daalein.",
            "message_kannada": f"Account '{account_id}' sigalilla. Dayavittu sari number hakiri.",
        }), 404

    return jsonify({
        "status": "success",
        "data": acct,
        "message_hindi": f"Account mil gaya — {acct['name']}, balance ₹{acct['balance']:,.2f}",
        "message_kannada": f"Account sigithu — {acct['name']}, balance ₹{acct['balance']:,.2f}",
    })


# ─── BALANCE ───────────────────────────────────────────────────────────

@app.route("/account/<account_id>/balance", methods=["GET"])
def account_balance(account_id):
    acct = get_account(account_id)
    if not acct:
        return jsonify({
            "status": "error",
            "error": f"Account '{account_id}' not found",
            "message_hindi": f"Account '{account_id}' nahi mila.",
            "message_kannada": f"Account '{account_id}' sigalilla.",
        }), 404

    bal = get_balance(account_id)
    return jsonify({
        "status": "success",
        "account_id": account_id,
        "name": acct["name"],
        "balance": bal,
        "balance_raw": acct["balance"],
        "message_hindi": f"Aapka balance {bal} hai.",
        "message_kannada": f"Nimma balance {bal} ide.",
    })


# ─── TRANSACTIONS ─────────────────────────────────────────────────────

@app.route("/account/<account_id>/transactions", methods=["GET"])
def account_transactions(account_id):
    last_n = request.args.get("last_n", 5, type=int)

    acct = get_account(account_id)
    if not acct:
        return jsonify({
            "status": "error",
            "error": f"Account '{account_id}' not found",
            "message_hindi": f"Account '{account_id}' nahi mila.",
            "message_kannada": f"Account '{account_id}' sigalilla.",
        }), 404

    txns = get_transactions(account_id, last_n)
    mini = get_mini_statement(account_id)

    return jsonify({
        "status": "success",
        "account_id": account_id,
        "name": acct["name"],
        "transaction_count": len(txns),
        "transactions": txns,
        "mini_statement": mini,
        "message_hindi": f"Aapke pichle {len(txns)} transactions yeh hain.",
        "message_kannada": f"Nimma kadina {len(txns)} vyavahaaragalu ivugalu.",
    })


# ─── TRANSFER ──────────────────────────────────────────────────────────

@app.route("/transfer", methods=["POST"])
def do_transfer():
    body = request.get_json(silent=True) or {}
    from_id = body.get("from_id", "").strip()
    to_id = body.get("to_id", "").strip()
    amount = body.get("amount")

    if not from_id or not to_id or amount is None:
        return jsonify({
            "status": "error",
            "error": "from_id, to_id, and amount are required",
            "message_hindi": "Transfer ke liye from_id, to_id aur amount zaroori hai.",
            "message_kannada": "Transfer-ge from_id, to_id mattu amount beku.",
        }), 400

    try:
        amount = float(amount)
    except (ValueError, TypeError):
        return jsonify({
            "status": "error",
            "error": "amount must be a number",
            "message_hindi": "Kripya sahi rashi (amount) daalein.",
            "message_kannada": "Dayavittu sari amount hakiri.",
        }), 400

    result = transfer_funds(from_id, to_id, amount)

    if result["success"]:
        sender = get_account(from_id)
        receiver = get_account(to_id)
        return jsonify({
            "status": "success",
            "data": result,
            "message_hindi": (
                f"₹{amount:,.2f} safaltapoorvak {sender['name'] if sender else to_id} "
                f"ko bhej diya gaya. Naya balance: {result['sender_new_balance']}"
            ),
            "message_kannada": (
                f"₹{amount:,.2f} yashasvi aagi {receiver['name'] if receiver else to_id} "
                f"avrige kaluhisalaagide. Hosa balance: {result['sender_new_balance']}"
            ),
        })
    else:
        return jsonify({
            "status": "error",
            "error": result["error"],
            "message_hindi": f"Transfer fail — {result['error']}",
            "message_kannada": f"Transfer viphal — {result['error']}",
        }), 400


# ─── ELIGIBLE SCHEMES ─────────────────────────────────────────────────

@app.route("/account/<account_id>/eligible_schemes", methods=["GET"])
def eligible_schemes(account_id):
    acct = get_account(account_id)
    if not acct:
        return jsonify({
            "status": "error",
            "error": f"Account '{account_id}' not found",
            "message_hindi": f"Account '{account_id}' nahi mila.",
            "message_kannada": f"Account '{account_id}' sigalilla.",
        }), 404

    schemes = check_scheme_eligibility(account_id)
    scheme_details = []
    for s in schemes:
        info = SCHEMES_DB.get(s, {})
        scheme_details.append({
            "name": s,
            "benefit_amount": info.get("benefit_amount", ""),
            "description_hindi": info.get("description_hindi", ""),
            "description_kannada": info.get("description_kannada", ""),
            "how_to_apply": info.get("how_to_apply", ""),
        })

    if schemes:
        names_str = ", ".join(schemes)
        return jsonify({
            "status": "success",
            "account_id": account_id,
            "name": acct["name"],
            "eligible_count": len(schemes),
            "eligible_schemes": scheme_details,
            "already_enrolled": acct["linked_schemes"],
            "message_hindi": f"Aap {len(schemes)} nayi yojanaon ke liye paatra hain: {names_str}",
            "message_kannada": f"Neevu {len(schemes)} hosa yojanaigaligae arharu: {names_str}",
        })
    else:
        return jsonify({
            "status": "success",
            "account_id": account_id,
            "name": acct["name"],
            "eligible_count": 0,
            "eligible_schemes": [],
            "already_enrolled": acct["linked_schemes"],
            "message_hindi": "Aap sabhi paatra yojanaon mein pehle se enrolled hain.",
            "message_kannada": "Neevu ella arha yojanaigalalli aagale nondaayisikoṇḍiddiri.",
        })


# ─── SCHEME ENROLLMENT ────────────────────────────────────────────────

@app.route("/scheme/enroll", methods=["POST"])
def do_enroll():
    body = request.get_json(silent=True) or {}
    account_id = body.get("account_id", "").strip()
    scheme_name = body.get("scheme_name", "").strip()

    if not account_id or not scheme_name:
        return jsonify({
            "status": "error",
            "error": "account_id and scheme_name are required",
            "message_hindi": "Enrollment ke liye account_id aur scheme_name zaroori hai.",
            "message_kannada": "Nondani-ge account_id mattu scheme_name beku.",
        }), 400

    result = enroll_scheme(account_id, scheme_name)

    if result["success"]:
        return jsonify({
            "status": "success",
            "data": result,
            "message_hindi": (
                f"{result['message']} "
                f"Labh: {result['scheme_details']['benefit']}"
            ),
            "message_kannada": (
                f"{scheme_name} yojaneyalli nondani yashasvi aayitu. "
                f"Prayojana: {result['scheme_details']['benefit']}"
            ),
        })
    else:
        return jsonify({
            "status": "error",
            "error": result["error"],
            "message_hindi": f"Enrollment fail — {result['error']}",
            "message_kannada": f"Nondani viphal — {result['error']}",
        }), 400


# ─── BILL PAYMENT ─────────────────────────────────────────────────────

@app.route("/bill/pay", methods=["POST"])
def do_pay_bill():
    body = request.get_json(silent=True) or {}
    account_id = body.get("account_id", "").strip()
    bill_type = body.get("bill_type", "").strip()
    amount = body.get("amount")

    if not account_id or not bill_type or amount is None:
        return jsonify({
            "status": "error",
            "error": "account_id, bill_type, and amount are required",
            "message_hindi": "Bill payment ke liye account_id, bill_type aur amount zaroori hai.",
            "message_kannada": "Bill payment-ge account_id, bill_type mattu amount beku.",
        }), 400

    try:
        amount = float(amount)
    except (ValueError, TypeError):
        return jsonify({
            "status": "error",
            "error": "amount must be a number",
            "message_hindi": "Kripya sahi rashi (amount) daalein.",
            "message_kannada": "Dayavittu sari amount hakiri.",
        }), 400

    bill_labels_hindi = {
        "electricity": "Bijli bill",
        "mobile_recharge": "Mobile recharge",
        "ration": "Ration ka bill",
        "insurance_premium": "Bima premium",
    }
    bill_labels_kannada = {
        "electricity": "Vidyut bill",
        "mobile_recharge": "Mobile recharge",
        "ration": "Ration bill",
        "insurance_premium": "Vima premium",
    }

    result = pay_bill(account_id, bill_type, amount)

    if result["success"]:
        receipt = result["receipt"]
        label_hi = bill_labels_hindi.get(bill_type, bill_type)
        label_kn = bill_labels_kannada.get(bill_type, bill_type)
        return jsonify({
            "status": "success",
            "data": result,
            "message_hindi": (
                f"{label_hi} ka ₹{amount:,.2f} safaltapoorvak bhugtan ho gaya. "
                f"Bacha hua balance: {receipt['remaining_balance']}"
            ),
            "message_kannada": (
                f"{label_kn} ₹{amount:,.2f} yashasvi aagi paavaneyaagide. "
                f"Ulida balance: {receipt['remaining_balance']}"
            ),
        })
    else:
        return jsonify({
            "status": "error",
            "error": result["error"],
            "message_hindi": f"Bill payment fail — {result['error']}",
            "message_kannada": f"Bill payment viphal — {result['error']}",
        }), 400


# ─── INSTALLMENTS / REMINDERS ─────────────────────────────────────────

@app.route("/account/<account_id>/installments", methods=["GET"])
def account_installments(account_id):
    acct = get_account(account_id)
    if not acct:
        return jsonify({
            "status": "error",
            "error": f"Account '{account_id}' not found",
        }), 404

    installments = get_installments(account_id)
    overdue = [i for i in installments if i["status"] == "overdue"]

    return jsonify({
        "status": "success",
        "account_id": account_id,
        "name": acct["name"],
        "installments": installments,
        "total_upcoming": len(installments),
        "overdue_count": len(overdue),
        "message_hindi": f"Aapke {len(installments)} upcoming payments hain. {len(overdue)} overdue hain.",
        "message_kannada": f"Nimma {len(installments)} baaki payments ide. {len(overdue)} overdue aagide.",
    })


# ─── LOANS ─────────────────────────────────────────────────────────────

@app.route("/account/<account_id>/loans", methods=["GET"])
def account_loans(account_id):
    acct = get_account(account_id)
    if not acct:
        return jsonify({
            "status": "error",
            "error": f"Account '{account_id}' not found",
        }), 404

    loans = get_loans(account_id)
    active_loans = [l for l in loans if l["status"] == "active"]
    total_outstanding = sum(l["outstanding"] for l in active_loans)

    return jsonify({
        "status": "success",
        "account_id": account_id,
        "name": acct["name"],
        "loans": loans,
        "active_count": len(active_loans),
        "total_outstanding": total_outstanding,
        "message_hindi": f"Aapke {len(active_loans)} active loans hain. Kul baaki: ₹{total_outstanding:,.2f}",
        "message_kannada": f"Nimma {len(active_loans)} active loans ide. Ottu baaki: ₹{total_outstanding:,.2f}",
    })


# ─── SMART SPENDING ───────────────────────────────────────────────────

@app.route("/account/<account_id>/spending", methods=["GET"])
def account_spending(account_id):
    acct = get_account(account_id)
    if not acct:
        return jsonify({
            "status": "error",
            "error": f"Account '{account_id}' not found",
        }), 404

    summary = get_spending_summary(account_id)
    return jsonify({
        "status": "success",
        **summary,
        "message_hindi": f"Is mahine aapne ₹{summary['total_spent']:,.2f} kharch kiye. Limit: ₹{summary['monthly_limit']:,.2f}",
        "message_kannada": f"Ee tingalu neevu ₹{summary['total_spent']:,.2f} kharchu maadiddiri. Limit: ₹{summary['monthly_limit']:,.2f}",
    })


@app.route("/account/<account_id>/spending/limit", methods=["POST"])
def set_account_spending_limit(account_id):
    body = request.get_json(silent=True) or {}
    limit = body.get("limit")

    if limit is None:
        return jsonify({
            "status": "error",
            "error": "limit is required",
        }), 400

    try:
        limit = float(limit)
    except (ValueError, TypeError):
        return jsonify({
            "status": "error",
            "error": "limit must be a number",
        }), 400

    result = set_spending_limit(account_id, limit)

    if result["success"]:
        return jsonify({
            "status": "success",
            "data": result,
            "message_hindi": f"Aapki monthly kharcha limit ₹{limit:,.2f} set ho gayi.",
            "message_kannada": f"Nimma tingaḷa kharchu limit ₹{limit:,.2f} set aagide.",
        })
    else:
        return jsonify({
            "status": "error",
            "error": result["error"],
        }), 400


# ─── FIXED DEPOSITS ───────────────────────────────────────────────────

@app.route("/account/<account_id>/fixed_deposits", methods=["GET"])
def account_fixed_deposits(account_id):
    acct = get_account(account_id)
    if not acct:
        return jsonify({
            "status": "error",
            "error": f"Account '{account_id}' not found",
        }), 404

    fds = get_fixed_deposits(account_id)
    total_principal = sum(fd["principal"] for fd in fds if fd["status"] == "active")

    return jsonify({
        "status": "success",
        "account_id": account_id,
        "name": acct["name"],
        "fixed_deposits": fds,
        "active_count": len(fds),
        "total_principal": total_principal,
        "message_hindi": f"Aapke paas {len(fds)} fixed deposits hain. Total deposit: ₹{total_principal:,.2f}",
        "message_kannada": f"Nimma hatira {len(fds)} fixed deposits ide. Ottu deposit: ₹{total_principal:,.2f}",
    })


@app.route("/account/<account_id>/fixed_deposits", methods=["POST"])
def new_fixed_deposit(account_id):
    body = request.get_json(silent=True) or {}
    amount = body.get("amount")
    duration_months = body.get("duration_months", 12) # Default 12 months

    if amount is None:
        return jsonify({
            "status": "error",
            "error": "amount is required",
        }), 400

    try:
        amount = float(amount)
        duration_months = int(duration_months)
    except (ValueError, TypeError):
        return jsonify({
            "status": "error",
            "error": "amount and duration_months must be numbers",
        }), 400

    result = create_fixed_deposit(account_id, amount, duration_months)

    if result["success"]:
        fd = result["fd"]
        return jsonify({
            "status": "success",
            "data": result,
            "message_hindi": f"₹{amount:,.2f} ka FD {duration_months} mahine ke liye ban gaya. 6% interest ke saath aapko ₹{fd['maturity_amount']:,.2f} milenge.",
            "message_kannada": f"₹{amount:,.2f} ninda {duration_months} tingalige FD aagide. 6% interest jote nimage ₹{fd['maturity_amount']:,.2f} sigutte.",
        })
    else:
        return jsonify({
            "status": "error",
            "error": result["error"],
        }), 400


# ─── FRAUD CHECK ───────────────────────────────────────────────────────

@app.route("/fraud/check", methods=["POST"])
def fraud_check():
    body = request.get_json(silent=True) or {}
    text = body.get("text", "").strip()

    if not text:
        return jsonify({
            "status": "error",
            "error": "text field is required",
            "message_hindi": "Kripya jaanch ke liye text daalein.",
            "message_kannada": "Dayavittu parikshe-ge text hakiri.",
        }), 400

    result = flag_fraud_risk(text)

    if result["is_suspicious"]:
        return jsonify({
            "status": "success",
            "is_suspicious": True,
            "matched_phrases": result["matched_phrases"],
            "risk_level": "HIGH" if len(result["matched_phrases"]) > 1 else "MEDIUM",
            "message_hindi": result["warning_hindi"],
            "message_kannada": result["warning_kannada"],
        })
    else:
        return jsonify({
            "status": "success",
            "is_suspicious": False,
            "matched_phrases": [],
            "risk_level": "LOW",
            "message_hindi": "Yeh message surakshit lagta hai.",
            "message_kannada": "Ee message surakshita eniside.",
        })


# ─── ALL SCHEMES ───────────────────────────────────────────────────────

@app.route("/schemes/all", methods=["GET"])
def all_schemes():
    return jsonify({
        "status": "success",
        "scheme_count": len(SCHEMES_DB),
        "schemes": SCHEMES_DB,
        "message_hindi": f"Kul {len(SCHEMES_DB)} sarkari yojanayen uplabdh hain.",
        "message_kannada": f"Ottu {len(SCHEMES_DB)} sarkari yojanaigalu labdhavide.",
    })


# ─── ERROR HANDLERS ───────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({
        "status": "error",
        "error": "Endpoint not found",
        "message_hindi": "Yeh endpoint uplabdh nahi hai.",
        "message_kannada": "Ee endpoint labdhavilla.",
    }), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({
        "status": "error",
        "error": "Internal server error",
        "message_hindi": "Server mein koi samasya aayi. Kripya dobara prayaas karein.",
        "message_kannada": "Server-nalli samasyeide. Dayavittu matte prayatnisi.",
    }), 500


# ─── RUN SERVER ────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n[BANK] Artha AI - Mock Bank API")
    print(f"   Accounts loaded : {len(ACCOUNTS)}")
    print(f"   Schemes loaded  : {len(SCHEMES_DB)}")
    print(f"   Running on      : http://localhost:5001")
    print(f"   CORS            : Enabled")
    print("-" * 45)
    app.run(host="0.0.0.0", port=5001, debug=True)
