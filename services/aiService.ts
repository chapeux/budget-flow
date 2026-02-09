import { GoogleGenAI } from "@google/genai";
import { Income, Expense, Investment, Transaction, TransactionType } from "../types";

export type AIProvider = 'groq' | 'gemini';

// --- CONFIGURATION ---
const getGroqApiKey = () => import.meta.env.VITE_GROQ_API_KEY;
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
    Responda em português do Brasil, use formatação Markdown.
  `;
};

const createCategorizationPrompt = (descriptions: string[], categories: string[]): string => {
  return `
    Você é um assistente contábil inteligente.
    Tenho uma lista de descrições de transações bancárias e uma lista de categorias permitidas.
    
    Sua tarefa é analisar cada descrição e atribuir a categoria mais apropriada da lista fornecida.
    Se nenhuma categoria parecer adequada, use "Outros".
    
    Categorias Permitidas: ${categories.join(', ')}
    
    Transações para classificar:
    ${JSON.stringify(descriptions)}
    
    Retorne APENAS um objeto JSON onde a chave é a descrição original e o valor é a categoria escolhida.
    Exemplo de saída: { "Uber *Trip": "Transporte", "Mercado Livre": "Compras" }
  `;
};

const createShoppingPrompt = (items: string[]): string => {
  return `
    Você é um organizador de compras inteligente.
    Tenho uma lista de itens de supermercado/compras.
    
    Sua tarefa é:
    1. Categorizar cada item adicionando um emoji correspondente (ex: "🍎 Hortifruti").
    2. Estimar o preço unitário médio (em Reais - BRL) para este item no Brasil.
    
    Itens: ${JSON.stringify(items)}
    
    Retorne APENAS um objeto JSON onde a chave é o nome do item e o valor é um objeto contendo "category" e "price".
    Exemplo de saída: 
    { 
      "maçã": { "category": "🍎 Hortifruti", "price": 1.50 },
      "detergente": { "category": "🧼 Limpeza", "price": 3.20 },
      "picanha": { "category": "🥩 Carnes", "price": 89.90 }
    }
  `;
};

const createStatementParsePrompt = (rawText: string): string => {
  return `
    Você é um parser de extratos bancários especializado em converter texto não estruturado (de PDFs) em JSON.
    
    Abaixo está o texto cru extraído de um extrato bancário ou fatura de cartão. 
    Identifique as transações individuais contendo Data, Descrição e Valor.
    
    Regras:
    1. Ignore saldos parciais, cabeçalhos de página ou textos irrelevantes.
    2. Identifique se a transação é uma Receita (INCOME), Despesa (EXPENSE) ou Transferência (TRANSFER).
    3. Converta todas as datas para o formato ISO YYYY-MM-DD.
    4. Converta valores para number (float). Se for despesa, retorne o valor absoluto (positivo), pois o tipo define o sinal.
    
    Texto Cru:
    """
    ${rawText.slice(0, 30000)} 
    """
    
    Responda APENAS com um array JSON válido no seguinte formato:
    [
      { "date": "2024-02-28", "description": "Supermercado X", "amount": 150.50, "transactionType": "EXPENSE" },
      { "date": "2024-02-05", "description": "Salário Mensal", "amount": 5000.00, "transactionType": "INCOME" }
    ]
  `;
};

// --- HELPER: PROVIDER RESOLUTION ---

const resolveProvider = (requestedProvider: AIProvider): AIProvider => {
  // If Groq requested but no key, fallback to Gemini
  if (requestedProvider === 'groq' && !getGroqApiKey()) {
    console.warn("BudgetFlow AI: Chave da API Groq não encontrada. Alternando automaticamente para Gemini.");
    return 'gemini';
  }
  return requestedProvider;
};

// --- API HANDLERS ---

const callGroq = async (prompt: string, jsonMode = false): Promise<string> => {
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
      model: "llama-3.3-70b-versatile",
      response_format: jsonMode ? { type: "json_object" } : undefined
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Erro na API Groq: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "{}";
};

const callGemini = async (prompt: string, jsonMode = false): Promise<string> => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("Chave da API Gemini não encontrada (API_KEY).");

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: jsonMode ? "application/json" : "text/plain"
      }
    });
    return response.text || "{}";
  } catch (error: any) {
    throw new Error(`Erro na API Gemini: ${error.message}`);
  }
};

// --- MAIN EXPORTS ---

export const analyzeWithAI = async (
  type: 'BUDGET' | 'INVESTMENT',
  provider: AIProvider,
  data: { incomes?: Income[], expenses?: Expense[], investments?: Investment[] }
): Promise<string> => {
  
  const activeProvider = resolveProvider(provider);
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
    if (activeProvider === 'groq') {
      return await callGroq(prompt);
    } else {
      return await callGemini(prompt);
    }
  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
};

export const suggestCategories = async (
  descriptions: string[], 
  categories: string[],
  provider: AIProvider = 'gemini'
): Promise<Record<string, string>> => {
  if (descriptions.length === 0) return {};
  
  const activeProvider = resolveProvider(provider);
  const uniqueDescriptions = Array.from(new Set(descriptions));
  const prompt = createCategorizationPrompt(uniqueDescriptions, categories);
  
  try {
    let result = '';
    if (activeProvider === 'groq') {
      result = await callGroq(prompt, true);
    } else {
      result = await callGemini(prompt, true);
    }
    
    const jsonStart = result.indexOf('{');
    const jsonEnd = result.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonStr = result.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonStr);
    }
    return JSON.parse(result); 
  } catch (error) {
    console.error("AI Categorization Error:", error);
    return {};
  }
};

interface ShoppingSuggestion {
  category: string;
  price: number;
}

export const suggestShoppingCategories = async (
  items: string[],
  provider: AIProvider = 'gemini'
): Promise<Record<string, ShoppingSuggestion>> => {
  if (items.length === 0) return {};

  const activeProvider = resolveProvider(provider);
  const uniqueItems = Array.from(new Set(items));
  const prompt = createShoppingPrompt(uniqueItems);

  try {
    let result = '';
    if (activeProvider === 'gemini') {
      result = await callGemini(prompt, true);
    } else {
      result = await callGroq(prompt, true);
    }

    const jsonStart = result.indexOf('{');
    const jsonEnd = result.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonStr = result.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonStr);
    }
    return JSON.parse(result);
  } catch (error) {
    console.error("AI Shopping Categorization Error:", error);
    return {};
  }
};

export const parseBankStatement = async (
  rawText: string,
  provider: AIProvider = 'gemini'
): Promise<Partial<Transaction>[]> => {
  if (!rawText.trim()) return [];

  const activeProvider = resolveProvider(provider);
  const prompt = createStatementParsePrompt(rawText);

  try {
    let result = '';
    
    if (activeProvider === 'gemini') {
        result = await callGemini(prompt, true);
    } else {
        result = await callGroq(prompt, true);
    }

    // Attempt to extract JSON array
    const jsonStart = result.indexOf('[');
    const jsonEnd = result.lastIndexOf(']');
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
       const jsonStr = result.substring(jsonStart, jsonEnd + 1);
       return JSON.parse(jsonStr);
    }
    
    // Fallback if full text returned
    return JSON.parse(result);

  } catch (error) {
    console.error("AI PDF Parse Error:", error);
    throw new Error("Falha ao interpretar o PDF com IA. O texto extraído pode estar muito confuso ou a chave de API é inválida.");
  }
};
