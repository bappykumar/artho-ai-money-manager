
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, AIResponse, SpendingInsight } from "../types";

// Always initialize directly as per instructions
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const EXTRACTION_PROMPT = `
You are a financial AI agent. Your task is to extract transaction details from the user's natural language input (Bangla or English).
Users will mention where the money is coming from or going to.

Account Sources:
- 'BRAC BANK' (Look for: brac, ব্র্যাক, ব্যাংক)
- 'DBBL' (Look for: dbbl, ডাচ বাংলা)
- 'BKASH' (Look for: bkash, বিকাশ)
- 'CASH' (Look for: cash, নগদ, ক্যাশ)
Default to 'CASH' if no source is mentioned.

Categorize into: Food, Transport, Bills, Shopping, Entertainment, Health, Education, Others, or Income.
Defaults:
- If it sounds like earning/salary, type is 'income'.
- If it's spending, type is 'expense'.

IMPORTANT: Return valid JSON.
`;

export const extractTransaction = async (input: string): Promise<AIResponse | null> => {
  if (!process.env.API_KEY) {
    console.error("Gemini API Key is missing in process.env");
    return null;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: input,
      config: {
        systemInstruction: EXTRACTION_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "The numeric amount mentioned." },
            category: { type: Type.STRING, description: "The category of the transaction." },
            type: { type: Type.STRING, description: "expense or income" },
            source: { type: Type.STRING, description: "BRAC BANK, DBBL, BKASH, or CASH" },
            note: { type: Type.STRING, description: "A short descriptive note in English." },
            dateRelative: { type: Type.STRING, description: "Relative date like today, yesterday, etc." },
            confidence: { type: Type.NUMBER, description: "0 to 1 confidence score." }
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

  const historyStr = transactions.slice(-30).map(t => 
    `${t.date}: ${t.type} of ${t.amount} from ${t.source} for ${t.category} (${t.note})`
  ).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze these transactions as a World-Class Financial Advisor. 
      You MUST return exactly TWO insights written in Bengali (Bangla) language:
      1. STATUS ANALYSIS: A deep look at their current balance and trends in Bengali. 
      2. STRATEGIC NUDGE: Concrete advice in Bengali.

      Transactions:
      ${historyStr}`,
      config: {
        systemInstruction: "You are 'Artho Advisor'. You are calm and brilliant. You focus on wealth growth. Provide exactly 2 distinct insights in Bengali (Bangla) language in JSON format.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          minItems: 2,
          maxItems: 2,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Clear Section Title in Bengali." },
              message: { type: Type.STRING, description: "The detailed analysis or advice in Bengali." },
              type: { type: Type.STRING, description: "info or positive" }
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
