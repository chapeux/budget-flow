import React, { useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, Calendar, AlertCircle, PiggyBank } from 'lucide-react';
import { Investment, ScheduledEvent } from '../types';

interface CashFlowForecastProps {
  totalIncome: number;
  totalExpenses: number;
  investments: Investment[];
  scheduledEvents: ScheduledEvent[];
  isDarkMode?: boolean;
}

export const CashFlowForecast: React.FC<CashFlowForecastProps> = ({ investments, scheduledEvents, isDarkMode = false }) => {
  const [months, setMonths] = useState(12); // Default 1 year
  const [showCompound, setShowCompound] = useState(true);

  // Total monthly committed to regular investments
  const regularMonthlyContribution = investments.reduce((acc, inv) => acc + inv.amount, 0);

  // Calculate compound interest
  const data = useMemo(() => {
    let currentLinear = 0;
    let currentCompound = 0;
    
    const today = new Date();
    // Start projection from next month
    let projectionDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    return Array.from({ length: months }, (_, i) => {
      const monthOffset = i + 1;
      
      const currentMonthIndex = projectionDate.getMonth(); // 0-11
      const currentYear = projectionDate.getFullYear();

      // 1. Base Monthly Contribution (from Recurring Investments)
      let monthlyContribution = regularMonthlyContribution;

      // 2. Check for Seasonal/One-time Events
      const monthEvents = scheduledEvents.filter(e => {
        const isMonthMatch = e.month === currentMonthIndex;
        // If year is defined, match exact year. If undefined, it's recurring every year.
        const isYearMatch = e.year ? e.year === currentYear : true; 
        return isMonthMatch && isYearMatch;
      });
      
      let seasonalInjection = 0;
      let seasonalWithdrawal = 0;

      monthEvents.forEach(evt => {
          if (evt.type === 'INJECTION') seasonalInjection += evt.amount;
          if (evt.type === 'WITHDRAWAL') seasonalWithdrawal += evt.amount;
      });

      // Net contribution for this specific month
      const netMonthlyFlow = monthlyContribution + seasonalInjection - seasonalWithdrawal;

      // Update Linear Projection
      currentLinear += netMonthlyFlow;

      // Update Compound Projection
      let weightedRate = 0;
      if (regularMonthlyContribution > 0) {
        weightedRate = investments.reduce((acc, inv) => acc + (inv.amount * inv.annualRate), 0) / regularMonthlyContribution;
      } else {
        weightedRate = 10; // Default fallback
      }
      
      const monthlyRate = weightedRate / 100 / 12;
      
      const interestGained = currentCompound * monthlyRate;
      currentCompound += interestGained;
      currentCompound += netMonthlyFlow;

      // Advance date for next iteration
      const labelShort = projectionDate.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
      const labelYear = projectionDate.getFullYear().toString();
      
      // Update date object
      projectionDate = new Date(projectionDate.getFullYear(), projectionDate.getMonth() + 1, 1);

      return {
        name: `Mês ${monthOffset}`,
        label: labelShort,
        year: labelYear,
        linear: currentLinear,
        compound: currentCompound,
        interestEarned: currentCompound - currentLinear,
        hasEvent: monthEvents.length > 0
      };
    });
  }, [months, investments, scheduledEvents, regularMonthlyContribution]);

  const finalData = data[data.length - 1] || { linear: 0, compound: 0, interestEarned: 0 };
  const totalValue = showCompound ? finalData.compound : finalData.linear;

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= 0.5) {
        setMonths(Math.round(val * 12));
    } else if (val === 0) {
        setMonths(0);
    }
  };

  if (investments.length === 0 && scheduledEvents.length === 0) {
     return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center h-[300px]">
            <PiggyBank className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Sem dados para projeção</h3>
            <p className="text-sm text-slate-500 dark:text-slate-500 max-w-xs mt-2">
                Adicione investimentos recorrentes ou aportes para visualizar a previsão de patrimônio.
            </p>
        </div>
     );
  }

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formattedTotal = formatCurrency(totalValue);

  const getFontSizeClass = (text: string) => {
    const len = text.length;
    if (len > 25) return 'text-base';
    if (len > 20) return 'text-lg';
    if (len > 15) return 'text-xl';
    return 'text-2xl lg:text-3xl';
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Previsão de Patrimônio Investido
        </h3>
        
        <div className="flex items-center gap-2 text-sm">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <input 
                type="checkbox" 
                checked={showCompound} 
                onChange={(e) => setShowCompound(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 dark:bg-slate-700 dark:border-slate-600"
            />
            <span className="text-slate-600 dark:text-slate-300 font-medium">Juros Compostos</span>
            </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Controls */}
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-slate-400" /> Período da Projeção</span>
              <div className="flex items-center gap-2">
                <input
                    type="number"
                    min="0.5"
                    max="100"
                    step="0.5"
                    value={(months / 12).toFixed(1)}
                    onChange={handleYearChange}
                    className="w-16 text-right text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded text-sm border border-emerald-100 dark:border-emerald-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Anos</span>
              </div>
            </div>
            <input
              type="range"
              min="6"
              max="120"
              step="6"
              value={months > 120 ? 120 : months} // If custom value > 10 years, slider stays at max
              onChange={(e) => setMonths(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Composição da Projeção</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex justify-between">
                      <span>Aporte Recorrente:</span>
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">+{formatCurrency(regularMonthlyContribution)}/mês</span>
                  </li>
                  <li className="flex justify-between items-center text-xs text-slate-400 dark:text-slate-500 mt-1 border-t border-slate-200 dark:border-slate-700 pt-2">
                      <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Saldo livre não contabilizado</span>
                  </li>
              </ul>
          </div>
        </div>

        {/* Summary Box */}
        <div className={`p-5 rounded-xl border flex flex-col justify-center overflow-hidden transition-colors ${
            totalValue >= 0 
                ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900' 
                : 'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900'
        }`}>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1 truncate">
              Patrimônio Acumulado (Investimentos)
            </p>
            <p className={`${getFontSizeClass(formattedTotal)} font-bold mb-2 whitespace-nowrap transition-all duration-200 ${
                totalValue >= 0 
                    ? 'text-emerald-700 dark:text-emerald-400' 
                    : 'text-rose-700 dark:text-rose-400'
            }`}>
                {formattedTotal}
            </p>
            
            {showCompound && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-600 dark:text-emerald-300 bg-white/60 dark:bg-slate-800/60 p-2 rounded-lg inline-block self-start max-w-full">
                <PiggyBank className="w-3 h-3 flex-shrink-0" />
                <span className="truncate max-w-full">Juros gerados: <strong>{formatCurrency(finalData.interestEarned)}</strong></span>
              </div>
            )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[280px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCompound" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
            <XAxis 
                dataKey="name" 
                hide={true}
            />
            <YAxis hide />
            <Tooltip 
              formatter={(value: number, name: string) => [
                formatCurrency(value), 
                name === 'compound' ? 'Patrimônio Total' : 'Total Aportado'
              ]}
              labelFormatter={(label, payload) => {
                  if (payload && payload.length > 0) {
                      const item = payload[0].payload;
                      const hasEvent = item.hasEvent;
                      return `${item.label} (${label})${hasEvent ? ' • Aporte Extra' : ''}`;
                  }
                  return label;
              }}
              contentStyle={{ 
                  borderRadius: '8px', 
                  border: isDarkMode ? '1px solid #334155' : 'none', 
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                  color: isDarkMode ? '#f1f5f9' : '#1e293b'
              }}
              labelStyle={{ color: isDarkMode ? '#94a3b8' : '#64748b', marginBottom: '0.25rem' }}
            />
            
            <Area 
                type="monotone" 
                dataKey="linear" 
                name="Total Aportado"
                stroke="#64748b" 
                fill="transparent"
                strokeWidth={2}
                strokeDasharray="5 5"
                activeDot={{ r: 4 }}
            />

            {showCompound && (
              <Area 
                  type="monotone" 
                  dataKey="compound" 
                  name="Patrimônio Total"
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCompound)" 
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};