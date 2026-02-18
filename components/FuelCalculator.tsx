import React, { useState, useMemo } from 'react';
import { Fuel, Zap, Gauge, Info, ArrowRightLeft, ChevronDown, ChevronUp } from 'lucide-react';

export const FuelCalculator: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [alcoholPrice, setAlcoholPrice] = useState<string>('');
  const [gasolinePrice, setGasolinePrice] = useState<string>('');

  const result = useMemo(() => {
    const alc = parseFloat(alcoholPrice.replace(',', '.'));
    const gas = parseFloat(gasolinePrice.replace(',', '.'));

    if (isNaN(alc) || isNaN(gas) || gas === 0) return null;

    const ratio = alc / gas;
    const percentage = ratio * 100;
    const worthIt = ratio <= 0.7 ? 'ALCOHOL' : 'GASOLINE';

    return { ratio, percentage, worthIt };
  }, [alcoholPrice, gasolinePrice]);

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden ${isOpen ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300'}`}>
      {/* Header - Clickable Area */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <div className="flex items-center gap-4">
          <div className={`p-2.5 rounded-xl transition-colors ${isOpen ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30'}`}>
            <Fuel className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white uppercase tracking-tight text-sm">
              Calculadora Flex (Álcool vs Gasolina)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Descubra qual combustível vale mais a pena no posto.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {result && !isOpen && (
             <span className={`hidden sm:inline-block text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${result.worthIt === 'ALCOHOL' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
               Melhor: {result.worthIt === 'ALCOHOL' ? 'Álcool' : 'Gasolina'}
             </span>
          )}
          {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>

      {/* Expandable Body */}
      {isOpen && (
        <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 mb-8">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Preço Álcool (L)</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                <input 
                  type="number" 
                  step="0.001"
                  placeholder="0,00"
                  value={alcoholPrice}
                  onChange={(e) => setAlcoholPrice(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:border-emerald-500 focus:ring-0 outline-none text-xl text-slate-900 dark:text-white font-bold transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Preço Gasolina (L)</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                <input 
                  type="number" 
                  step="0.001"
                  placeholder="0,00"
                  value={gasolinePrice}
                  onChange={(e) => setGasolinePrice(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:border-blue-500 focus:ring-0 outline-none text-xl text-slate-900 dark:text-white font-bold transition-all"
                />
              </div>
            </div>
          </div>

          {!result ? (
            <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <ArrowRightLeft className="w-10 h-10 text-slate-200 dark:text-slate-700 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Insira os preços acima para comparar.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className={`p-5 rounded-2xl border-2 flex items-center gap-6 ${result.worthIt === 'ALCOHOL' ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800'}`}>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-lg ${result.worthIt === 'ALCOHOL' ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}>
                  {result.worthIt === 'ALCOHOL' ? <Zap className="w-7 h-7 fill-current" /> : <Gauge className="w-7 h-7" />}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">A melhor escolha é:</p>
                  <h3 className={`text-2xl font-black uppercase leading-tight ${result.worthIt === 'ALCOHOL' ? 'text-emerald-700 dark:text-emerald-400' : 'text-blue-700 dark:text-blue-400'}`}>
                    {result.worthIt === 'ALCOHOL' ? 'Etanol (Álcool)' : 'Gasolina'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Relação de {result.percentage.toFixed(1)}%</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-700 p-0.5">
                  <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: '70%' }}></div>
                  <div className="h-full bg-blue-600 rounded-r-full flex-1"></div>
                </div>
                <div className="relative h-6">
                  <div 
                    className="absolute top-0 transition-all duration-700 flex flex-col items-center -translate-x-1/2" 
                    style={{ left: `${Math.min(result.percentage, 100)}%` }}
                  >
                    <div className="w-1 h-3 bg-slate-400 dark:bg-slate-500 rounded-full mb-1"></div>
                    <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-1.5 py-0.5 border dark:border-slate-700 rounded shadow-sm">VOCÊ</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
