import re
text = "send 500rs. to arjun account"
amount_match = re.search(r"(\d+)", text)
amount = float(amount_match.group(1)) if amount_match else None
print(amount)
