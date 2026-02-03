import { GoogleGenAI } from "@google/genai";
import { Income, Expense, Investment } from "../types";

export type AIProvider = 'groq' | 'gemini';

// --- CONFIGURATION ---
const getGroqApiKey = () => process.env.GROQ_API_KEY;
const getGeminiApiKey = () => process.env.API_KEY || process.env.GEMINI_API_KEY;

// --- PROMPT GENERATORS ---

const createBudgetPrompt = (incomes: Income[], expenses: Expense[]): string => {
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const incomeBreakdown = incomes.map(i => `- ${i.personName}: R$ ${i.amount.toFixed(2)}`).join('\n');
  const expenseBreakdown = expenses.map(e => `- ${e.name} (${e.category}, ${e.type}): R$ ${e.amount.toFixed(2)}`).join('\n');

  return `
    Atue como um consultor financeiro pessoal experiente. Analise os seguintes dados orçamentários:

    Resumo:
    - Renda Total: R$ ${totalIncome.toFixed(2)}
    - Despesas Totais: R$ ${totalExpenses.toFixed(2)}
    - Saldo: R$ ${(totalIncome - totalExpenses).toFixed(2)}

    Fontes de Renda:
    ${incomeBreakdown}

    Lista de Despesas:
    ${expenseBreakdown}

    Por favor, forneça:
    1. Uma avaliação da saúde financeira (Saudável, Atenção ou Crítica).
    2. Três recomendações específicas e acionáveis para economizar ou otimizar o orçamento.
    3. Análise de teto de gastos variáveis sugerido.

    Responda em português do Brasil, use formatação Markdown. Seja direto.
  `;
};

const createInvestmentPrompt = (investments: Investment[], totalIncome: number): string => {
  const investmentList = investments.map(inv => 
    `- ${inv.name} (${inv.category}): R$ ${inv.amount.toFixed(2)} por mês (Rentabilidade est.: ${inv.annualRate}%)`
  ).join('\n');

  const totalInvested = investments.reduce((sum, i) => sum + i.amount, 0);
  const investmentRate = totalIncome > 0 ? (totalInvested / totalIncome) * 100 : 0;

  return `
    Atue como um consultor de investimentos sênior. Analise esta carteira de investimentos recorrentes:

    Resumo:
    - Total Investido Mensalmente: R$ ${totalInvested.toFixed(2)}
    - Porcentagem da Renda Comprometida: ${investmentRate.toFixed(1)}%

    Ativos:
    ${investmentList}

    Tarefa:
    Para CADA investimento listado, explique:
    1. Se é uma boa ou má escolha considerando a categoria do ativo (ex: Renda Fixa, Ações, Cripto).
    2. Se a quantidade de dinheiro investida está adequada (considere diversificação e risco).
    3. Pontos positivos e riscos desse tipo de investimento.

    No final, dê um parecer geral sobre a diversificação da carteira.
    Responda em português do Brasil, use formatação Markdown, seja direto.
  `;
};

// --- API HANDLERS ---

const callGroq = async (prompt: string): Promise<string> => {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error("Chave da API Groq não encontrada (GROQ_API_KEY).");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile"
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Erro na API Groq: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "Sem resposta do Groq.";
};

const callGemini = async (prompt: string): Promise<string> => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("Chave da API Gemini não encontrada (API_KEY).");

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
      }
    });
    return response.text || "Sem resposta do Gemini.";
  } catch (error: any) {
    throw new Error(`Erro na API Gemini: ${error.message}`);
  }
};

// --- MAIN EXPORT ---

export const analyzeWithAI = async (
  type: 'BUDGET' | 'INVESTMENT',
  provider: AIProvider,
  data: { incomes?: Income[], expenses?: Expense[], investments?: Investment[] }
): Promise<string> => {
  
  let prompt = '';
  
  if (type === 'BUDGET') {
    if (!data.incomes || !data.expenses) throw new Error("Dados insuficientes para análise de orçamento.");
    prompt = createBudgetPrompt(data.incomes, data.expenses);
  } else {
    if (!data.investments || !data.incomes) throw new Error("Dados insuficientes para análise de investimentos.");
    const totalIncome = data.incomes.reduce((acc, curr) => acc + curr.amount, 0);
    prompt = createInvestmentPrompt(data.investments, totalIncome);
  }

  try {
    if (provider === 'groq') {
      return await callGroq(prompt);
    } else {
      return await callGemini(prompt);
    }
  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
};
