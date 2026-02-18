import React, { useState, useMemo } from 'react';
import { HandCoins, Percent, Calendar, Info, TrendingUp, Wallet, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

export const CashVsInstallments: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [totalAmount, setTotalAmount] = useState<string>('1000');
  const [discountPercent, setDiscountPercent] = useState<string>('5');
  const [installments, setInstallments] = useState<string>('10');
  const [monthlyYield, setMonthlyYield] = useState<string>('0.85');

  const simulation = useMemo(() => {
    const price = parseFloat(totalAmount);
    const disc = parseFloat(discountPercent) / 100;
    const installmentsNum = parseInt(installments);
    const yieldRate = parseFloat(monthlyYield) / 100;

    if (isNaN(price) || isNaN(disc) || isNaN(installmentsNum) || isNaN(yieldRate) || installmentsNum <= 0) {
      return null;
    }

    const cashPrice = price * (1 - disc);
    const installmentValue = price / installmentsNum;
    
    let currentBalance = cashPrice;
    const history = [];

    for (let i = 1; i <= installmentsNum; i++) {
        const yieldAmount = currentBalance * yieldRate;
        currentBalance += yieldAmount;
        currentBalance -= installmentValue;
        
        history.push({
            month: i,
            balance: Math.max(0, currentBalance),
            yieldAmount
        });
    }

    const winner = currentBalance > 0 ? 'INSTALLMENTS' : 'CASH';
    const difference = Math.abs(currentBalance);

    return {
        cashPrice,
        installmentValue,
        finalBalance: currentBalance,
        winner,
        difference,
        history
    };
  }, [totalAmount, discountPercent, installments, monthlyYield]);

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden ${isOpen ? 'border-indigo-500 ring-1 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'}`}>
      {/* Header - Clickable Area */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-xl transition-colors ${isOpen ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30'}`}>
            <HandCoins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white uppercase tracking-tight text-sm">
              À Vista vs. Parcelado
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">O desconto à vista vale o rendimento do CDI?</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {simulation && !isOpen && (
            <span className={`hidden sm:inline-block text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${simulation.winner === 'CASH' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
              Ideal: {simulation.winner === 'CASH' ? 'À Vista' : 'Parcelar'}
            </span>
          )}
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>

      {/* Expandable Body */}
      {isOpen && (
        <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-8">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Preço (R$)</label>
              <input 
                  type="number" 
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Desconto (%)</label>
              <input 
                  type="number" 
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Parcelas</label>
              <input 
                  type="number" 
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Rendimento %</label>
              <input 
                  type="number" 
                  step="0.01"
                  value={monthlyYield}
                  onChange={(e) => setMonthlyYield(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          {simulation && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className={`p-5 rounded-2xl border-2 flex items-center gap-6 ${simulation.winner === 'CASH' ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800'}`}>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-lg ${simulation.winner === 'CASH' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}>
                  {simulation.winner === 'CASH' ? <Wallet className="w-7 h-7" /> : <TrendingUp className="w-7 h-7" />}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">A melhor opção é:</p>
                  <h3 className={`text-2xl font-black uppercase leading-tight ${simulation.winner === 'CASH' ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-400'}`}>
                    {simulation.winner === 'CASH' ? 'Pagar À Vista' : 'Parcelar e Investir'}
                  </h3>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-1">
                      Vantagem de <strong className={simulation.winner === 'CASH' ? 'text-emerald-600' : 'text-blue-600'}>
                          R$ {simulation.difference.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </strong>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Custo À Vista</p>
                      <p className="text-lg font-bold text-slate-700 dark:text-white">R$ {simulation.cashPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Custo Parcelado</p>
                      <p className="text-lg font-bold text-slate-700 dark:text-white">R$ {parseFloat(totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
