import { GoogleGenAI } from "@google/genai";
import { Income, Expense, Investment, Transaction, TransactionType, AIAnalysisType } from "../types";

export type AIProvider = 'groq' | 'gemini';

const getGroqApiKey = () => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    const val = import.meta.env.VITE_GROQ_API_KEY;
    if (val) return val;
  }

  try {
    // @ts-ignore
    return process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY || '';
  } catch (e) {
    return '';
  }
};

// --- API HANDLERS ---

const callGroq = async (prompt: string, jsonMode = false): Promise<string> => {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error("VITE_GROQ_API_KEY não configurada.");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      response_format: jsonMode ? { type: "json_object" } : undefined
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Groq API: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
};

const callGemini = async (prompt: string, jsonMode = false): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: jsonMode ? "application/json" : "text/plain"
    }
  });
  return response.text || "";
};

// --- MAIN EXPORTS (DEFAULT TO GROQ) ---

export const analyzeWithAI = async (
  type: AIAnalysisType,
  provider: AIProvider = 'groq',
  data: any
): Promise<string> => {
  const prompt = `Analise estes dados financeiros (${type}): ${JSON.stringify(data)}. Responda em Português Markdown detalhado.`;
  if (provider === 'groq') {
    try { return await callGroq(prompt); } catch (e) { return await callGemini(prompt); }
  }
  return await callGemini(prompt);
};

export const suggestBasicBudget = async (
  totalIncome: number,
  paysRent: boolean,
  provider: AIProvider = 'groq',
  mandatoryExpenses?: string
): Promise<string> => {
  const prompt = `Crie orçamento para renda R$ ${totalIncome}. Aluguel: ${paysRent}. Obrigatorios: ${mandatoryExpenses}. Retorne Markdown e JSON_DATA [ { "name", "amount", "category", "type", "isInvestment", "annualRate" } ]`;
  if (provider === 'groq') {
    try { return await callGroq(prompt); } catch (e) { return await callGemini(prompt); }
  }
  return await callGemini(prompt);
};

export const suggestCategories = async (descriptions: string[], categories: string[], provider: AIProvider = 'groq'): Promise<Record<string, string>> => {
  const prompt = `Categorize estas descrições usando as categorias: ${categories.join(', ')}. Retorne JSON { "desc": "cat" }. Itens: ${JSON.stringify(descriptions)}`;
  const res = (provider === 'groq') ? await callGroq(prompt, true) : await callGemini(prompt, true);
  try { return JSON.parse(res); } catch (e) { return {}; }
};

export const parseBankStatement = async (text: string, provider: AIProvider = 'groq'): Promise<any[]> => {
  const prompt = `Extraia transações deste extrato: ${text}. Retorne JSON [ { "description", "amount", "date", "transactionType" } ]`;
  const res = (provider === 'groq') ? await callGroq(prompt, true) : await callGemini(prompt, true);
  try { return JSON.parse(res); } catch (e) { return []; }
};

export const suggestShoppingCategories = async (itemNames: string[], provider: AIProvider = 'groq'): Promise<Record<string, { category: string, price: number }>> => {
  const prompt = `Sugira categoria e preço médio para: ${JSON.stringify(itemNames)}. Retorne JSON { "item": { "category", "price" } }`;
  const res = (provider === 'groq') ? await callGroq(prompt, true) : await callGemini(prompt, true);
  try { return JSON.parse(res); } catch (e) { return {}; }
};