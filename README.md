# 💰 Artho - Personal AI Money Manager

Artho (অর্থ) is a next-generation personal finance application designed to eliminate the friction of manual expense tracking. Using Google Gemini AI, it transforms natural language sentences or voice commands into structured financial data.

## ✨ Key Features

- **🗣️ Natural Language Input:** Just type or say "৩০০ টাকা বাজারে খরচ হলো" or "Dinner at Sultans Dine 1200tk from bKash".
- **🤖 AI Categorization:** Automatically identifies categories (Food, Transport, Bills, etc.) and payment sources (bKash, Bank, Cash).
- **🧠 Artho Advisor:** AI-driven strategic insights in Bengali to help you save more and spend wisely.
- **🔒 Secure Vault:** Protected by a 4-digit PIN system to keep your financial data private.
- **📊 Interactive Dashboard:** Visual breakdown of spending habits using Recharts.
- **📱 Responsive Design:** Clean, minimal, and aesthetic UI built with Tailwind CSS.

## 🚀 Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS
- **AI Engine:** Google Gemini API (@google/genai)
- **Charts:** Recharts
- **Storage:** Browser LocalStorage (Offline support)

## 🛠️ Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/artho-ai-money-manager.git
   ```

2. **Environment Variable:**
   To use the AI features, you need a Gemini API Key. Get it from [Google AI Studio](https://aistudio.google.com/).
   - Add your key to your environment variables as `API_KEY`.

3. **Running the App:**
   This project uses ES modules via import maps, so you can serve it using any local static file server (like Live Server in VS Code).

## 🛡️ Security Note
All financial data is stored locally on your device's browser. No financial data is sent to any server except for the natural language processing via Google Gemini API.
