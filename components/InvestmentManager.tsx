import React, { useState } from 'react';
import { PlusCircle, Trash2, LineChart, Percent, Calendar, ArrowUpCircle, TrendingUp, ShieldCheck, Coins, Building2, Globe } from 'lucide-react';
import { Investment, ScheduledEvent } from '../types';
import { Button } from './ui/Button';

interface InvestmentManagerProps {
  investments: Investment[];
  scheduledEvents: ScheduledEvent[];
  onAdd: (investment: Investment) => void;
  onAddOneTime: (event: ScheduledEvent) => void;
  onRemove: (id: string) => void;
  onRemoveOneTime: (id: string) => void;
  isPrivacyEnabled: boolean;
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const INVESTMENT_CATEGORIES = [
  { id: 'Renda Fixa', label: 'Renda Fixa (Geral)', icon: ShieldCheck },
  { id: 'Tesouro Direto', label: 'Tesouro Direto', icon: ShieldCheck },
  { id: 'CDB/LCI/LCA', label: 'CDB / LCI / LCA', icon: ShieldCheck },
  { id: 'Reserva', label: 'Reserva de Emergência', icon: ShieldCheck },
  { id: 'Ações', label: 'Ações (Brasil)', icon: TrendingUp },
  { id: 'FIIs', label: 'FIIs', icon: Building2 },
  { id: 'Stocks', label: 'Stocks (Exterior)', icon: Globe },
  { id: 'ETFs', label: 'ETFs', icon: TrendingUp },
  { id: 'Cripto', label: 'Criptomoedas', icon: Coins },
  { id: 'Outros', label: 'Outros', icon: LineChart },
];

const FIXED_INCOME_IDS = ['Renda Fixa', 'Tesouro Direto', 'CDB/LCI/LCA', 'Reserva'];

export const InvestmentManager: React.FC<InvestmentManagerProps> = ({ 
  investments, 
  scheduledEvents,
  onAdd, 
  onAddOneTime,
  onRemove,
  onRemoveOneTime,
  isPrivacyEnabled
}) => {
  const [activeTab, setActiveTab] = useState<'RECURRING' | 'ONE_TIME'>('RECURRING');

  // Recurring State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [annualRate, setAnnualRate] = useState('');
  const [category, setCategory] = useState('Renda Fixa');

  // One Time State
  const [otName, setOtName] = useState('');
  const [otAmount, setOtAmount] = useState('');
  const [otMonth, setOtMonth] = useState(new Date().getMonth());
  const [otYear, setOtYear] = useState(new Date().getFullYear());

  // Filter only One Time Investments from the shared scheduledEvents pool
  const oneTimeInvestments = scheduledEvents.filter(e => e.name.includes('(Aporte Único)'));

  const isFixedIncome = FIXED_INCOME_IDS.includes(category);

  const handleRecurringSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Rate is mandatory only for fixed income
    if (!name || !amount || (isFixedIncome && !annualRate)) return;

    onAdd({
      id: crypto.randomUUID(),
      name,
      amount: parseFloat(amount),
      annualRate: annualRate ? parseFloat(annualRate) : 0,
      category,
    });

    setName('');
    setAmount('');
    setAnnualRate('');
    setCategory('Renda Fixa');
  };

