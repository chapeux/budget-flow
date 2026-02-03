import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { Income, Expense } from '../types';
import { EyeOff } from 'lucide-react';

interface BudgetChartsProps {
  incomes: Income[];
  expenses: Expense[];
  isPrivacyEnabled: boolean;
  isDarkMode?: boolean;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export const BudgetCharts: React.FC<BudgetChartsProps> = ({ incomes, expenses, isPrivacyEnabled, isDarkMode = false }) => {
  
  // Data for Category Pie Chart
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach(e => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // Data for Fixed vs Variable Bar Chart
  const typeData = useMemo(() => {
    const fixed = expenses.filter(e => e.type === 'FIXED').reduce((acc, curr) => acc + curr.amount, 0);
    const variable = expenses.filter(e => e.type === 'VARIABLE').reduce((acc, curr) => acc + curr.amount, 0);
    return [
      { name: 'Fixas', amount: fixed },
      { name: 'Variáveis', amount: variable }
    ];
  }, [expenses]);

  if (expenses.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400 transition-colors">
        Adicione despesas para visualizar os gráficos.
      </div>
    );
  }

  const ChartOverlay = () => (
    <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
        <EyeOff className="w-8 h-8 mb-2" />
        <p className="font-medium">Valores Ocultos</p>
    </div>
  );

  return (
    <div className="space-y-8">
      
      {/* Category Breakdown */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden transition-colors">
        {isPrivacyEnabled && <ChartOverlay />}
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Gastos por Categoria</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke={isDarkMode ? '#0f172a' : '#fff'}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                contentStyle={{ 
                    borderRadius: '8px', 
                    border: isDarkMode ? '1px solid #334155' : 'none', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                    color: isDarkMode ? '#f1f5f9' : '#1e293b'
                }}
              />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: isDarkMode ? '#cbd5e1' : '#475569' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fixed vs Variable */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden transition-colors">
        {isPrivacyEnabled && <ChartOverlay />}
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Fixo vs Variável</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(value) => `R$${value}`} 
                fontSize={12}
                tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b' }}
              />
              <Tooltip 
                 formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                 cursor={{ fill: isDarkMode ? '#1e293b' : '#f8fafc' }}
                 contentStyle={{ 
                    borderRadius: '8px', 
                    border: isDarkMode ? '1px solid #334155' : 'none', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                    color: isDarkMode ? '#f1f5f9' : '#1e293b'
                }}
              />
              <Bar dataKey="amount" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={50}>
                {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#f59e0b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};