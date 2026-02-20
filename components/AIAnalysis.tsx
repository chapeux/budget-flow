
import React, { useState } from 'react';
import { Sparkles, ArrowRight, X, EyeOff, BrainCircuit, LineChart, Wallet, Home, Check, Plus, AlertCircle, MessageSquareQuote, Lock, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Income, Expense, Investment } from '../types';
import { Button } from './ui/Button';
import { analyzeWithAI, suggestBasicBudget, AIProvider } from '../services/aiService';
import { Skeleton } from './ui/Skeleton';

interface AIAnalysisProps {
  incomes: Income[];
  expenses: Expense[];
  investments: Investment[];
  balance: number;
  isPrivacyEnabled: boolean;
  onAddExpense?: (expense: Expense) => void;
  onAddInvestment?: (investment: Investment) => void;
  userPlan?: 'FREE' | 'PRO';
}

export const AIAnalysis: React.FC<AIAnalysisProps> = ({ 
  incomes, 
  expenses, 
  investments, 
  balance, 
  isPrivacyEnabled, 
  onAddExpense,
  onAddInvestment,
  userPlan = 'FREE'
}) => {
  const [provider, setProvider] = useState<AIProvider>('groq');
  const [activeTab, setActiveTab] = useState<'BUDGET' | 'INVESTMENT' | 'GENERATE'>('BUDGET');
  
  const [budgetAnalysis, setBudgetAnalysis] = useState<string | null>(null);
  const [investmentAnalysis, setInvestmentAnalysis] = useState<string | null>(null);
  const [suggestedBudget, setSuggestedBudget] = useState<string | null>(null);
  const [parsedSuggestions, setParsedSuggestions] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [paysRent, setPaysRent] = useState(true);
  const [mandatoryExpenses, setMandatoryExpenses] = useState('');

  const isPro = userPlan === 'PRO';

  const handleAnalyze = async () => {
    if (!isPro) return;
    setLoading(true);
    try {
      const result = await analyzeWithAI(
        activeTab === 'INVESTMENT' ? 'INVESTMENT' : 'BUDGET', 
        provider, 
        { incomes, expenses, investments }
      );
      
      if (activeTab === 'INVESTMENT') setInvestmentAnalysis(result);
      else setBudgetAnalysis(result);
    } catch (error: any) {
      const errorMsg = `Erro: ${error.message || "Falha ao conectar com o assistente."}`;
      if (activeTab === 'INVESTMENT') setInvestmentAnalysis(errorMsg);
      else setBudgetAnalysis(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBudget = async () => {
    if (!isPro || totalIncome <= 0) return;
    setLoading(true);
    setSuggestedBudget(null);
    setParsedSuggestions([]);
    
    try {
      const result = await suggestBasicBudget(totalIncome, paysRent, provider, mandatoryExpenses);
      setSuggestedBudget(result);

      const jsonMatch = result.match(/JSON_DATA\s*([\s\S]*)/i);
      if (jsonMatch && jsonMatch[1]) {
          try {
              const content = jsonMatch[1].trim();
              const startIdx = content.indexOf('[');
              const endIdx = content.lastIndexOf(']') + 1;
              if (startIdx !== -1 && endIdx !== -1) {
                  const cleanJson = content.substring(startIdx, endIdx);
                  const data = JSON.parse(cleanJson);
                  setParsedSuggestions(data);
              }
          } catch (e) {
              console.error("Erro ao processar sugestões JSON", e);
          }
      }
    } catch (error: any) {
      setSuggestedBudget(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);

  const applySuggestions = () => {
    if (parsedSuggestions.length === 0) return;
    
    let expensesAdded = 0;
    let investmentsAdded = 0;

    parsedSuggestions.forEach(item => {
        if (item.isInvestment && onAddInvestment) {
            onAddInvestment({
                id: crypto.randomUUID(),
                name: `(Sugerido) ${item.name}`,
                amount: item.amount,
                category: item.category || 'Renda Fixa',
                annualRate: item.annualRate || 10.0
            });
            investmentsAdded++;
        } else if (onAddExpense) {
            onAddExpense({
                id: crypto.randomUUID(),
                name: `(Sugerido) ${item.name}`,
                amount: item.amount,
                category: item.category,
                type: item.type || 'FIXED',
                date: new Date().toISOString()
            });
            expensesAdded++;
        }
    });

    setIsOpen(false);
    let msg = '';
    if (expensesAdded > 0) msg += `${expensesAdded} despesas `;
    if (investmentsAdded > 0) msg += (msg ? 'e ' : '') + `${investmentsAdded} investimentos `;
    alert(`${msg} foram adicionados ao seu plano financeiro!`);
  };

  const ProLock = () => (
    <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-center p-6 rounded-xl">
        <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 mb-6 scale-110">
            <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">Recurso Exclusivo PRO</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs mb-8 font-medium">
            Assine o plano Pro para desbloquear análises inteligentes, sugestões de investimento e estruturação de orçamento via IA.
        </p>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-4 rounded-xl shadow-lg">
            Fazer Upgrade <Zap className="ml-2 w-4 h-4 fill-current" />
        </Button>
        <p className="text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-widest">Apenas R$ 19,90/mês</p>
    </div>
  );

  if (!isOpen) {
    return (
        <button 
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 dark:hover:bg-indigo-900/50"
        >
            <Sparkles className="w-4 h-4" />
            Mostrar Assistente IA {!isPro && <Lock className="w-3 h-3 ml-1 text-slate-400" />}
        </button>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative transition-all ring-1 ring-slate-100 dark:ring-slate-800">
      {!isPro && <ProLock />}
      
      {/* Header Bar */}
      <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-lg shrink-0">
                <BrainCircuit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Assistente Financeiro</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Inteligência artificial para suas finanças</p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
          >
              <X className="w-5 h-5" />
          </button>
      </div>

      <div className="p-0">
        {/* Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
            <button
                onClick={() => setActiveTab('BUDGET')}
                className={`flex-1 min-w-[120px] py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    activeTab === 'BUDGET' 
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
            >
                <Wallet className="w-4 h-4" />
                Analisar Gastos
            </button>
            <button
                onClick={() => setActiveTab('GENERATE')}
                className={`flex-1 min-w-[120px] py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    activeTab === 'GENERATE' 
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
            >
                <Plus className="w-4 h-4" />
                Criar Orçamento
            </button>
            <button
                onClick={() => setActiveTab('INVESTMENT')}
                className={`flex-1 min-w-[120px] py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    activeTab === 'INVESTMENT' 
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
            >
                <LineChart className="w-4 h-4" />
                Investimentos
            </button>
        </div>

        <div className="p-6">
            {activeTab === 'GENERATE' ? (
                <div className="space-y-6">
                    <div className="bg-indigo-50/30 dark:bg-indigo-900/10 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800">
                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between mb-6">
                            <div className="space-y-1">
                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Home className="w-4 h-4 text-indigo-500" />
                                    Orçamento Inteligente
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Sugeriremos despesas básicas ideais para sua renda de <strong>R$ {totalIncome.toLocaleString('pt-BR')}</strong>.
                                </p>
                            </div>
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input type="checkbox" checked={paysRent} onChange={(e) => setPaysRent(e.target.checked)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                    </div>
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Paga Aluguel?</span>
                                </label>
                                <Button onClick={handleGenerateBudget} isLoading={loading} disabled={totalIncome <= 0} className="bg-indigo-600 text-white hover:bg-indigo-700 shadow-md font-bold text-xs">Sugerir Estrutura</Button>
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-indigo-100 dark:border-indigo-800/50">
                            <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2"><MessageSquareQuote className="w-3 h-3" />Despesas Obrigatórias (Restrições)</label>
                            <textarea value={mandatoryExpenses} onChange={(e) => setMandatoryExpenses(e.target.value)} placeholder='Ex: "Pago R$910 de faculdade e no mínimo R$800 reais de gasolina"' className="w-full min-h-[60px] p-3 rounded-lg border border-indigo-100 dark:border-indigo-800 bg-white/50 dark:bg-slate-900/50 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 italic" />
                        </div>
                    </div>

                    {loading && (
                         <div className="space-y-4 py-4">
                            <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-20 w-full" />
                         </div>
                    )}

                    {suggestedBudget && !loading && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-4">
                            <div className="prose prose-indigo prose-sm max-w-none text-slate-700 dark:text-slate-300 dark:prose-headings:text-indigo-300">
                                <ReactMarkdown>{suggestedBudget.split('JSON_DATA')[0]}</ReactMarkdown>
                            </div>

                            {parsedSuggestions.length > 0 && (
                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2"><Check className="w-4 h-4" /> Itens Propostos</h4>
                                        <span className="text-xs text-slate-400">{parsedSuggestions.length} itens sugeridos</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                                        {parsedSuggestions.map((item, i) => (
                                            <div key={i} className={`flex justify-between items-center p-2 rounded-lg border ${item.isInvestment ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold truncate dark:text-white">{item.name}{item.isInvestment && <span className="ml-1.5 text-[8px] bg-blue-600 text-white px-1 rounded">INV</span>}</p>
                                                    <p className="text-[10px] text-slate-400">{item.category} {item.isInvestment && item.annualRate && ` • ${item.annualRate}% a.a`}</p>
                                                </div>
                                                <p className={`text-xs font-black ml-2 ${item.isInvestment ? 'text-blue-600 dark:text-blue-400' : 'text-indigo-600 dark:text-indigo-400'}`}>R$ {item.amount.toLocaleString('pt-BR')}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <Button onClick={applySuggestions} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3"><Plus className="w-4 h-4 mr-2" />Aplicar ao meu Plano Financeiro</Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <>
                <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
                    {activeTab === 'BUDGET' 
                        ? 'Analise sua saúde financeira atual, identifique gastos excessivos e receba dicas de economia baseadas no seu perfil de consumo.' 
                        : 'Receba uma avaliação detalhada sobre a qualidade dos seus ativos, se os aportes estão adequados e os riscos envolvidos em cada investimento.'}
                </p>

                {loading ? (
                    <div className="space-y-4 py-4">
                        <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-4/6" />
                    </div>
                ) : (activeTab === 'BUDGET' ? !budgetAnalysis : !investmentAnalysis) ? (
                <div className="flex flex-col items-center justify-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                    <Button onClick={handleAnalyze} isLoading={loading} className="bg-indigo-600 text-white hover:bg-indigo-700 border-transparent font-semibold shadow-md px-8">
                        {activeTab === 'BUDGET' ? 'Analisar Gastos Atuais' : 'Analisar Investimentos'}
                        {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                </div>
                ) : (
                    <div className="mt-2 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl p-6 border border-indigo-100 dark:border-indigo-900/50 animate-in fade-in slide-in-from-top-2 shadow-sm relative overflow-hidden">
                        {isPrivacyEnabled && <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-slate-500"><EyeOff className="w-8 h-8 mb-2" /><p className="font-medium">Análise Oculta</p></div>}
                        <div className="prose prose-indigo prose-sm max-w-none text-slate-700 dark:text-slate-300 dark:prose-headings:text-indigo-300 dark:prose-strong:text-indigo-300"><ReactMarkdown>{activeTab === 'BUDGET' ? budgetAnalysis! : investmentAnalysis!}</ReactMarkdown></div>
                        <div className="mt-6 pt-4 border-t border-indigo-100 dark:border-indigo-800 flex justify-end gap-3">
                            <Button size="sm" variant="ghost" onClick={() => activeTab === 'BUDGET' ? setBudgetAnalysis(null) : setInvestmentAnalysis(null)}>Limpar</Button>
                            <Button size="sm" variant="secondary" className="text-indigo-700 bg-white border-indigo-200 hover:bg-indigo-50 dark:bg-indigo-900 dark:border-indigo-700 dark:text-indigo-200 dark:hover:bg-indigo-800" onClick={handleAnalyze} isLoading={loading}>Gerar Nova Análise</Button>
                        </div>
                    </div>
                )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};
