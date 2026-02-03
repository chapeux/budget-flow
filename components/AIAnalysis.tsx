import React, { useState } from 'react';
import { Sparkles, ArrowRight, X, EyeOff, BrainCircuit, LineChart, Wallet } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Income, Expense, Investment } from '../types';
import { Button } from './ui/Button';
import { analyzeWithAI, AIProvider } from '../services/aiService';

interface AIAnalysisProps {
  incomes: Income[];
  expenses: Expense[];
  investments: Investment[];
  balance: number;
  isPrivacyEnabled: boolean;
}

export const AIAnalysis: React.FC<AIAnalysisProps> = ({ incomes, expenses, investments, balance, isPrivacyEnabled }) => {
  const [provider, setProvider] = useState<AIProvider>('groq');
  const [activeTab, setActiveTab] = useState<'BUDGET' | 'INVESTMENT'>('BUDGET');
  
  const [budgetAnalysis, setBudgetAnalysis] = useState<string | null>(null);
  const [investmentAnalysis, setInvestmentAnalysis] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await analyzeWithAI(
        activeTab, 
        provider, 
        { incomes, expenses, investments }
      );
      
      if (activeTab === 'BUDGET') {
        setBudgetAnalysis(result);
      } else {
        setInvestmentAnalysis(result);
      }
    } catch (error: any) {
      const errorMsg = `Erro: ${error.message || "Falha ao conectar com o assistente."}`;
      if (activeTab === 'BUDGET') setBudgetAnalysis(errorMsg);
      else setInvestmentAnalysis(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const currentAnalysis = activeTab === 'BUDGET' ? budgetAnalysis : investmentAnalysis;
  const hasDataForBudget = incomes.length > 0 || expenses.length > 0;
  const hasDataForInvestments = investments.length > 0;
  const canAnalyze = activeTab === 'BUDGET' ? hasDataForBudget : hasDataForInvestments;

  if (!isOpen) {
    return (
        <button 
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 dark:hover:bg-indigo-900/50"
        >
            <Sparkles className="w-4 h-4" />
            Mostrar Assistente IA
        </button>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative transition-all ring-1 ring-slate-100 dark:ring-slate-800">
      {/* Header Bar */}
      <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-lg">
                <BrainCircuit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Assistente Financeiro</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Inteligência artificial para suas finanças</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Provider Selector */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">IA Modelo:</span>
                <select 
                    value={provider} 
                    onChange={(e) => setProvider(e.target.value as AIProvider)}
                    className="text-sm font-semibold text-slate-700 dark:text-slate-200 bg-transparent border-none focus:ring-0 cursor-pointer outline-none"
                >
                    <option value="groq">Groq (Llama 3)</option>
                    <option value="gemini">Gemini 1.5</option>
                </select>
            </div>
            
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                <X className="w-5 h-5" />
            </button>
          </div>
      </div>

      <div className="p-0">
        {/* Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800">
            <button
                onClick={() => setActiveTab('BUDGET')}
                className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    activeTab === 'BUDGET' 
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
            >
                <Wallet className="w-4 h-4" />
                Despesas & Orçamento
            </button>
            <button
                onClick={() => setActiveTab('INVESTMENT')}
                className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    activeTab === 'INVESTMENT' 
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
            >
                <LineChart className="w-4 h-4" />
                Investimentos
            </button>
        </div>

        {/* Content Area */}
        <div className="p-6">
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
                {activeTab === 'BUDGET' 
                    ? 'Analise sua saúde financeira, identifique gastos excessivos e receba dicas de economia baseadas no seu perfil de consumo.' 
                    : 'Receba uma avaliação detalhada sobre a qualidade dos seus ativos, se os aportes estão adequados e os riscos envolvidos em cada investimento.'}
            </p>

            {!currentAnalysis && (
              <div className="flex flex-col items-center justify-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                <Button 
                    onClick={handleAnalyze} 
                    isLoading={loading}
                    disabled={!canAnalyze}
                    className="bg-indigo-600 text-white hover:bg-indigo-700 border-transparent font-semibold shadow-md px-8"
                >
                    {loading ? 'Processando...' : activeTab === 'BUDGET' ? 'Analisar Orçamento' : 'Analisar Investimentos'}
                    {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
                {!canAnalyze && (
                    <p className="text-xs text-slate-400 mt-2">
                        {activeTab === 'BUDGET' ? 'Adicione rendas e despesas para analisar.' : 'Adicione investimentos para analisar.'}
                    </p>
                )}
              </div>
            )}

            {currentAnalysis && (
            <div className="mt-2 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl p-6 border border-indigo-100 dark:border-indigo-900/50 animate-in fade-in slide-in-from-bottom-2 shadow-sm relative overflow-hidden">
                {isPrivacyEnabled && (
                    <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-slate-500">
                        <EyeOff className="w-8 h-8 mb-2" />
                        <p className="font-medium">Análise Oculta</p>
                    </div>
                )}
                
                <div className="prose prose-indigo prose-sm max-w-none text-slate-700 dark:text-slate-300 dark:prose-headings:text-indigo-300 dark:prose-strong:text-indigo-300">
                    <ReactMarkdown>{currentAnalysis}</ReactMarkdown>
                </div>

                <div className="mt-6 pt-4 border-t border-indigo-100 dark:border-indigo-800 flex justify-end gap-3">
                    <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => activeTab === 'BUDGET' ? setBudgetAnalysis(null) : setInvestmentAnalysis(null)}
                    >
                        Limpar
                    </Button>
                    <Button 
                        size="sm" 
                        variant="secondary"
                        className="text-indigo-700 bg-white border-indigo-200 hover:bg-indigo-50 dark:bg-indigo-900 dark:border-indigo-700 dark:text-indigo-200 dark:hover:bg-indigo-800"
                        onClick={handleAnalyze}
                        isLoading={loading}
                    >
                        Gerar Nova Análise
                    </Button>
                </div>
            </div>
            )}
        </div>
      </div>
    </div>
  );
};