import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, ShoppingBag, PlusCircle } from 'lucide-react';
import { Expense, ExpenseType } from '../types';
import { Button } from './ui/Button';

interface ExpenseManagerProps {
  expenses: Expense[];
  categories: string[];
  onAdd: (expense: Expense) => void;
  onRemove: (id: string) => void;
  onAddCategory: (category: string) => void;
  totalIncome: number;
  totalExpenses: number;
  isPrivacyEnabled: boolean;
}

export const ExpenseManager: React.FC<ExpenseManagerProps> = ({ 
  expenses, 
  categories, 
  onAdd, 
  onRemove,
  onAddCategory,
  totalIncome,
  totalExpenses,
  isPrivacyEnabled
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  // Initialize with first category or empty, but will update via useEffect
  const [category, setCategory] = useState(categories[0] || '');
  const [type, setType] = useState<ExpenseType>('FIXED');
  
  const [newCategory, setNewCategory] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Sync category state when categories prop changes (e.g. data load)
  useEffect(() => {
    // If current category is empty OR not present in the available categories list
    if ((!category || !categories.includes(category)) && categories.length > 0) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !category) return;

    onAdd({
      id: crypto.randomUUID(),
      name,
      amount: parseFloat(amount),
      category,
      type,
      date: new Date().toISOString(),
    });

    setName('');
    setAmount('');
  };

  const handleCreateCategory = () => {
    if (newCategory.trim()) {
      onAddCategory(newCategory.trim());
      setCategory(newCategory.trim());
      setNewCategory('');
      setIsAddingCategory(false);
    }
  };

  const getPercentageInfo = (amount: number) => {
    if (isPrivacyEnabled) return { value: 0, label: '' }; // Hide percentage if privacy on
    if (totalIncome > 0) {
      return { value: (amount / totalIncome) * 100, label: 'da renda' };
    }
    if (totalExpenses > 0) {
      return { value: (amount / totalExpenses) * 100, label: 'dos gastos' };
    }
    return { value: 0, label: '' };
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          Despesas
        </h2>
        <Button 
          onClick={() => setIsAddingCategory(!isAddingCategory)}
          variant="secondary"
          size="sm"
          className="text-xs bg-white dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
        >
          <Tag className="w-3 h-3 mr-1" />
          Nova Categoria
        </Button>
      </div>

      <div className="p-6">
        {isAddingCategory && (
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-2">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Criar Nova Categoria</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 rounded-md border-slate-300 dark:border-slate-600 border p-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Ex: Assinaturas, Pets..."
              />
              <Button size="sm" onClick={handleCreateCategory} disabled={!newCategory}>Criar</Button>
              <Button size="sm" variant="secondary" onClick={() => setIsAddingCategory(false)} className="bg-white dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">Cancelar</Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
          <div className="md:col-span-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Aluguel"
              className="block w-full rounded-lg border-slate-300 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 p-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 dark:text-white dark:placeholder-slate-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor (R$)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="block w-full rounded-lg border-slate-300 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 p-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 dark:text-white dark:placeholder-slate-500"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="block w-full rounded-lg border-slate-300 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 p-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 dark:text-white"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => setType('FIXED')}
                className={`flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all ${
                  type === 'FIXED' 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Fixa
              </button>
              <button
                type="button"
                onClick={() => setType('VARIABLE')}
                className={`flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all ${
                  type === 'VARIABLE' 
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Variável
              </button>
            </div>
          </div>
          <div className="md:col-span-12 flex justify-end">
            <Button type="submit" disabled={!name || !amount} className="w-full md:w-auto">
              <PlusCircle className="w-4 h-4 mr-2" />
              Adicionar Despesa
            </Button>
          </div>
        </form>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {expenses.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
              Nenhuma despesa registrada.
            </div>
          ) : (
            expenses.map((expense) => {
              const { value: pct, label: pctLabel } = getPercentageInfo(expense.amount);
              return (
                <div key={expense.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                      expense.type === 'FIXED' 
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900' 
                        : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900'
                    }`}>
                      {expense.type === 'FIXED' ? 'F' : 'V'}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">{expense.name}</h4>
                      <div className="flex gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-600">{expense.category}</span>
                        <span>{new Date(expense.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold text-rose-600 dark:text-rose-400">
                        {isPrivacyEnabled 
                          ? '••••••' 
                          : `- R$ ${expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        }
                      </div>
                      {pct > 0 && !isPrivacyEnabled && (
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                          {pct.toFixed(1)}% {pctLabel}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onRemove(expense.id)}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-transparent hover:border-rose-100 dark:hover:border-rose-900"
                      aria-label="Remover despesa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
