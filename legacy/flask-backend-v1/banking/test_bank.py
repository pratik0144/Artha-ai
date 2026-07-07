import copy
from mock_bank import (
    ACCOUNTS,
    SCHEMES_DB,
    get_balance,
    check_scheme_eligibility,
    transfer_funds,
    flag_fraud_risk,
    pay_bill,
    enroll_scheme,
)

def run_tests():
    print("Running Mock Bank Tests...\n" + "="*30)
    passed = 0
    total = 10

    # We use JD-1001 and JD-1002 as the main test accounts (based on what we populated)
    account1 = "JD-1001"
    account2 = "JD-1002"
    account3 = "SB-3001"

    # Backup the original balance to restore later, to prevent test side effects
    orig_balance1 = ACCOUNTS[account1]["balance"]
    orig_balance2 = ACCOUNTS[account2]["balance"]

    # 1. get_balance
    try:
        bal = get_balance(account1)
        if bal.startswith("₹"):
            print("[PASS] test_get_balance")
            passed += 1
        else:
            print(f"[FAIL] test_get_balance — expected starting with ₹, got '{bal}'")
    except Exception as e:
        print(f"[FAIL] test_get_balance — error: {e}")

    # 2. check_scheme_eligibility
    try:
        eligible = check_scheme_eligibility(account1)
        if isinstance(eligible, list) and len(eligible) > 0:
            print("[PASS] test_check_scheme_eligibility")
            passed += 1
        else:
            print(f"[FAIL] test_check_scheme_eligibility — expected non-empty list, got {eligible}")
    except Exception as e:
        print(f"[FAIL] test_check_scheme_eligibility — error: {e}")

    # 3. transfer_funds success
    try:
        initial = ACCOUNTS[account1]["balance"]
        res = transfer_funds(account1, account2, 500)
        if res.get("success") is True and ACCOUNTS[account1]["balance"] == initial - 500:
            print("[PASS] test_transfer_funds_success")
            passed += 1
        else:
            print(f"[FAIL] test_transfer_funds_success — expected balance drop by 500, got: {res}")
    except Exception as e:
        print(f"[FAIL] test_transfer_funds_success — error: {e}")

    # 4. transfer_funds insufficient
    try:
        res = transfer_funds(account2, account1, 999999)
        if res.get("success") is False and "Insufficient balance" in res.get("error", ""):
            print("[PASS] test_transfer_funds_insufficient")
            passed += 1
        else:
            print(f"[FAIL] test_transfer_funds_insufficient — expected insufficient funds error, got: {res}")
    except Exception as e:
        print(f"[FAIL] test_transfer_funds_insufficient — error: {e}")

    # 5. flag_fraud_risk suspicious
    try:
        res = flag_fraud_risk("Sir aapka OTP batao account band hoga")
        if res.get("is_suspicious") is True:
            print("[PASS] test_flag_fraud_risk_suspicious")
            passed += 1
        else:
            print(f"[FAIL] test_flag_fraud_risk_suspicious — expected True, got {res.get('is_suspicious')}")
    except Exception as e:
        print(f"[FAIL] test_flag_fraud_risk_suspicious — error: {e}")

    # 6. flag_fraud_risk safe
    try:
        res = flag_fraud_risk("Mera balance kya hai")
        if res.get("is_suspicious") is False:
            print("[PASS] test_flag_fraud_risk_safe")
            passed += 1
        else:
            print(f"[FAIL] test_flag_fraud_risk_safe — expected False, got {res.get('is_suspicious')}")
    except Exception as e:
        print(f"[FAIL] test_flag_fraud_risk_safe — error: {e}")

    # 7. pay_bill
    try:
        initial = ACCOUNTS[account1]["balance"]
        res = pay_bill(account1, "electricity", 200)
        if res.get("success") is True and ACCOUNTS[account1]["balance"] == initial - 200:
            print("[PASS] test_pay_bill")
            passed += 1
        else:
            print(f"[FAIL] test_pay_bill — expected balance drop by 200, got {res}")
    except Exception as e:
        print(f"[FAIL] test_pay_bill — error: {e}")

    # 8. enroll_scheme
    try:
        # JD-1001 is already in PM-KISAN, so let's try a scheme they are eligible for but not enrolled in:
        eligible_schemes = check_scheme_eligibility(account1)
        scheme_to_test = eligible_schemes[0] if eligible_schemes else "PM Fasal Bima Yojana"
        res = enroll_scheme(account1, scheme_to_test)
        
        if res.get("success") is True and scheme_to_test in ACCOUNTS[account1]["linked_schemes"]:
            print("[PASS] test_enroll_scheme")
            passed += 1
        else:
            print(f"[FAIL] test_enroll_scheme — expected enrollment success, got {res}")
    except Exception as e:
        print(f"[FAIL] test_enroll_scheme — error: {e}")

    # 9. All 6 accounts exist with required fields
    try:
        req_fields = ["account_id", "name", "age", "gender", "language", "occupation", "location", "balance", "account_type", "linked_aadhaar", "linked_schemes", "transaction_history", "has_smartphone", "phone_number", "bpl_card", "land_acres", "fraud_history", "fraud_notes"]
        all_good = True
        
        if len(ACCOUNTS) != 6:
            print(f"[FAIL] test_accounts_exist — expected 6 accounts, got {len(ACCOUNTS)}")
            all_good = False
            
        if all_good:
            for acct_id, data in ACCOUNTS.items():
                missing = [f for f in req_fields if f not in data]
                if missing:
                    print(f"[FAIL] test_accounts_exist — account {acct_id} missing fields: {missing}")
                    all_good = False
                    break
                    
        if all_good:
            print("[PASS] test_accounts_exist")
            passed += 1
    except Exception as e:
        print(f"[FAIL] test_accounts_exist — error: {e}")

    # 10. SCHEMES_DB has at least 10 schemes with bilingual descriptions
    try:
        if len(SCHEMES_DB) >= 10:
            all_bilingual = True
            for name, data in SCHEMES_DB.items():
                if "description_hindi" not in data or "description_kannada" not in data:
                    print(f"[FAIL] test_schemes_db — scheme {name} missing language descriptions")
                    all_bilingual = False
                    break
            
            if all_bilingual:
                print("[PASS] test_schemes_db")
                passed += 1
        else:
            print(f"[FAIL] test_schemes_db — expected at least 10 schemes, got {len(SCHEMES_DB)}")
    except Exception as e:
        print(f"[FAIL] test_schemes_db — error: {e}")

    # Clean up (restore state)
    ACCOUNTS[account1]["balance"] = orig_balance1
    ACCOUNTS[account2]["balance"] = orig_balance2

    # Summary
    print("="*30)
    print(f"{passed}/{total} tests passed — mock bank ready" if passed == total else f"{passed}/{total} tests passed — some failures occurred.")

if __name__ == "__main__":
    run_tests()
