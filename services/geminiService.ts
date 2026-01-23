
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, AIResponse, SpendingInsight } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const extractTransactions = async (input: string, activeAccounts: string[]): Promise<AIResponse[]> => {
  const EXTRACTION_PROMPT = `
You are Artho-AI, a smart financial assistant for Bangladeshis. 
Identify every single financial event (expenses, income, lending) mentioned in the text.

RULES:
1. DETECT ALL events.
2. CURRENCY: BDT (৳). 
3. ACCOUNTS: Map to [${activeAccounts.join(', ')}]. Default to "CASH".
4. CATEGORIES: Food, Transport, Bills, Shopping, Entertainment, Education, Health, Income, or Others.
5. NOTES: English notes (e.g., "Bus fare", "Loan to friend").

Return an ARRAY of objects.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract transactions: "${input}"`,
      config: {
        systemInstruction: EXTRACTION_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER },
              category: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['expense', 'income'] },
              source: { type: Type.STRING },
              note: { type: Type.STRING },
              confidence: { type: Type.NUMBER }
            },
            required: ["amount", "category", "type", "note", "source"]
          }
        }
      }
    });

    const results = JSON.parse(response.text.trim());
    return Array.isArray(results) ? results : [results];
  } catch (error) {
    console.error("AI Extraction Error:", error);
    return [];
  }
};

export const generateInsights = async (transactions: Transaction[]): Promise<SpendingInsight[]> => {
  if (transactions.length < 1) return [];

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals: Record<string, number> = {};
  
  transactions.forEach(t => {
    if (t.type === 'income') totalIncome += t.amount;
    else {
      totalExpense += t.amount;
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    }
  });

  const currentBalance = totalIncome - totalExpense;
  const sortedCategories = Object.entries(categoryTotals).sort((a,b) => b[1] - a[1]);
  const topCategory = sortedCategories[0]?.[0] || 'N/A';
  const topCategoryAmount = sortedCategories[0]?.[1] || 0;

  // Local Fallback Logic: Generates insights deterministically without AI
  const getFallbackInsights = (): SpendingInsight[] => {
    const insights: SpendingInsight[] = [];
    
    // Insight 1: Financial Health
    if (currentBalance < 0) {
        insights.push({
            title: "সতর্কতা: নেতিবাচক ব্যালেন্স",
            message: `আপনার খরচের পরিমাণ আয় থেকে বেশি। অপ্রয়োজনীয় খরচ কমিয়ে আনুন।`,
            type: "warning"
        });
    } else if (totalExpense > totalIncome * 0.8 && totalIncome > 0) {
        insights.push({
            title: "বাজেট সতর্কতা",
            message: `আপনি আপনার আয়ের ৮০% এর বেশি খরচ করে ফেলেছেন। সঞ্চয়ের দিকে মনোযোগ দিন।`,
            type: "warning"
        });
    } else {
        insights.push({
            title: "আর্থিক অবস্থা",
            message: `আপনার আর্থিক অবস্থা স্থিতিশীল। হাতে জমা আছে ৳${currentBalance.toLocaleString()}।`,
            type: "positive"
        });
    }

    // Insight 2: Top Spending Category
    if (topCategory !== 'N/A') {
        insights.push({
            title: "সর্বোচ্চ খরচ",
            message: `এই মাসে ${topCategory} খাতে সর্বোচ্চ ৳${topCategoryAmount.toLocaleString()} খরচ হয়েছে।`,
            type: "info"
        });
    } else {
        insights.push({
            title: "বিনিয়োগ পরামর্শ",
            message: "ভবিষ্যতের জন্য নিয়মিত অল্প করে হলেও সঞ্চয় শুরু করুন।",
            type: "info"
        });
    }

    return insights;
  };

  const contextStr = `
Balance: ৳${currentBalance}
Income: ৳${totalIncome}
Expenses: ৳${totalExpense}
Top Spend: ${topCategory}
Recent: ${transactions.slice(-3).map(t => `${t.note} (৳${t.amount})`).join(', ')}
`;

  const INSIGHT_PROMPT = `
You are a expert Financial Advisor. Analyze the user's context and provide 2 CONCISE actionable insights in BENGALI.

Guidelines:
1. Card 1: "সঞ্চয় ও বিনিয়োগ" - Advice on saving/investing based on their ৳${currentBalance} balance.
2. Card 2: "বাজেট পরিকল্পনা" - Advice on cutting costs based on their spending of ৳${totalExpense}.

Keep messages brief (max 2-3 sentences) to fit in small UI cards.
Return as JSON array.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Financial Context:\n${contextStr}`,
      config: {
        systemInstruction: INSIGHT_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              message: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['info', 'positive', 'warning'] }
            },
            required: ["title", "message", "type"]
          }
        }
      }
    });
    return JSON.parse(response.text.trim());
  } catch (error: any) {
    // If quota exceeded (429) or other error, fallback to local logic
    const isQuotaError = error.status === 429 || error.message?.includes('429') || error.message?.includes('quota');
    if (isQuotaError) {
      console.warn("Gemini API Quota Exceeded. Using local fallback insights.");
    } else {
      console.error("AI Insight Error (using fallback):", error);
    }
    return getFallbackInsights();
  }
};
