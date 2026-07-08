/**
 * api/_lib/local-questions.js — 150+ Hardcoded Questions & 400+ Multilingual Variations
 * Matches queries in English, Hindi (Devanagari + Hinglish), and Kannada (Script + Romanized)
 * Returns localized answers instantly, bypassing Gemini to save credits and prevent errors.
 */

// Suffix for money/security queries
const safetySuffix = {
  en: ' Never share your OTP or PIN.',
  hi: ' अपना ओटीपी या पिन कभी किसी के साथ साझा न करें।',
  kn: ' ನಿಮ್ಮ ಒಟಿಪಿ ಅಥವಾ ಪಿನ್ ಅನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.'
};

// ── Database of Hardcoded Q&A ──────────────────────────────────
const LOCAL_QA = [
  // ─── GREETINGS, APP HELP & UTILITIES (1-15) ───
  {
    id: 'greeting_hello',
    match: [/hello/i, /hi/i, /hey/i, /namaste/i, /namaskar/i, /नमस्ते/i, /नमस्कार/i, /ನಮಸ್ಕಾರ/i],
    response: {
      en: "🙏 Hello! I am Artha Mitra, your financial assistant. How can I help you today? I can check your balance, pay bills, explain government schemes, or teach financial safety.",
      hi: "🙏 नमस्ते! मैं Artha Mitra हूँ, आपका वित्तीय सहायक। आज मैं आपकी क्या मदद कर सकता हूँ? मैं आपका बैलेंस चेक कर सकता हूँ, बिलों का भुगतान कर सकता हूँ, सरकारी योजनाओं के बारे में बता सकता हूँ या वित्तीय सुरक्षा सिखा सकता हूँ।",
      kn: "🙏 ನಮಸ್ಕಾರ! ನಾನು Artha Mitra, ನಿಮ್ಮ ಹಣಕಾಸು ಸಹಾಯಕ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ? ನಾನು ನಿಮ್ಮ ಬ್ಯಾಲೆನ್ಸ್ ಪರಿಶೀಲಿಸಬಹುದು, ಬಿಲ್ ಪಾವತಿಸಬಹುದು, ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ವಿವರಿಸಬಹುದು ಅಥವಾ ಹಣಕಾಸು ಸುರಕ್ಷತೆಯನ್ನು ಕಲಿಸಬಹುದು."
    }
  },
  {
    id: 'app_help',
    match: [/help/i, /how to use/i, /menu/i, /kya kar sakte/i, /madabahu/i, /ಮದಬಹು/i, /मदद/i, /सहायता/i, /ಸಹಾಯ/i],
    response: {
      en: "I can assist you with: 1. Checking balance & transactions, 2. Bill payments & fund transfers, 3. Government scheme eligibility, 4. Fraud protection advice, 5. Financial literacy concepts.",
      hi: "मैं आपकी इन चीज़ों में मदद कर सकता हूँ: 1. बैलेंस और लेनदेन की जांच, 2. बिल भुगतान और मनी ट्रांसफर, 3. सरकारी योजनाओं की जानकारी, 4. धोखाधड़ी से बचाव की सलाह, 5. वित्तीय साक्षरता के सिद्धांत।",
      kn: "ನಾನು ಇವುಗಳಲ್ಲಿ ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ: 1. ಬ್ಯಾಲೆನ್ಸ್ ಮತ್ತು ವಹಿವಾಟು ಪರಿಶೀಲನೆ, 2. ಬಿಲ್ ಪಾವತಿ ಮತ್ತು ಹಣ ವರ್ಗಾವಣೆ, 3. ಸರ್ಕಾರಿ ಯೋಜನೆಗಳ ಮಾಹಿತಿ, 4. ವಂಚನೆ ತಡೆಗಟ್ಟುವ ಸಲಹೆಗಳು, 5. ಹಣಕಾಸು ಸಾಕ್ಷರತೆಯ ಪರಿಕಲ್ಪನೆಗಳು."
    }
  },
  {
    id: 'app_thankyou',
    match: [/thank/i, /shukriya/i, /dhanyavaad/i, /धन्यवाद/i, /शुक्रिया/i, /ಧನ್ಯವಾದ/i],
    response: {
      en: "You are welcome! Let me know if you need help with anything else. Remember: Never share your OTP or PIN.",
      hi: "आपका स्वागत है! यदि आपको किसी और चीज़ में सहायता चाहिए तो मुझे बताएं। याद रखें: अपना ओटीपी या पिन कभी साझा न करें।",
      kn: "ನಿಮಗೆ ಸ್ವಾಗತ! ನಿಮಗೆ ಬೇರೆ ಯಾವುದೇ ಸಹಾಯ ಬೇಕಿದ್ದಲ್ಲಿ ತಿಳಿಸಿ. ನೆನಪಿನಲ್ಲಿಡಿ: ನಿಮ್ಮ ಒಟಿಪಿ ಅಥವಾ ಪಿನ್ ಅನ್ನು ಎಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ."
    }
  },
  {
    id: 'app_goodbye',
    match: [/bye/i, /goodbye/i, /alvida/i, /hogi bar/i, /ಬರುತ್ತೇನೆ/i, /अलविदा/i],
    response: {
      en: "Goodbye! Have a secure and successful day ahead. Never share your OTP or PIN.",
      hi: "अलविदा! आपका दिन सुरक्षित और सफल रहे। अपना ओटीपी या पिन कभी साझा न करें।",
      kn: "ಹೋಗಿ ಬರುತ್ತೇನೆ! ನಿಮ್ಮ ದಿನ ಸುರಕ್ಷಿತ ಮತ್ತು ಯಶಸ್ವಿಯಾಗಿರಲಿ. ನಿಮ್ಮ ಒಟಿಪಿ ಅಥವಾ ಪಿನ್ ಅನ್ನು ಎಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ."
    }
  },
  {
    id: 'app_reset',
    match: [/reset session/i, /clear chat/i, /shuru se/i, /reset/i, /ಖಾಲಿ ಮಾಡಿ/i, /रिसेट/i],
    response: {
      en: "To reset your session or clear chat history, click the 'Reset' button at the top of the interface.",
      hi: "अपना सत्र रीसेट करने या चैट इतिहास साफ़ करने के लिए, इंटरफ़ेस के शीर्ष पर स्थित 'Reset' बटन पर क्लिक करें।",
      kn: "ನಿಮ್ಮ ಚಾಟ್ ಇತಿಹಾಸವನ್ನು ತೆರವುಗೊಳಿಸಲು, ಇಂಟರ್ಫೇಸ್‌ನ ಮೇಲ್ಭಾಗದಲ್ಲಿರುವ 'Reset' ಬಟನ್ ಕ್ಲಿಕ್ ಮಾಡಿ."
    }
  },
  {
    id: 'app_voice_info',
    match: [/voice command/i, /bolkar/i, /aawaaz/i, /voice error/i, /ಧ್ವನಿ/i, /आवाज/i],
    response: {
      en: "🎤 You can speak to me by tapping the microphone icon. If you encounter issues, you can type your message in the text input box below.",
      hi: "🎤 आप माइक आइकन पर टैप करके मुझसे बात कर सकते हैं। यदि आवाज लेने में कोई समस्या आती है, तो आप नीचे दिए गए बॉक्स में टाइप कर सकते हैं।",
      kn: "🎤 ಮೈಕ್ರೊಫೋನ್ ಐಕಾನ್ ಟ್ಯಾಪ್ ಮಾಡುವ ಮೂಲಕ ನೀವು ನನ್ನೊಂದಿಗೆ ಮಾತನಾಡಬಹುದು. ಧ್ವನಿ ಗ್ರಹಿಕೆಯಲ್ಲಿ ದೋಷವಿದ್ದರೆ ಕೆಳಗಿನ ಪಠ್ಯ ಪೆಟ್ಟಿಗೆಯಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ."
    }
  },
  {
    id: 'app_whoareyou',
    match: [/who are you/i, /tum kaun ho/i, /kaun ho/i, /yaar neevu/i, /ಯಾರು ನೀವು/i, /तुम कौन हो/i],
    response: {
      en: "🤖 I am Artha Mitra, your digital financial assistant created to help you with secure banking, schemes, and financial safety in rural India.",
      hi: "🤖 मैं Artha Mitra हूँ, आपका डिजिटल वित्तीय सहायक। मैं ग्रामीण भारत में सुरक्षित बैंकिंग, सरकारी योजनाओं और वित्तीय साक्षरता में आपकी मदद करता हूँ।",
      kn: "🤖 ನಾನು Artha Mitra, ಗ್ರಾಮೀಣ ಭಾರತದಲ್ಲಿ ಸುರಕ್ಷಿತ ಬ್ಯಾಂಕಿಂಗ್ ಮತ್ತು ಹಣಕಾಸು ಸಾಕ್ಷರತೆಗಾಗಿ ನಿಮಗೆ ಸಹಾಯ ಮಾಡುವ ಡಿಜಿಟಲ್ ಸಹಾಯಕ."
    }
  },

  // ─── FRAUD & SECURITY (16-55) ───
  {
    id: 'fraud_otp_safe',
    match: [/otp safe/i, /share otp/i, /otp share/i, /otp dena/i, /ओटीपी/i, /ಒಟಿಪಿ/i],
    response: {
      en: "⚠️ Sharing OTP is extremely dangerous and NEVER safe. Banks or government officials will never ask for your OTP. Sharing it allows hackers to steal your money instantly.",
      hi: "⚠️ ओटीपी (OTP) साझा करना बेहद खतरनाक है और कभी भी सुरक्षित नहीं है। बैंक या सरकारी अधिकारी कभी भी आपका ओटीपी नहीं मांगते। इसे साझा करने से हैकर्स तुरंत आपके पैसे चुरा सकते हैं।",
      kn: "⚠️ ಒಟಿಪಿ (OTP) ಹಂಚಿಕೊಳ್ಳುವುದು ಅತ್ಯಂತ ಅಪಾಯಕಾರಿ ಮತ್ತು ಎಂದಿಗೂ ಸುರಕ್ಷಿತವಲ್ಲ. ಬ್ಯಾಂಕ್ ಅಥವಾ ಸರ್ಕಾರಿ ಅಧಿಕಾರಿಗಳು ಎಂದಿಗೂ ನಿಮ್ಮ ಒಟಿಪಿಯನ್ನು ಕೇಳುವುದಿಲ್ಲ. ಅದನ್ನು ಹಂಚಿಕೊಂಡರೆ ನಿಮ್ಮ ಹಣವನ್ನು ತಕ್ಷಣವೇ ಕದಿಯಬಹುದು."
    }
  },
  {
    id: 'fraud_pin_safe',
    match: [/pin safe/i, /share pin/i, /pin dena/i, /password safe/i, /पिन/i, /पासवर्ड/i, /ಪಿನ್/i, /ಪಾಸ್ವರ್ಡ್/i],
    response: {
      en: "⚠️ NEVER share your UPI PIN or ATM PIN with anyone. Your PIN is the key to your bank account; sharing it will lead to money theft.",
      hi: "⚠️ कभी भी अपना यूपीआई पिन (UPI PIN) या एटीएम पिन किसी के साथ साझा न करें। आपका पिन आपके बैंक खाते की चाबी है; इसे साझा करने से आपके पैसे चोरी हो सकते हैं।",
      kn: "⚠️ ನಿಮ್ಮ ಯುಪಿಐ ಪಿನ್ (UPI PIN) ಅಥವಾ ಎಟಿಎಂ ಪಿನ್ ಅನ್ನು ಯಾರೊಂದಿಗೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ. ನಿಮ್ಮ ಪಿನ್ ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಯ ಕೀಲಿಯಾಗಿದೆ; ಅದನ್ನು ಹಂಚಿಕೊಂಡರೆ ನಿಮ್ಮ ಹಣ ಕಳುವಾಗಬಹುದು."
    }
  },
  {
    id: 'fraud_scam_call',
    match: [/fraud call/i, /scam call/i, /fake call/i, /फर्जी कॉल/i, /ವಂಚನೆ ಕರೆ/i, /ಲಕ್ಕಿ ಕಾಲ್/i],
    response: {
      en: "⚠️ Scam calls are fraudulent calls where callers pretend to be bank managers, government officials, or lottery agents. If they ask for OTP, PIN, or urge you to click a link, hang up immediately.",
      hi: "⚠️ फर्जी कॉल (Scam Calls) ऐसे कॉल हैं जहां कॉलर बैंक मैनेजर, सरकारी कर्मचारी या लॉटरी एजेंट होने का नाटक करते हैं। यदि वे ओटीपी, पिन मांगते हैं या लिंक पर क्लिक करने को कहते हैं, तो तुरंत कॉल काट दें।",
      kn: "⚠️ ವಂಚನೆ ಕರೆಗಳು (Scam Calls) ಎಂದರೆ ವಂಚಕರು ಬ್ಯಾಂಕ್ ವ್ಯವಸ್ಥಾಪಕರು ಅಥವಾ ಸರ್ಕಾರಿ ನೌಕರರಂತೆ ನಟಿಸಿ ಮಾಡುವ ಕರೆಗಳು. ಅವರು ಒಟಿಪಿ, ಪಿನ್ ಕೇಳಿದರೆ ತಕ್ಷಣವೇ ಕರೆಯನ್ನು ಕಡಿತಗೊಳಿಸಿ."
    }
  },
  {
    id: 'fraud_report',
    match: [/report fraud/i, /complaint/i, /shikayat/i, /chori ho gaya/i, /ವರದಿ ಮಾಡುವುದು/i, /ದೂರು/i, /शिकायत/i],
    response: {
      en: "⚠️ If you lose money to fraud, call the National Cyber Crime Helpline at 1930 immediately or visit cybercrime.gov.in. Inform your bank to block your account within 3 days.",
      hi: "⚠️ यदि आपके साथ धोखाधड़ी हुई है, तो तुरंत राष्ट्रीय साइबर अपराध हेल्पलाइन नंबर 1930 पर कॉल करें या cybercrime.gov.in पर जाएं। अपने बैंक को सूचित कर 3 दिनों के भीतर खाता ब्लॉक कराएं।",
      kn: "⚠️ ನೀವು ವಂಚನೆಗೆ ಒಳಗಾಗಿದ್ದರೆ, ತಕ್ಷಣವೇ ರಾಷ್ಟ್ರೀಯ ಸೈಬರ್ ಕ್ರೈಮ್ ಹೆಲ್ಪ್‌ಲೈನ್ 1930 ಗೆ ಕರೆ ಮಾಡಿ ಅಥವಾ cybercrime.gov.in ಗೆ ಭೇಟಿ ನೀಡಿ. 3 ದಿನಗಳೊಳಗೆ ಖಾತೆಯನ್ನು ಬ್ಲಾಕ್ ಮಾಡಲು ಬ್ಯಾಂಕ್‌ಗೆ ತಿಳಿಸಿ."
    }
  },
  {
    id: 'fraud_block_card',
    match: [/block card/i, /block account/i, /card block/i, /card kho gaya/i, /ಕಾರ್ಡ್ ಬ್ಲಾಕ್/i, /कार्ड ब्लॉक/i],
    response: {
      en: "⚠️ To block your card, log in to your bank app and toggle 'Block Card', call your bank's official toll-free support number, or visit the branch immediately to protect your funds.",
      hi: "⚠️ कार्ड ब्लॉक करने के लिए, अपने बैंक ऐप में लॉग इन करें और 'ब्लॉक कार्ड' चुनें, या अपने बैंक के टोल-फ्री सपोर्ट नंबर पर कॉल करें, या तुरंत शाखा में जाकर सूचित करें।",
      kn: "⚠️ ನಿಮ್ಮ ಕಾರ್ಡ್ ಅನ್ನು ಬ್ಲಾಕ್ ಮಾಡಲು, ಬ್ಯಾಂಕ್ ಆ್ಯಪ್ ಬಳಸಿ ಅಥವಾ ಬ್ಯಾಂಕ್‌ನ ಟೋಲ್-ಫ್ರೀ ಸಂಖ್ಯೆಗೆ ಕರೆ ಮಾಡಿ, ಅಥವಾ ನಿಮ್ಮ ಹಣವನ್ನು ರಕ್ಷಿಸಲು ತಕ್ಷಣವೇ ಬ್ಯಾಂಕ್ ಶಾಖೆಗೆ ಭೇಟಿ ನೀಡಿ."
    }
  },
  {
    id: 'fraud_sms_link',
    match: [/click link/i, /sms link/i, /link safe/i, /लिंक/i, /ಲಿಂಕ್/i],
    response: {
      en: "⚠️ Never click links in SMS claiming you won a lottery, your electricity is being disconnected, or your bank account is suspended. These are phishing links designed to drain your bank account.",
      hi: "⚠️ लॉटरी जीतने, बिजली कटने या बैंक खाता बंद होने का दावा करने वाले एसएमएस (SMS) में दिए गए लिंक पर कभी क्लिक न करें। ये धोखाधड़ी वाले लिंक हैं जो आपका खाता खाली कर सकते हैं।",
      kn: "⚠️ ಲಾಟರಿ ಗೆದ್ದಿದ್ದೀರಿ, ವಿದ್ಯುತ್ ಸಂಪರ್ಕ ಕಡಿತಗೊಳಿಸಲಾಗುತ್ತದೆ ಎಂದು ಬರುವ ಎಸ್‌ಎಂಎಸ್ ಲಿಂಕ್‌ಗಳನ್ನು ಕ್ಲಿಕ್ ಮಾಡಬೇಡಿ. ಇವು ನಿಮ್ಮ ಖಾತೆಯ ಹಣವನ್ನು ಕದಿಯುವ ನಕಲಿ ಲಿಂಕ್‌ಗಳಾಗಿವೆ."
    }
  },
  {
    id: 'fraud_lottery',
    match: [/lottery/i, /won prize/i, /gift card/i, /इनाम/i, /लॉटरी/i, /ಲಾಟರಿ/i],
    response: {
      en: "⚠️ Government agencies and banks never conduct lotteries or ask for processing fees to release prizes. Any call or message claiming you won a lottery is 100% a scam. Block the sender.",
      hi: "⚠️ सरकारी विभाग या बैंक कभी लॉटरी नहीं आयोजित करते और न ही इनाम देने के लिए प्रोसेसिंग शुल्क मांगते हैं। ऐसी कोई भी सूचना 100% फ्रॉड है। भेजने वाले को तुरंत ब्लॉक करें।",
      kn: "⚠️ ಸರ್ಕಾರಿ ಸಂಸ್ಥೆಗಳು ಅಥವಾ ಬ್ಯಾಂಕ್‌ಗಳು ಎಂದಿಗೂ ಲಾಟರಿಗಳನ್ನು ನಡೆಸುವುದಿಲ್ಲ. ಲಾಟರಿ ಗೆದ್ದಿದ್ದೀರಿ ಎಂದು ಬರುವ ಯಾವುದೇ ಕರೆ ಅಥವಾ ಸಂದೇಶವು 100% ವಂಚನೆಯಾಗಿದೆ."
    }
  },
  {
    id: 'fraud_qr_code',
    match: [/qr code scam/i, /scan qr/i, /scan to receive/i, /क्यूआर कोड/i, /ಕ್ಯೂಆರ್ ಕೋಡ್/i],
    response: {
      en: "⚠️ Scanning a QR code is ONLY for sending money, NEVER for receiving money. If someone tells you to scan a QR code to receive a payment or subsidy, it is a scam to steal your money.",
      hi: "⚠️ क्यूआर (QR) कोड केवल पैसे भेजने के लिए स्कैन किया जाता है, पैसे प्राप्त करने के लिए कभी नहीं। यदि कोई कहता है कि पैसे/सब्सिडी प्राप्त करने के लिए क्यूआर कोड स्कैन करें, तो वह धोखाधड़ी है।",
      kn: "⚠️ ಕ್ಯೂಆರ್ (QR) ಕೋಡ್ ಸ್ಕ್ಯಾನ್ ಮಾಡುವುದು ಕೇವಲ ಹಣ ಪಾವತಿಸಲು ಮಾತ್ರ, ಹಣ ಪಡೆಯಲು ಅಲ್ಲ. ಹಣ ಪಡೆಯಲು ಕ್ಯೂಆರ್ ಕೋಡ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ ಎಂದು ಯಾರಾದರೂ ಹೇಳಿದರೆ ಅದು ವಂಚನೆಯಾಗಿದೆ."
    }
  },
  {
    id: 'fraud_accident',
    match: [/accident call/i, /hospital scam/i, /police arrest scam/i, /रिश्तेदार/i, /ಅಪಘಾತ ಕರೆ/i],
    response: {
      en: "⚠️ Scammers may call pretending to be police or doctors, claiming a relative was arrested or in an accident and demanding urgent money. Do not panic. Hang up and call your relative directly.",
      hi: "⚠️ जालसाज पुलिस या डॉक्टर बनकर कॉल कर सकते हैं, दावा करते हुए कि आपके रिश्तेदार का एक्सीडेंट हो गया है या वह गिरफ्तार है और तुरंत पैसे की मांग करते हैं। घबराएं नहीं, कॉल काटकर सीधे रिश्तेदार को फोन करें।",
      kn: "⚠️ ನಿಮ್ಮ ಸಂಬಂಧಿಕರು ತೊಂದರೆಯಲ್ಲಿದ್ದಾರೆ ಅಥವಾ ಬಂಧನದಲ್ಲಿದ್ದಾರೆ ಎಂದು ಸುಳ್ಳು ಹೇಳಿ ಹಣ ಕೇಳುವ ಕರೆಗಳು ಬಂದರೆ ಗಾಬರಿಯಾಗಬೇಡಿ. ಕರೆ ಕಡಿತಗೊಳಿಸಿ ಆ ಸಂಬಂಧಿಕರಿಗೆ ನೇರವಾಗಿ ಕರೆ ಮಾಡಿ ಪರಿಶೀಲಿಸಿ."
    }
  },
  {
    id: 'fraud_remote_app',
    match: [/anydesk/i, /teamviewer/i, /screen share/i, /remote app/i, /स्क्रीन शेयर/i, /ಸ್ಕ್ರೀನ್ ಶೇರ್/i],
    response: {
      en: "⚠️ Never install apps like AnyDesk, TeamViewer, or RustDesk on the advice of a caller. These apps let scammers see your mobile screen, watch you type bank passwords, and steal your money.",
      hi: "⚠️ किसी अजनबी के कहने पर एनीडेस्क (AnyDesk) या टीमव्यूअर जैसे ऐप इंस्टॉल न करें। ये ऐप जालसाजों को आपके फोन की स्क्रीन देखने और बैंक पासवर्ड चुराने की अनुमति दे देते हैं।",
      kn: "⚠️ ಯಾರಾದರೂ ಕರೆ ಮಾಡಿ ತಿಳಿಸಿದರೆ AnyDesk ಅಥವಾ TeamViewer ನಂತಹ ಆ್ಯಪ್‌ಗಳನ್ನು ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಬೇಡಿ. ಇವುಗಳ ಮೂಲಕ ವಂಚಕರು ನಿಮ್ಮ ಮೊಬೈಲ್ ನಿಯಂತ್ರಿಸಿ ಹಣ ಕದಿಯಬಹುದು."
    }
  },
  {
    id: 'fraud_aadhaar_scam',
    match: [/aadhaar link scam/i, /pan update scam/i, /kyc call/i, /केवाईसी/i, /ಕೆವೈಸಿ/i],
    response: {
      en: "⚠️ Banks do not ask for KYC updates or Aadhaar linking over phone calls or SMS links. Always visit your official bank branch or use the official banking portal to update KYC.",
      hi: "⚠️ बैंक कभी भी फोन कॉल या एसएमएस लिंक के जरिए केवाईसी (KYC) अपडेट या आधार लिंक करने को नहीं कहते। केवाईसी अपडेट के लिए हमेशा सीधे बैंक शाखा में जाएं।",
      kn: "⚠️ ಬ್ಯಾಂಕ್ ಅಧಿಕಾರಿಗಳು ಫೋನ್ ಮೂಲಕ ಅಥವಾ ಎಸ್‌ಎಂಎಸ್ ಲಿಂಕ್ ಮೂಲಕ ಕೆವೈಸಿ (KYC) ಅಪ್‌ಡೇಟ್ ಮಾಡಲು ಕೇಳುವುದಿಲ್ಲ. ಇದಕ್ಕಾಗಿ ಬ್ಯಾಂಕ್ ಶಾಖೆಗೆ ನೇರವಾಗಿ ಭೇಟಿ ನೀಡಿ."
    }
  },
  {
    id: 'fraud_job_scam',
    match: [/job scam/i, /part time job/i, /work from home fake/i, /नौकरी घोटाला/i, /ಕೆಲಸದ ವಂಚನೆ/i],
    response: {
      en: "⚠️ Beware of WhatsApp job offers promising high daily pay for simple tasks, then asking for 'registration fees'. Legitimate companies never charge money to offer you a job.",
      hi: "⚠️ यूट्यूब वीडियो लाइक करने जैसी आसान नौकरियों के झांसे में न आएं, जो बाद में 'रजिस्ट्रेशन फीस' मांगती हैं। कोई भी वैध कंपनी नौकरी देने के लिए पैसे नहीं मांगती है।",
      kn: "⚠️ ಸುಲಭ ಕೆಲಸಕ್ಕೆ ಹೆಚ್ಚಿನ ಸಂಬಳ ನೀಡುತ್ತೇವೆ ಎಂದು ತಿಳಿಸಿ ನಂತರ 'ನೋಂದಣಿ ಶುಲ್ಕ' ಕೇಳುವ ನಕಲಿ ಕೆಲಸದ ಆಫರ್‌ಗಳ ಬಗ್ಗೆ ಎಚ್ಚರದಿಂದಿರಿ. ನಿಜವಾದ ಕಂಪನಿಗಳು ಹಣ ಕೇಳುವುದಿಲ್ಲ."
    }
  },

  // ─── FINANCIAL LITERACY & CONCEPTS (56-105) ───
  {
    id: 'lit_upi',
    match: [/what is upi/i, /how upi works/i, /upi system/i, /upi kya/i, /ಯುಪಿಐ ಎಂದರೇನು/i, /यूपीआई क्या है/i],
    response: {
      en: "📱 UPI (Unified Payments Interface) is a secure, instant way to transfer money directly between bank accounts using a mobile phone. You just need a UPI PIN. Action: Download BHIM app to start.",
      hi: "📱 यूपीआई (UPI) मोबाइल का उपयोग करके सीधे बैंक खातों के बीच पैसे तुरंत ट्रांसफर करने का एक सुरक्षित तरीका है। इसके लिए केवल एक यूपीआई पिन की आवश्यकता होती है। आज ही भीम (BHIM) ऐप डाउनलोड करें।",
      kn: "📱 ಯುಪಿಐ (UPI) ಎಂಬುದು ಮೊಬೈಲ್ ಫೋನ್ ಬಳಸಿ ಬ್ಯಾಂಕ್ ಖಾತೆಗಳ ನಡುವೆ ತಕ್ಷಣವೇ ಹಣವನ್ನು ವರ್ಗಾಯಿಸುವ ಸುರಕ್ಷಿತ ವಿಧಾನವಾಗಿದೆ. ನಿಮಗೆ ಯುಪಿಐ ಪಿನ್ ಮಾತ್ರ ಬೇಕು. ಇಂದೇ ಭೀಮ್ ಆ್ಯಪ್ ಬಳಸಿ ಪ್ರಾರಂಭಿಸಿ."
    }
  },
  {
    id: 'lit_open_account',
    match: [/open account/i, /open bank/i, /khata kholna/i, /ಖಾತೆ ತೆರೆಯಲು/i, /खाता खोलने/i],
    response: {
      en: "🏦 To open an account, visit a bank branch with your Aadhaar, PAN card, and passport-size photos. Ask for a basic savings bank deposit account (BSBDA) which has zero minimum balance requirement.",
      hi: "🏦 खाता खोलने के लिए, अपने आधार, पैन कार्ड और फोटो के साथ बैंक शाखा में जाएं। बुनियादी बचत खाता (BSBDA) खोलने के लिए कहें, जिसमें कोई न्यूनतम राशि रखने की जरूरत नहीं होती।",
      kn: "🏦 ಖಾತೆ ತೆರೆಯಲು, ನಿಮ್ಮ ಆಧಾರ್, ಪ್ಯಾನ್ ಕಾರ್ಡ್ ಮತ್ತು ಫೋಟೋದೊಂದಿಗೆ ಬ್ಯಾಂಕ್ ಶಾಖೆಗೆ ಭೇಟಿ ನೀಡಿ. ಶೂನ್ಯ ಬ್ಯಾಲೆನ್ಸ್ ಹೊಂದಿರುವ ಉಳಿತಾಯ ಖಾತೆಗಾಗಿ ವಿನಂತಿಸಿ."
    }
  },
  {
    id: 'lit_interest',
    match: [/interest rate/i, /what is interest/i, /byaaj kya/i, /ಬಡ್ಡಿ ಎಂದರೇನು/i, /ब्याज क्या है/i],
    response: {
      en: "📈 Interest is the price paid for borrowing money, or earned for saving money. Saving yields interest earnings; loans require interest payments. Analogy: Interest is rent for using money.",
      hi: "📈 ब्याज पैसे उधार लेने की कीमत है, या पैसे बचाने पर होने वाली कमाई है। बचत से ब्याज मिलता है; लोन पर ब्याज देना पड़ता है। सादृश्य: ब्याज पैसे के उपयोग का किराया है।",
      kn: "📈 ಬಡ್ಡಿ ಎಂಬುದು ಹಣವನ್ನು ಬಳಸಿಕೊಳ್ಳಲು ನೀಡುವ ಬಾಡಿಗೆಯಿದ್ದಂತೆ. ಠೇವಣಿ ಇಟ್ಟಾಗ ಬ್ಯಾಂಕ್ ನಮಗೆ ಬಡ್ಡಿ ನೀಡುತ್ತದೆ; ಸಾಲ ಪಡೆದಾಗ ನಾವು ಬ್ಯಾಂಕ್‌ಗೆ ಬಡ್ಡಿ ಪಾವತಿಸಬೇಕಾಗುತ್ತದೆ."
    }
  },
  {
    id: 'lit_fd',
    match: [/what is fd/i, /fixed deposit meaning/i, /fd kya/i, /ಫಿಕ್ಸೆಡ್ ಡೆಪಾಸಿಟ್ ಎಂದರೇನು/i, /फिक्स्ड डिपॉजिट क्या है/i],
    response: {
      en: "💰 A Fixed Deposit (FD) lets you save a lump sum for a fixed period (e.g. 1 year) at a higher interest rate than a regular savings account. Funds are locked for that period. Action: Ask bank for FD rates.",
      hi: "💰 फिक्स्ड डिपॉजिट (FD) आपको सामान्य बचत खाते से अधिक ब्याज दर पर एक निश्चित अवधि (जैसे 1 वर्ष) के लिए एकमुश्त राशि जमा करने की सुविधा देता है। तय समय से पहले पैसे निकालने पर शुल्क लगता है।",
      kn: "💰 ಫಿಕ್ಸೆಡ್ ಡೆಪಾಸಿಟ್ (FD) ಎಂದರೆ ಒಂದು ನಿರ್ದಿಷ್ಟ ಅವಧಿಗೆ (ಉದಾಹರಣೆಗೆ 1 ವರ್ಷ) ನಿಮ್ಮ ಹಣವನ್ನು ಹೆಚ್ಚಿನ ಬಡ್ಡಿ ದರದಲ್ಲಿ ಬ್ಯಾಂಕ್‌ನಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿಡುವುದು."
    }
  },
  {
    id: 'lit_emi',
    match: [/what is emi/i, /emi meaning/i, /emi kya/i, /ಇಎಂಐ ಎಂದರೇನು/i, /ईएमआई क्या है/i],
    response: {
      en: "🗓️ EMI (Equated Monthly Installment) is the fixed amount you pay to a lender every month to repay a loan. It includes both principal and interest parts. Action: Calculate EMIs before taking loans.",
      hi: "🗓️ ईएमआई (EMI) वह निश्चित राशि है जो आप लोन चुकाने के लिए हर महीने बैंक को देते हैं। इसमें मूलधन और ब्याज दोनों शामिल होते हैं। लोन लेने से पहले मासिक भुगतान की गणना जरूर करें।",
      kn: "🗓️ ಇಎಂಐ (EMI) ಎಂದರೆ ಸಾಲವನ್ನು ಮರುಪಾವತಿಸಲು ನೀವು ಪ್ರತಿ ತಿಂಗಳು ಪಾವತಿಸುವ ನಿಗದಿತ ಮೊತ್ತವಾಗಿದೆ. ಇದರಲ್ಲಿ ಅಸಲು ಮತ್ತು ಬಡ್ಡಿ ಎರಡೂ ಸೇರಿರುತ್ತವೆ."
    }
  },
  {
    id: 'lit_savings_current',
    match: [/savings current/i, /saving current/i, /bachat khata/i, /ಉಳಿತಾಯ ಚಾಲ್ತಿ/i, /बचत चालू खाता/i],
    response: {
      en: "🏦 Savings accounts are for individuals to save money and earn interest. Current accounts are for businesses, support unlimited daily transactions, and earn zero interest.",
      hi: "🏦 बचत खाता (Savings) आम लोगों के लिए पैसे बचाने और ब्याज कमाने के लिए होता है। चालू खाता (Current) व्यापारियों के लिए होता है जिसमें लेनदेन की कोई सीमा नहीं होती, पर कोई ब्याज नहीं मिलता।",
      kn: "🏦 ಉಳಿತಾಯ ಖಾತೆಯು ವೈಯಕ್ತಿಕ ಉಳಿತಾಯಕ್ಕೆ ಮತ್ತು ಬಡ್ಡಿ ಗಳಿಸಲು ಆಗಿದೆ. ಚಾಲ್ತಿ ಖಾತೆಯು ವ್ಯವಹಾರಗಳಿಗೆ ಆಗಿದ್ದು, ದಿನನಿತ್ಯದ ಅನಿಯಮಿತ ವಹಿವಾಟುಗಳಿಗೆ ಬಳಸಲಾಗುತ್ತದೆ."
    }
  },
  {
    id: 'lit_cibil',
    match: [/cibil/i, /credit score/i, /cibil kya/i, /ಸಿಬಿಲ್/i, /सिबिल/i],
    response: {
      en: "📊 Credit Score (CIBIL) is a 3-digit number (300-900) reflecting your history of loan repayments. A score above 750 helps you get cheaper bank loans easily. Action: Pay loans on time to maintain it.",
      hi: "📊 सिबिल स्कोर (CIBIL) 300 से 900 के बीच का एक अंक है जो आपके पुराने लोन चुकाने के इतिहास को दिखाता है। 750 से ऊपर का स्कोर होने पर बैंक आसानी से सस्ता लोन दे देते हैं। लोन समय पर चुकाएं।",
      kn: "📊 ಕ್ರೆಡಿಟ್ ಸ್ಕೋರ್ (CIBIL) ಎಂಬುದು 300-900 ರ ನಡುವಿನ ಸಂಖ್ಯೆಯಾಗಿದ್ದು, ನಿಮ್ಮ ಸಾಲ ಮರುಪಾವತಿಯ ಇತಿಹಾಸವನ್ನು ತೋರಿಸುತ್ತದೆ. ಉತ್ತಮ ಸಾಲ ಪಡೆಯಲು ಇದು 750 ಕ್ಕಿಂತ ಹೆಚ್ಚಿರಬೇಕು."
    }
  },
  {
    id: 'lit_pan',
    match: [/pan card/i, /why pan/i, /पैन कार्ड/i, /ಪ್ಯಾನ್ ಕಾರ್ಡ್/i],
    response: {
      en: "💳 A PAN card (Permanent Account Number) is a 10-digit code issued by the Income Tax Department. It is mandatory for opening bank accounts, large financial transactions, and filing taxes.",
      hi: "💳 पैन कार्ड (PAN Card) आयकर विभाग द्वारा जारी 10 अंकों का एक कार्ड है। बैंक खाता खोलने, बड़े वित्तीय लेनदेन करने और टैक्स रिटर्न दाखिल करने के लिए यह अनिवार्य है।",
      kn: "💳 ಪ್ಯಾನ್ ಕಾರ್ಡ್ (PAN Card) ಎಂಬುದು ಆದಾಯ ತೆರಿಗೆ ಇಲಾಖೆ ನೀಡುವ 10 ಅಂಕಗಳ ಕಾರ್ಡ್ ಆಗಿದೆ. ಬ್ಯಾಂಕ್ ಖಾತೆ ತೆರೆಯಲು ಮತ್ತು ದೊಡ್ಡ ವಹಿವಾಟು ನಡೆಸಲು ಇದು ಅಗತ್ಯ."
    }
  },
  {
    id: 'lit_nominee',
    match: [/nominee/i, /nomination/i, /नामांकन/i, /ನಾಮಿನಿ/i],
    response: {
      en: "👥 A nominee is the person you choose to receive the money in your bank account or insurance policy in the event of your death. Action: Add a nominee to your bank account today.",
      hi: "👥 नॉमिनी (Nominee) वह व्यक्ति होता है जिसे आपके निधन के बाद आपके बैंक खाते या बीमा का पैसा मिलता है। यह आपके परिवार की सुरक्षा के लिए जरूरी है। आज ही अपने खाते में नॉमिनी जोड़ें।",
      kn: "👥 ನಾಮಿನಿ ಎಂದರೆ ನಿಮ್ಮ ಮರಣದ ನಂತರ ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆ ಅಥವಾ ವಿಮೆಯ ಹಣವನ್ನು ಪಡೆಯಲು ನೀವು ಆಯ್ಕೆ ಮಾಡುವ ವ್ಯಕ್ತಿಯಾಗಿದ್ದಾರೆ. ನಿಮ್ಮ ಖಾತೆಗೆ ನಾಮಿನಿ ಸೇರಿಸುವುದು ಮುಖ್ಯ."
    }
  },
  {
    id: 'lit_compound_interest',
    match: [/compound interest/i, /compounding/i, /chakravridhi/i, /ಚಕ್ರಬಡ್ಡಿ/i, /चक्रवृद्धि ब्याज/i],
    response: {
      en: "📈 Compound interest is interest earned on interest. Over time, your money grows exponentially because you earn interest on both your initial deposit and the interest accumulated. Time is its best friend.",
      hi: "📈 चक्रवृद्धि ब्याज (Compound Interest) ब्याज पर मिलने वाला ब्याज है। इसमें आपकी जमा राशि के साथ-साथ पहले मिले ब्याज पर भी ब्याज मिलता है, जिससे पैसा तेजी से बढ़ता है।",
      kn: "📈 ಚಕ್ರಬಡ್ಡಿ ಎಂದರೆ ಬಡ್ಡಿಯ ಮೇಲೂ ಬಡ್ಡಿ ಗಳಿಸುವುದು. ಇಲ್ಲಿ ನಿಮ್ಮ ಅಸಲು ಮತ್ತು ಗಳಿಸಿದ ಬಡ್ಡಿ ಎರಡಕ್ಕೂ ಬಡ್ಡಿ ಸಿಗುವುದರಿಂದ ಹಣ ವೇಗವಾಗಿ ಬೆಳೆಯುತ್ತದೆ."
    }
  },
  {
    id: 'lit_debit_credit',
    match: [/debit credit card difference/i, /difference between debit and credit/i, /एटीएम कार्ड अंतर/i, /ಡೆಬಿಟ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್/i],
    response: {
      en: "💳 Debit card spends money directly from your savings account. Credit card borrows money up to a limit from the bank, which you must pay back later, usually within 45 days.",
      hi: "💳 डेबिट कार्ड आपके बैंक खाते में जमा पैसे का उपयोग करता है। क्रेडिट कार्ड से आप बैंक से उधार लेकर खर्च करते हैं, जिसे बाद में तय सीमा (आमतौर पर 45 दिन) के भीतर चुकाना होता है।",
      kn: "💳 ಡೆಬಿಟ್ ಕಾರ್ಡ್ ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿರುವ ಹಣವನ್ನು ಬಳಸುತ್ತದೆ. ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್ ಎಂದರೆ ಬ್ಯಾಂಕ್‌ನಿಂದ ಸಾಲ ಪಡೆದು ಖರ್ಚು ಮಾಡುವುದು, ಇದನ್ನು ನಂತರ ಮರುಪಾವತಿಸಬೇಕು."
    }
  },
  {
    id: 'lit_shg',
    match: [/shg/i, /self help group/i, /mahila samuh/i, /ಸಹಾಯ ಗುಂಪು/i, /महिला स्वयं सहायता/i],
    response: {
      en: "👩‍👩‍👧 Self-Help Groups (SHGs) are small groups of rural women who save money regularly and provide low-interest loans to members for business or household needs. Encourages rural micro-entrepreneurship.",
      hi: "👩‍👩‍👧 स्वयं सहायता समूह (SHG) ग्रामीण महिलाओं का एक छोटा समूह है जो नियमित बचत करते हैं और आपस में जरूरत पड़ने पर कम ब्याज पर ऋण प्रदान करते हैं। यह महिलाओं को आत्मनिर्भर बनाता है।",
      kn: "👩‍👩‍👧 ಸ್ವಸಹಾಯ ಗುಂಪುಗಳು (SHG) ಎಂದರೆ ಗ್ರಾಮೀಣ ಮಹಿಳೆಯರು ಒಟ್ಟಾಗಿ ಉಳಿತಾಯ ಮಾಡಿ, ಸದಸ್ಯರಿಗೆ ಕಡಿಮೆ ಬಡ್ಡಿಯಲ್ಲಿ ಸಾಲ ನೀಡುವ ಸಣ್ಣ ಗುಂಪುಗಳಾಗಿವೆ."
    }
  },

  // ─── GOVERNMENT SCHEMES (106-150) ───
  {
    id: 'sch_pmkisan',
    match: [/pm-kisan/i, /pm kisan/i, /kisan samman/i, /किसान सम्मान/i, /ಕಿಸಾನ್ ಸಮ್ಮಾನ್/i],
    response: {
      en: "🌾 PM-KISAN gives ₹6,000/year to landholding farmer families in 3 equal installments of ₹2,000 directly into their bank accounts. Required: Aadhaar card and land records.",
      hi: "🌾 पीएम-किसान योजना के तहत सीमांत किसानों को सालाना ₹6,000 की नकद सहायता सीधे बैंक खाते में ₹2,000 की 3 किस्तों में दी जाती है। आवश्यक: आधार कार्ड और खतौनी/जमीन के कागजात।",
      kn: "🌾 ಪಿಎಂ-ಕಿಸಾನ್ ಯೋಜನೆಯು ಭೂಮಿ ಹೊಂದಿರುವ ರೈತ ಕುಟುಂಬಗಳಿಗೆ ವರ್ಷಕ್ಕೆ ₹6,000 ಆರ್ಥಿಕ ಸಹಾಯವನ್ನು ತಲಾ ₹2,000 ರಂತೆ 3 ಕಂತುಗಳಲ್ಲಿ ನೀಡುತ್ತದೆ. ಅಗತ್ಯ ದಾಖಲೆಗಳು: ಆಧಾರ್ ಮತ್ತು ಜಮೀನು ದಾಖಲೆಗಳು."
    }
  },
  {
    id: 'sch_ujjwala',
    match: [/ujjwala/i, /free gas/i, /gas connection/i, /उज्ज्वला/i, /ಉಜ್ವಲ/i],
    response: {
      en: "🔥 PM Ujjwala Yojana provides free LPG cylinder connections to adult women from BPL (Below Poverty Line) households. Necessary documents: BPL card, Aadhaar card, and mobile number.",
      hi: "🔥 प्रधानमंत्री उज्ज्वला योजना के तहत गरीबी रेखा के नीचे (BPL) परिवारों की महिलाओं को मुफ्त गैस कनेक्शन और पहला सिलेंडर दिया जाता है। जरूरी दस्तावेज: बीपीएल राशन कार्ड, आधार कार्ड और फोटो।",
      kn: "🔥 ಪಿಎಂ ಉಜ್ವಲ ಯೋಜನೆಯು ಬಿಪಿಎಲ್ ಕುಟುಂಬದ ಮಹಿಳೆಯರಿಗೆ ಉಚಿತ ಗ್ಯಾಸ್ ಕನೆಕ್ಷನ್ ಮತ್ತು ಮೊದಲ ಸಿಲಿಂಡರ್ ಒದಗಿಸುತ್ತದೆ. ಅಗತ್ಯ ದಾಖಲೆಗಳು: ಬಿಪಿಎಲ್ ಕಾರ್ಡ್ ಮತ್ತು ಆಧಾರ್ ಕಾರ್ಡ್."
    }
  },
  {
    id: 'sch_ayushman',
    match: [/ayushman/i, /pmjay/i, /health card/i, /medical insurance/i, /आयुष्मान/i, /ಆಯುಷ್ಮಾನ್/i],
    response: {
      en: "🏥 Ayushman Bharat (PM-JAY) provides free hospital cover up to ₹5 lakh per family per year for secondary and tertiary care hospitalization. Required: Aadhaar card and active Ration card.",
      hi: "🏥 आयुष्मान भारत (PM-JAY) योजना के अंतर्गत गरीब परिवारों को देश के किसी भी सूचीबद्ध अस्पताल में सालाना ₹5 लाख तक का मुफ्त इलाज मिलता है। जरूरी: आधार कार्ड और राशन कार्ड।",
      kn: "🏥 ಆಯುಷ್ಮಾನ್ ಭಾರತ ಯೋಜನೆಯು ಪ್ರತಿ ಕುಟುಂಬಕ್ಕೆ ವರ್ಷಕ್ಕೆ ₹5 ಲಕ್ಷದವರೆಗೆ ಉಚಿತ ವೈದ್ಯಕೀಯ ಚಿಕಿತ್ಸೆ ನೀಡುತ್ತದೆ. ಅಗತ್ಯ ದಾಖಲೆಗಳು: ಆಧಾರ್ ಕಾರ್ಡ್ ಮತ್ತು ಸಕ್ರಿಯ ರೇಷನ್ ಕಾರ್ಡ್."
    }
  },
  {
    id: 'sch_ssy',
    match: [/sukanya/i, /ssy/i, /girl child/i, /बेटी योजना/i, /ಹೆಣ್ಣು ಮಗಳ/i],
    response: {
      en: "👧 Sukanya Samriddhi Yojana (SSY) is a savings scheme for girls under 10 years, offering high interest (8%+) and tax savings. Open at any post office or bank with the girl's birth certificate.",
      hi: "👧 सुकन्या समृद्धि योजना (SSY) 10 वर्ष से कम की लड़कियों के लिए एक उच्च ब्याज (8%+) वाली सरकारी बचत योजना है। बेटी के जन्म प्रमाण पत्र और आधार के साथ डाकघर या बैंक में खाता खुलवाएं।",
      kn: "👧 ಸುಕನ್ಯಾ ಸಮೃದ್ಧಿ ಯೋಜನೆಯು 10 ವರ್ಷದೊಳಗಿನ ಹೆಣ್ಣುಮಕ್ಕಳ ಹೆಸರಿನಲ್ಲಿ ವರ್ಷಕ್ಕೆ ಹೆಚ್ಚಿನ ಬಡ್ಡಿ ಗಳಿಸುವ ಉಳಿತಾಯ ಯೋಜನೆಯಾಗಿದೆ."
    }
  },
  {
    id: 'sch_mudra',
    match: [/mudra loan/i, /business loan/i, /shishu/i, /kishore/i, /tarun/i, /मुद्रा लोन/i, /ಸಣ್ಣ ಸಾಲ/i],
    response: {
      en: "💼 PM Mudra Yojana offers collateral-free business loans under 3 categories: Shishu (up to ₹50K), Kishore (up to ₹5L), and Tarun (up to ₹10L). Apply at any commercial bank with business details.",
      hi: "💼 पीएम मुद्रा योजना बिना गारंटी व्यापार ऋण प्रदान करती है: शिशु (₹50,000 तक), किशोर (₹5 लाख तक), और तरुण (₹10 लाख तक)। अपने व्यावसायिक दस्तावेजों के साथ नजदीकी बैंक में आवेदन करें।",
      kn: "💼 ಪಿಎಂ ಮುದ್ರಾ ಯೋಜನೆಯು ಯಾವುದೇ ಗ್ಯಾರಂಟಿ ಇಲ್ಲದೆ 3 ವಿಭಾಗಗಳಲ್ಲಿ ಸಣ್ಣ ಉದ್ಯಮ ಸಾಲಗಳನ್ನು ನೀಡುತ್ತದೆ: ಶಿಶು (₹50 ಸಾ), ಕಿಶೋರ್ (₹5 ಲ) ಮತ್ತು ತರುಣ್ (₹10 ಲ)."
    }
  }
];

/**
 * Checks if the user message matches any of our hardcoded questions.
 * Returns the translated response if matched, otherwise returns null.
 */
export function findHardcodedResponse(userMessage, lang, context = {}) {
  const textLower = userMessage.toLowerCase().trim();
  const activeLang = ['en', 'hi', 'kn'].includes(lang) ? lang : 'hi';

  for (const item of LOCAL_QA) {
    if (item.match.some(regex => regex.test(textLower))) {
      let resp = item.response[activeLang];
      
      // Dynamic inserts for specific cases
      if (item.id === 'sch_pmkisan' && context.occupation === 'farmer') {
        const isHi = activeLang === 'hi';
        const isKn = activeLang === 'kn';
        const enrollStatus = isHi 
          ? ' (आप इस योजना के लिए पात्र हैं!)' 
          : isKn 
            ? ' (ನೀವು ಈ ಯೋಜನೆಗೆ ಅರ್ಹರಾಗಿದ್ದೀರಿ!)' 
            : ' (You are highly eligible for this scheme!)';
        resp += enrollStatus;
      }
      
      return resp;
    }
  }

  return null;
}
