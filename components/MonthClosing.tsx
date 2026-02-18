import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Target, Sparkles, AlertCircle, 
  CheckCircle2, BrainCircuit, ChevronLeft, ChevronRight, EyeOff, ChevronDown, ChevronUp,
  Wallet, ArrowUpCircle, ArrowDownCircle, Info
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Expense, Transaction, Income, AIAnalysisType } from '../types';
import { analyzeWithAI, AIProvider } from '../services/aiService';
import { Button } from './ui/Button';
import { Skeleton } from './ui/Skeleton';

interface MonthClosingProps {
  expenses: Expense[]; // Planned
  transactions: Transaction[]; // Realized
  incomes: Income[]; // Planned Incomes
  isPrivacyEnabled: boolean;
  isDarkMode?: boolean;
}

export const MonthClosing: React.FC<MonthClosingProps> = ({ 
  expenses: plannedExpenses, 
  transactions: allTransactions,
  incomes: plannedIncomes,
  isPrivacyEnabled,
  isDarkMode = false
}) => {
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false);

  // Month Navigation
  const handlePrevMonth = () => {
    const [y, m] = monthFilter.split('-').map(Number);
    const date = new Date(y, m - 1 - 1, 1);
    setMonthFilter(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    setAiAnalysis(null);
    setIsAnalysisExpanded(false);
  };

  const handleNextMonth = () => {
    const [y, m] = monthFilter.split('-').map(Number);
    const date = new Date(y, m - 1 + 1, 1);
    setMonthFilter(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    setAiAnalysis(null);
    setIsAnalysisExpanded(false);
  };

  const formatMonthDisplay = (isoMonth: string) => {
    const [y, m] = isoMonth.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    const str = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Data Filtering & Calculation
  const closingData = useMemo(() => {
    const currentMonthKey = monthFilter;
    
    // Realized Incomes & Expenses for this month
    const monthTransactions = allTransactions.filter(t => {
      const dateToCheck = t.transactionType === 'INCOME' ? t.date : (t.referenceDate || t.date);
      return dateToCheck.slice(0, 7) === currentMonthKey;
    });

    const realizedExpenses = monthTransactions.filter(t => t.transactionType === 'EXPENSE' || t.transactionType === 'TRANSFER');
    const realizedIncomes = monthTransactions.filter(t => t.transactionType === 'INCOME');

    // Totals
    const totalPlannedIncome = plannedIncomes.reduce((s, i) => s + i.amount, 0);
    const totalRealizedIncome = realizedIncomes.reduce((s, t) => s + t.amount, 0);
    const incomeDiff = totalRealizedIncome - totalPlannedIncome;

    const categories = Array.from(new Set([
      ...plannedExpenses.map(e => e.category),
      ...realizedExpenses.map(t => t.category)
    ]));

    const chartData = categories.map(cat => {
      const planned = plannedExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
      const realized = realizedExpenses.filter(t => t.category === cat).reduce((s, t) => s + t.amount, 0);
      const diff = planned - realized;
      const status = realized > planned ? 'over' : realized > planned * 0.9 ? 'limit' : 'ok';
      
      return {
        name: cat,
        planejado: planned,
        realizado: realized,
        diff: diff,
        status: status,
        percent: planned > 0 ? (realized / planned) * 100 : 0
      };
    }).sort((a, b) => b.planejado - a.planejado);

    const totalPlannedExpense = chartData.reduce((s, d) => s + d.planejado, 0);
    const totalRealizedExpense = chartData.reduce((s, d) => s + d.realizado, 0);
    
    const plannedBalance = totalPlannedIncome - totalPlannedExpense;
    const realizedBalance = totalRealizedIncome - totalRealizedExpense;

    return { 
        chartData, 
        totalPlannedExpense, 
        totalRealizedExpense,
        totalPlannedIncome,
        totalRealizedIncome,
        incomeDiff,
        plannedBalance,
        realizedBalance
    };
  }, [plannedExpenses, allTransactions, plannedIncomes, monthFilter]);

  const handleAiAnalysis = async () => {
    setIsLoadingAi(true);
    setIsAnalysisExpanded(true);
    try {
      const result = await analyzeWithAI('MONTH_CLOSING', 'groq', { 
        expenses: plannedExpenses, 
        transactions: allTransactions.filter(t => (t.referenceDate || t.date).slice(0, 7) === monthFilter),
        incomes: plannedIncomes
      });
      setAiAnalysis(result);
    } catch (error: any) {
      setAiAnalysis(`Erro ao gerar análise: ${error.message}`);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const displayValue = (val: number) => isPrivacyEnabled ? '••••••' : `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Header & Month Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-emerald-600" />
            Fechamento Mensal
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Análise do planejado vs. realizado de {formatMonthDisplay(monthFilter)}.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors"><ChevronLeft className="w-4 h-4"/></button>
            <span className="font-bold text-slate-800 dark:text-white min-w-[140px] text-center">{formatMonthDisplay(monthFilter)}</span>
            <button onClick={handleNextMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors"><ChevronRight className="w-4 h-4"/></button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Income Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600">
                    <ArrowUpCircle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-700 dark:text-slate-200">Receitas (Renda)</h3>
            </div>
            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Planejado:</span>
                    <span className="font-medium">{displayValue(closingData.totalPlannedIncome)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Realizado:</span>
                    <span className="font-bold text-emerald-600">{displayValue(closingData.totalRealizedIncome)}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-400 uppercase">Diferença</span>
                    <span className={`text-lg font-bold ${closingData.incomeDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {closingData.incomeDiff > 0 ? '+' : ''}{displayValue(closingData.incomeDiff)}
                    </span>
                </div>
            </div>
        </div>

        {/* Expense Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-rose-100 dark:bg-rose-900/30 p-2 rounded-lg text-rose-600">
                    <ArrowDownCircle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-700 dark:text-slate-200">Despesas (Gastos)</h3>
            </div>
            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Planejado:</span>
                    <span className="font-medium">{displayValue(closingData.totalPlannedExpense)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Realizado:</span>
                    <span className="font-bold text-rose-600">{displayValue(closingData.totalRealizedExpense)}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-400 uppercase">Economia</span>
                    <span className={`text-lg font-bold ${(closingData.totalPlannedExpense - closingData.totalRealizedExpense) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {displayValue(closingData.totalPlannedExpense - closingData.totalRealizedExpense)}
                    </span>
                </div>
            </div>
        </div>

        {/* Final Balance Card */}
        <div className={`p-6 rounded-xl border shadow-sm flex flex-col justify-between ${closingData.realizedBalance >= 0 ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800' : 'bg-rose-50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-800'}`}>
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${closingData.realizedBalance >= 0 ? 'bg-emerald-200 text-emerald-700' : 'bg-rose-200 text-rose-700'}`}>
                    <Wallet className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-700 dark:text-slate-200">Resultado do Mês</h3>
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Saldo Líquido Real</p>
                <h4 className={`text-3xl font-black ${closingData.realizedBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {displayValue(closingData.realizedBalance)}
                </h4>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Esperado era {displayValue(closingData.plannedBalance)}
                </p>
            </div>
        </div>

      </div>

      {/* AI ANALYSIS EXPANDABLE SECTION */}
      <div className={`bg-white dark:bg-slate-900 rounded-xl border transition-all duration-300 overflow-hidden shadow-sm ${isAnalysisExpanded ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'}`}>
          <button 
            onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
            className="w-full flex items-center justify-between p-5 text-left group"
          >
              <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-600/20">
                      <Sparkles className={`w-5 h-5 ${isLoadingAi ? 'animate-pulse' : ''}`} />
                  </div>
                  <div>
                      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        Insights da IA Ativva 
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-mono">GROQ POWERED</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Análise do fluxo de caixa e sugestões comportamentais.</p>
                  </div>
              </div>
              <div className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                  {isAnalysisExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
          </button>

          {isAnalysisExpanded && (
            <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-2">
                {!aiAnalysis && !isLoadingAi ? (
                    <div className="flex flex-col items-center justify-center py-8 border-t border-slate-100 dark:border-slate-800">
                        <Button 
                            onClick={handleAiAnalysis} 
                            isLoading={isLoadingAi}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-full shadow-lg shadow-indigo-600/20"
                        >
                            Analisar Resultados do Mês
                        </Button>
                    </div>
                ) : (
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
                        {isLoadingAi ? (
                            <div className="flex flex-col space-y-4 py-8">
                                <div className="flex items-center gap-4">
                                    <BrainCircuit className="w-8 h-8 text-indigo-500 animate-pulse shrink-0" />
                                    <Skeleton className="h-4 w-3/4" />
                                </div>
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                                <Skeleton className="h-4 w-4/6" />
                            </div>
                        ) : (
                            <div className="bg-indigo-50/30 dark:bg-indigo-900/10 rounded-xl p-5 border border-indigo-100 dark:border-indigo-900/30">
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                    <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                                        <ReactMarkdown>{aiAnalysis || ''}</ReactMarkdown>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={handleAiAnalysis}
                                        className="text-xs text-indigo-600 dark:text-indigo-400"
                                    >
                                        Recalcular Análise
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
          )}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Comparison Chart */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          {isPrivacyEnabled && <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-slate-500"><EyeOff className="w-8 h-8 mb-2" /><p className="font-medium">Valores Ocultos</p></div>}
          <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Despesas por Categoria</h3>
              <div className="flex gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-200 dark:bg-slate-700 rounded-sm"></div> Orçado</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Realizado</div>
              </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={closingData.chartData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 12, fill: isDarkMode ? '#94a3b8' : '#475569' }} />
                <Tooltip 
                  formatter={(val: number) => displayValue(val)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: isDarkMode ? '#1e293b' : '#fff' }}
                />
                <Bar dataKey="planejado" name="Orçado" fill={isDarkMode ? '#334155' : '#e2e8f0'} radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="realizado" name="Gasto Real" radius={[0, 4, 4, 0]} barSize={12}>
                  {closingData.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.status === 'over' ? '#f43f5e' : entry.status === 'limit' ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Totals Summary Chart */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-8 text-center">Balanço Planejado vs Real</h3>
            <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                        { name: 'Receitas', orçado: closingData.totalPlannedIncome, real: closingData.totalRealizedIncome },
                        { name: 'Despesas', orçado: closingData.totalPlannedExpense, real: closingData.totalRealizedExpense }
                    ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip formatter={(val: number) => displayValue(val)} />
                        <Bar dataKey="orçado" fill={isDarkMode ? '#1e293b' : '#e2e8f0'} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="real" radius={[4, 4, 0, 0]}>
                            <Cell fill="#10b981" />
                            <Cell fill="#f43f5e" />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-col gap-2">
                 <div className="flex items-center gap-2 text-xs">
                     <div className="w-3 h-3 bg-slate-300 dark:bg-slate-700 rounded"></div>
                     <span className="text-slate-500">Planejado (Teto/Meta)</span>
                 </div>
                 <div className="flex items-center gap-2 text-xs">
                     <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                     <span className="text-slate-500">Receitas Realizadas</span>
                 </div>
                 <div className="flex items-center gap-2 text-xs">
                     <div className="w-3 h-3 bg-rose-500 rounded"></div>
                     <span className="text-slate-500">Despesas Realizadas</span>
                 </div>
            </div>
        </div>

      </div>

      {/* Detailed Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                      <th className="px-6 py-4">Categoria / Item</th>
                      <th className="px-6 py-4">Orçado</th>
                      <th className="px-6 py-4">Realizado</th>
                      <th className="px-6 py-4">Diferença</th>
                      <th className="px-6 py-4">Status</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* Row for Total Incomes */}
                  <tr className="bg-emerald-50/30 dark:bg-emerald-900/10 font-bold">
                        <td className="px-6 py-4 text-emerald-700 dark:text-emerald-400">TODAS AS RECEITAS</td>
                        <td className="px-6 py-4">{displayValue(closingData.totalPlannedIncome)}</td>
                        <td className="px-6 py-4 text-emerald-600">{displayValue(closingData.totalRealizedIncome)}</td>
                        <td className={`px-6 py-4 ${closingData.incomeDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                             {closingData.incomeDiff > 0 ? '+' : ''}{displayValue(closingData.incomeDiff)}
                        </td>
                        <td className="px-6 py-4 text-[10px] uppercase font-bold text-emerald-600">Entrada</td>
                  </tr>

                  {/* Expense rows */}
                  {closingData.chartData.map(d => (
                      <tr key={d.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{d.name}</td>
                          <td className="px-6 py-4 text-slate-500">{displayValue(d.planejado)}</td>
                          <td className="px-6 py-4 text-slate-800 dark:text-slate-200 font-semibold">{displayValue(d.realizado)}</td>
                          <td className={`px-6 py-4 font-bold ${d.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {d.diff > 0 ? '+' : ''}{displayValue(d.diff)}
                          </td>
                          <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                  d.status === 'over' ? 'bg-rose-100 text-rose-700' : d.status === 'limit' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                  {d.status === 'over' ? 'Estourado' : d.status === 'limit' ? 'No Limite' : 'OK'}
                              </span>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
    </div>
  );
};
