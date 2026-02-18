import React, { useState, useMemo } from 'react';
import { History, TrendingUp, ChevronDown, ChevronUp, Info, Search, Coins, RefreshCcw } from 'lucide-react';

// Accumulated IPCA factor (Simplified yearly approximations for demo)
// This maps: Year -> multiplier to reach 2024 value
const INFLATION_DATA: Record<number, number> = {
  2000: 4.88, 2001: 4.54, 2002: 4.22, 2003: 3.68, 2004: 3.42,
  2005: 3.18, 2006: 3.01, 2007: 2.88, 2008: 2.72, 2009: 2.61,
  2010: 2.47, 2011: 2.32, 2012: 2.19, 2013: 2.07, 2014: 1.94,
  2015: 1.75, 2016: 1.65, 2017: 1.60, 2018: 1.54, 2019: 1.48,
  2020: 1.41, 2021: 1.28, 2022: 1.21, 2023: 1.16, 2024: 1.00
};

export const InflationConverter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState<string>('100');
  const [selectedYear, setSelectedYear] = useState<number>(2010);

  const result = useMemo(() => {
    const val = parseFloat(amount) || 0;
    const factor = INFLATION_DATA[selectedYear] || 1;
    const correctedValue = val * factor;
    const totalInflation = (factor - 1) * 100;
    
    return { correctedValue, totalInflation };
  }, [amount, selectedYear]);

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden ${isOpen ? 'border-amber-500 ring-1 ring-amber-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-amber-300'}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-xl transition-colors ${isOpen ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30'}`}>
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white uppercase tracking-tight text-sm">Conversor de Inflação (Poder de Compra)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Quanto valeria hoje um valor de anos atrás?</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 mb-8">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Valor na época (R$)</label>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Ano de Referência</label>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              >
                {Object.keys(INFLATION_DATA).sort((a,b) => parseInt(b)-parseInt(a)).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-100 dark:border-amber-900/30 p-6 rounded-2xl flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-amber-500 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
                <RefreshCcw className="w-8 h-8" />
              </div>
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">O valor corrigido para hoje seria:</p>
              <h3 className="text-4xl font-black text-slate-800 dark:text-white mb-2">
                R$ {result.correctedValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </h3>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-500">
                Inflação acumulada: {result.totalInflation.toFixed(1)}% (IPCA)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                <Coins className="w-6 h-6 text-amber-500" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Poder de Compra</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Em {selectedYear}, R$ {amount} compravam o mesmo que <strong>R$ {result.correctedValue.toFixed(2)}</strong> compram hoje.</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                <TrendingUp className="w-6 h-6 text-rose-500" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Desvalorização</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">O Real perdeu aproximadamente <strong>{(1 - (1/INFLATION_DATA[selectedYear])) * 100}%</strong> do seu valor nesse período.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Este cálculo utiliza o índice <strong>IPCA</strong> (Índice Nacional de Preços ao Consumidor Amplo) acumulado anualmente. Os valores são estimativas educacionais baseadas no fechamento de cada ano e podem variar ligeiramente dos índices mensais oficiais do IBGE.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
