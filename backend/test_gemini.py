import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")

genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.5-flash-lite")
try:
    response = model.generate_content("hello")
    print("SUCCESS:", response.text)
except Exception as e:
    print("ERROR:", e)
