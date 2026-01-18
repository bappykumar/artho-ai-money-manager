
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, AIResponse, SpendingInsight } from "../types";

// Initialize Gemini with the system-provided API Key
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const EXTRACTION_PROMPT = `
You are Artho-AI, a specialized financial assistant for Bangladeshi users. 
Your goal is to extract transaction details from natural language (Bangla, English, or Banglish).

RULES:
1. CURRENCY: Always treat amounts as BDT (৳). If the user writes amounts in Bengali digits (e.g., ৫০০), convert them to English digits (500).
2. SOURCE DETECTION:
   - 'BRAC BANK': brac, ব্র্যাক, ব্যাংক
   - 'DBBL': dbbl, ডাচ বাংলা, ডাচবাংলা
   - 'BKASH': bkash, বিকাশ
   - 'CASH': cash, নগদ, ক্যাশ, হাত খরচ
3. CATEGORY DETECTION: Use your intelligence to map to: Food, Transport, Bills, Shopping, Entertainment, Health, Education, Income, or Others.
4. TYPE: 'income' for earnings/deposits, 'expense' for spendings.
5. NOTE: Write a short, meaningful note in English summarizing the activity.

If you can't find a source, default to 'CASH'. 
If the amount is missing, return confidence 0.
`;

export const extractTransaction = async (input: string): Promise<AIResponse | null> => {
  if (!process.env.API_KEY) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Input to process: "${input}"`,
      config: {
        systemInstruction: EXTRACTION_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            category: { 
              type: Type.STRING, 
              enum: ['Food', 'Transport', 'Bills', 'Shopping', 'Entertainment', 'Education', 'Health', 'Income', 'Others'] 
            },
            type: { type: Type.STRING, enum: ['expense', 'income'] },
            source: { type: Type.STRING, enum: ['BRAC BANK', 'DBBL', 'BKASH', 'CASH'] },
            note: { type: Type.STRING },
            confidence: { type: Type.NUMBER }
          },
          required: ["amount", "category", "type", "note", "source"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    return null;
  }
};

export const generateInsights = async (transactions: Transaction[]): Promise<SpendingInsight[]> => {
  if (transactions.length === 0 || !process.env.API_KEY) return [];

  // Filter for last month's relevance
  const historyStr = transactions.slice(-40).map(t => 
    `${t.date}: ${t.type} of ৳${t.amount} via ${t.source} for ${t.category} (${t.note})`
  ).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this user's spending habits. Provide exactly two strategic insights in Bengali. 
      The tone should be professional yet encouraging (like a rich friend's advice).
      
      User Data:
      ${historyStr}`,
      config: {
        systemInstruction: "You are 'Artho Advisor'. Provide financial strategy specifically for the Bangladeshi lifestyle. Focus on savings and smart spending. Return exactly 2 insights in Bengali JSON format.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          minItems: 2,
          maxItems: 2,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Bengali Heading" },
              message: { type: Type.STRING, description: "Bengali Advice Message" },
              type: { type: Type.STRING, enum: ['info', 'positive', 'warning'] }
            },
            required: ["title", "message", "type"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini Insights Error:", error);
    return [];
  }
};
