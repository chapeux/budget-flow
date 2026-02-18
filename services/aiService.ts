import { GoogleGenAI } from "@google/genai";
import { Income, Expense, Investment, Transaction, TransactionType, AIAnalysisType } from "../types";

export type AIProvider = 'groq' | 'gemini';

const getGroqApiKey = () => {
  try {
    // Vite context (preferred for Vercel/Vite deployments)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      const val = import.meta.env.VITE_GROQ_API_KEY;
      if (val) return val;
    }
  } catch (e) { /* ignore */ }

  try {
    // Process context (Node/Legacy)
    // @ts-ignore
    return process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY || '';
  } catch (e) {
    return '';
  }
};

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

const createStandardBudgetPrompt = (totalIncome: number, paysRent: boolean, mandatoryExpenses?: string): string => {
  return `
    Atue como um consultor financeiro. O usuário tem uma renda total de R$ ${totalIncome.toFixed(2)}.
    Perfil do usuário: ${paysRent ? 'Paga aluguel/moradia' : 'Não paga aluguel/moradia própria'}.
    ${mandatoryExpenses ? `RESTRIÇÕES OBRIGATÓRIAS DO USUÁRIO: "${mandatoryExpenses}"` : ''}

    Tarefa:
    Crie uma estrutura de gastos mensais sugerida baseada na regra 50-30-20 adaptada à realidade brasileira.
    
    IMPORTANTE: Se o usuário informou gastos obrigatórios (como faculdade, prestação de carro, etc.), você DEVE incluí-los com os valores exatos solicitados antes de distribuir o restante da renda.

    A resposta DEVE conter duas partes:
    1. Um texto explicativo em Markdown justificando os valores e como as restrições foram aplicadas.
    2. No final, uma seção "JSON_DATA" contendo APENAS um array JSON de objetos: { "name", "amount", "category", "type" ('FIXED' | 'VARIABLE'), "isInvestment" (boolean), "annualRate" (number, opcional, apenas se isInvestment for true) }.
    
    Categorias de despesas: Moradia, Alimentação, Transporte, Saúde, Lazer, Educação.
    Categorias de investimentos: Renda Fixa, Ações, Reserva, etc.
    
    Se o usuário paga aluguel e não especificou valor, inclua "Aluguel/Moradia" (25-30% da renda).
    Sempre inclua pelo menos um item com "isInvestment": true.
    
    Totalize exatamente R$ ${totalIncome.toFixed(2)} ou deixe uma margem de segurança de 10%.
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

const createMonthClosingPrompt = (plannedExpenses: Expense[], realized: Transaction[], plannedIncomes: Income[]): string => {
  const categories = Array.from(new Set([...plannedExpenses.map(e => e.category), ...realized.filter(t => t.transactionType !== 'INCOME').map(t => t.category)]));
  
  const totalPlannedIncome = plannedIncomes.reduce((s, i) => s + i.amount, 0);
  const totalRealizedIncome = realized.filter(t => t.transactionType === 'INCOME').reduce((s, t) => s + t.amount, 0);
  
  const expenseComparison = categories.map(cat => {
    const pAmount = plannedExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
    const rAmount = realized.filter(t => t.category === cat && (t.transactionType === 'EXPENSE' || t.transactionType === 'TRANSFER')).reduce((s, t) => s + t.amount, 0);
    const diff = pAmount - rAmount;
    return `- ${cat}: Planejado R$ ${pAmount.toFixed(2)} vs Realizado R$ ${rAmount.toFixed(2)} (Diferença: R$ ${diff.toFixed(2)})`;
  }).join('\n');

  return `
    Você é um coach financeiro. Analise o fechamento do mês comparando o Planejado (Orçamento) vs Realizado (Transações reais).

    Comparativo de RECEITAS (Renda):
    - Planejado: R$ ${totalPlannedIncome.toFixed(2)}
    - Realizado: R$ ${totalRealizedIncome.toFixed(2)}
    - Diferença: R$ ${(totalRealizedIncome - totalPlannedIncome).toFixed(2)}

    Comparativo de DESPESAS por Categoria:
    ${expenseComparison}

    Tarefa:
    1. Comente sobre a Renda: Se o usuário ganhou mais ou menos do que previu e o impacto disso.
    2. Destaque as 2 categorias de gastos onde o usuário foi mais disciplinado.
    3. Identifique estouros de orçamento em despesas e sugira ações.
    4. Dê uma nota de 0 a 10 para o desempenho financeiro global do mês.
    5. Proponha um ajuste estratégico para o próximo mês.

    Seja encorajador, mas honesto. Use Markdown e português do Brasil.
  `;
};

// --- API HANDLERS ---

const callGroq = async (prompt: string, jsonMode = false): Promise<string> => {
  const apiKey = getGroqApiKey();
  if (!apiKey) throw new Error("Chave VITE_GROQ_API_KEY não configurada no ambiente.");

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
    throw new Error(`Erro Groq: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "{}";
};