  const handleOneTimeSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!otName || !otAmount) return;

      onAddOneTime({
          id: crypto.randomUUID(),
          name: `${otName} (Aporte Único)`,
          type: 'INJECTION',
          amount: parseFloat(otAmount),
          month: otMonth,
          year: otYear
      });

      setOtName('');
      setOtAmount('');
  };

  const getCategoryIcon = (catId: string) => {
    const cat = INVESTMENT_CATEGORIES.find(c => c.id === catId);
    return cat ? cat.icon : LineChart;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <LineChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Investimentos & Aportes
        </h2>
      </div>

      <div className="p-6">
        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-slate-100 dark:border-slate-800">
            <button 
                onClick={() => setActiveTab('RECURRING')}
                className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'RECURRING' ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
                Mensal (Recorrente)
            </button>
            <button 
                onClick={() => setActiveTab('ONE_TIME')}
                className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'ONE_TIME' ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
                Aporte Único
            </button>
        </div>

        {activeTab === 'RECURRING' ? (
            <>
                <form onSubmit={handleRecurringSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                    <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Ativo</label>
                        <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Bitcoin, ITSA4"
                        className="block w-full rounded-lg border-slate-300 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white dark:placeholder-slate-500"
                        />
                    </div>
                    
                    <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="block w-full rounded-lg border-slate-300 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white"
                        >
                            {INVESTMENT_CATEGORIES.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Aporte (R$)</label>
                        <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        className="block w-full rounded-lg border-slate-300 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white dark:placeholder-slate-500"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" title="Estimativa de retorno anual">
                            Rentab. (% a.a.) 
                        </label>
                        <div className="relative">
                            <input
                            type="number"
                            value={annualRate}
                            onChange={(e) => setAnnualRate(e.target.value)}
                            placeholder={isFixedIncome ? "10" : "Opcional"}
                            step="0.1"
                            className="block w-full rounded-lg border-slate-300 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 p-2.5 pr-6 text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder-slate-500"
                            />
                            <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-slate-500">
                            <Percent className="h-3 w-3" />
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 flex items-end">
                        <Button 
                            type="submit" 
                            disabled={!name || !amount || (isFixedIncome && !annualRate)} 
                            className="w-full bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                        >
                        <PlusCircle className="w-4 h-4 md:mr-1 lg:mr-2" />
                        <span className="hidden md:inline">Adicionar</span>
                        </Button>
                    </div>
                </form>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {investments.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                    Nenhum investimento configurado.
                    </div>
                ) : (
                    investments.map((inv) => {
                      const Icon = getCategoryIcon(inv.category);
                      return (
                        <div key={inv.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group border-l-4 border-l-blue-500">
                            <div className="flex items-center gap-4">
                            <div className="p-2 rounded-full bg-blue-600 text-white">
                                <Icon className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-900 dark:text-white">{inv.name}</h4>
                                <div className="flex gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                    {inv.category}
                                </span>
                                {inv.annualRate > 0 ? (
                                    <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-900">
                                        <Percent className="w-3 h-3" /> {inv.annualRate}% a.a.
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600">
                                        Renda Variável
                                    </span>
                                )}
                                </div>
                            </div>
                            </div>
                            <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="font-bold text-blue-700 dark:text-blue-400">
                                {isPrivacyEnabled 
                                    ? '••••••'
                                    : `R$ ${inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                }
                                </div>
                                <div className="text-xs text-slate-400">mensal</div>
                            </div>
                            <button
                                onClick={() => onRemove(inv.id)}
                                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-transparent hover:border-rose-100 dark:hover:border-rose-900"
                                aria-label="Remover investimento"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            </div>
                        </div>
                      );
                    })
                )}
                </div>
            </>
        ) : (
            <>
                <form onSubmit={handleOneTimeSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6 bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900">
                <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição do Aporte</label>
                    <input
                    type="text"
                    value={otName}
                    onChange={(e) => setOtName(e.target.value)}
                    placeholder="Ex: Bônus Empresa"
                    className="block w-full rounded-lg border-slate-300 dark:border-slate-700 border bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white"
                    />
                </div>
                <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor (R$)</label>
                    <input
                    type="number"
                    value={otAmount}
                    onChange={(e) => setOtAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    className="block w-full rounded-lg border-slate-300 dark:border-slate-700 border bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white"
                    />
                </div>
                <div className="md:col-span-3 grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mês</label>
                        <select
                            value={otMonth}
                            onChange={(e) => setOtMonth(parseInt(e.target.value))}
                            className="block w-full rounded-lg border-slate-300 dark:border-slate-700 border bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white"
                        >
                            {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ano</label>
                        <input
                            type="number"
                            value={otYear}
                            onChange={(e) => setOtYear(parseInt(e.target.value))}
                            className="block w-full rounded-lg border-slate-300 dark:border-slate-700 border bg-white dark:bg-slate-800 p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500 text-slate-900 dark:text-white"
                        />
                    </div>
                </div>
                <div className="md:col-span-2 flex items-end">
                    <Button type="submit" disabled={!otName || !otAmount} className="w-full bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500">
                    <Calendar className="w-4 h-4 md:mr-0 lg:mr-2" />
                    <span className="hidden lg:inline">Agendar</span>
                    </Button>
                </div>
                </form>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {oneTimeInvestments.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                        Nenhum aporte único agendado.
                        </div>
                    ) : (
                        oneTimeInvestments.sort((a,b) => {
                             if(a.year !== b.year && a.year && b.year) return a.year - b.year;
                             return a.month - b.month;
                        }).map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group border-l-4 border-l-indigo-500">
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-full bg-indigo-600 text-white">
                                    <ArrowUpCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900 dark:text-white">{inv.name.replace(' (Aporte Único)', '')}</h4>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-indigo-50 dark:bg-indigo-900/30 inline-block px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900 mt-1">
                                        {MONTHS[inv.month]} {inv.year ? `(${inv.year})` : ''}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="font-bold text-indigo-700 dark:text-indigo-400">
                                {isPrivacyEnabled 
                                    ? '••••••'
                                    : `R$ ${inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                }
                                </div>
                                <div className="text-xs text-slate-400">único</div>
                            </div>
                            <button
                                onClick={() => onRemoveOneTime(inv.id)}
                                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-transparent hover:border-rose-100 dark:hover:border-rose-900"
                                aria-label="Remover aporte"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            </div>
                        </div>
                        ))
                    )}
                </div>
            </>
        )}
      </div>
    </div>
  );
};