const callGemini = async (prompt: string, jsonMode = false): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
    throw new Error(`Erro Gemini: ${error.message}`);
  }
};

// --- MAIN EXPORTS ---

export const analyzeWithAI = async (
  type: AIAnalysisType,
  provider: AIProvider = 'groq',
  data: { incomes?: Income[], expenses?: Expense[], investments?: Investment[], transactions?: Transaction[], paysRent?: boolean }
): Promise<string> => {
  
  let prompt = '';
  if (type === 'BUDGET') {
    if (!data.incomes || !data.expenses) throw new Error("Dados insuficientes.");
    prompt = createBudgetPrompt(data.incomes, data.expenses);
  } else if (type === 'INVESTMENT') {
    if (!data.investments || !data.incomes) throw new Error("Dados insuficientes.");
    const totalIncome = data.incomes.reduce((acc, curr) => acc + curr.amount, 0);
    prompt = createInvestmentPrompt(data.investments, totalIncome);
  } else if (type === 'MONTH_CLOSING') {
    if (!data.expenses || !data.transactions || !data.incomes) throw new Error("Dados insuficientes.");
    prompt = createMonthClosingPrompt(data.expenses, data.transactions, data.incomes);
  }

  if (provider === 'groq') {
    try {
      return await callGroq(prompt);
    } catch (e) {
      console.warn("Groq falhou, tentando Gemini como fallback...", e);
      return await callGemini(prompt);
    }
  }

  return await callGemini(prompt);
};

export const suggestBasicBudget = async (
  totalIncome: number,
  paysRent: boolean,
  provider: AIProvider = 'groq',
  mandatoryExpenses?: string
): Promise<string> => {
  const prompt = createStandardBudgetPrompt(totalIncome, paysRent, mandatoryExpenses);
  
  if (provider === 'groq') {
    try {
      return await callGroq(prompt);
    } catch (e) {
      return await callGemini(prompt);
    }
  }
  return await callGemini(prompt);
};

export const suggestCategories = async (
  descriptions: string[], 
  categories: string[],
  provider: AIProvider = 'groq'
): Promise<Record<string, string>> => {
  if (descriptions.length === 0) return {};
  
  const uniqueDescriptions = Array.from(new Set(descriptions));
  const prompt = `Analise as transações e atribua uma categoria das permitidas: ${categories.join(', ')}. Retorne apenas JSON { "descrição": "categoria" }. Transações: ${JSON.stringify(uniqueDescriptions)}`;
  
  try {
    let result = '';
    if (provider === 'groq') {
      try {
        result = await callGroq(prompt, true);
      } catch (e) {
        result = await callGemini(prompt, true);
      }
    } else {
      result = await callGemini(prompt, true);
    }
    
    const jsonStart = result.indexOf('{');
    const jsonEnd = result.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      return JSON.parse(result.substring(jsonStart, jsonEnd + 1));
    }
    return JSON.parse(result); 
  } catch (error) {
    console.error("AI Error:", error);
    return {};
  }
};

export const parseBankStatement = async (
  text: string,
  provider: AIProvider = 'groq'
): Promise<any[]> => {
  const prompt = `Extraia transações do extrato bancário. Retorne array JSON de objetos: { "description", "amount", "date" (YYYY-MM-DD), "transactionType" ('INCOME'|'EXPENSE') }. Texto: ${text}`;

  try {
    let result = '';
    if (provider === 'groq') {
      try {
        result = await callGroq(prompt, true);
      } catch (e) {
        result = await callGemini(prompt, true);
      }
    } else {
      result = await callGemini(prompt, true);
    }

    const jsonStart = result.indexOf('[');
    const jsonEnd = result.lastIndexOf(']');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      return JSON.parse(result.substring(jsonStart, jsonEnd + 1));
    }
    return JSON.parse(result);
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
};

export const suggestShoppingCategories = async (
  itemNames: string[],
  provider: AIProvider = 'groq'
): Promise<Record<string, { category: string, price: number }>> => {
  const prompt = `Para cada item, sugira categoria com emoji e preço médio em BRL. Retorne JSON: { "item": { "category", "price" } }. Itens: ${JSON.stringify(itemNames)}`;

  try {
    let result = '';
    if (provider === 'groq') {
      try {
        result = await callGroq(prompt, true);
      } catch (e) {
        result = await callGemini(prompt, true);
      }
    } else {
      result = await callGemini(prompt, true);
    }

    const jsonStart = result.indexOf('{');
    const jsonEnd = result.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      return JSON.parse(result.substring(jsonStart, jsonEnd + 1));
    }
    return JSON.parse(result);
  } catch (error) {
    console.error("Error:", error);
    return {};
  }
};
