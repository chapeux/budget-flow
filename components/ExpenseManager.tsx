import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag, ShoppingBag, PlusCircle, Check, X, Save, Edit2 } from 'lucide-react';
import { Expense, ExpenseType } from '../types';
import { Button } from './ui/Button';

interface ExpenseManagerProps {
  expenses: Expense[];
  categories: string[];
  onAdd: (expense: Expense) => void;
  onUpdate?: (expense: Expense) => void;
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
  onUpdate,
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

  // Edit State
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Expense | null>(null);

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

  const handleExpand = (expense: Expense) => {
    if (expandedId === expense.id) {
        setExpandedId(null);
        setEditValues(null);
    } else {
        setExpandedId(expense.id);
        setEditValues({ ...expense });
    }
  };

  const handleSaveEdit = () => {
    if (editValues && onUpdate) {
        onUpdate(editValues);
        setExpandedId(null);
        setEditValues(null);
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
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full sm:flex-1 rounded-md border-slate-300 dark:border-slate-600 border p-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Ex: Assinaturas, Pets..."
              />
              <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateCategory} disabled={!newCategory} className="flex-1 sm:flex-none justify-center">Criar</Button>
                  <Button size="sm" variant="secondary" onClick={() => setIsAddingCategory(false)} className="flex-1 sm:flex-none justify-center bg-white dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">Cancelar</Button>
              </div>
            </div>
          </div>
        )}

        {/* ADD NEW EXPENSE FORM */}
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

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {expenses.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
              Nenhuma despesa registrada.
            </div>
          ) : (
            expenses.map((expense) => {
              const { value: pct, label: pctLabel } = getPercentageInfo(expense.amount);
              const isExpanded = expandedId === expense.id;

              return (
                <div 
                    key={expense.id} 
                    className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 overflow-hidden ${
                        isExpanded 
                        ? 'border-blue-500 ring-1 ring-blue-500 shadow-lg' 
                        : 'border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                  <div 
                    className="p-4 cursor-pointer flex items-center justify-between"
                    onClick={() => handleExpand(expense)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Icon Circle */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 ${
                        expense.type === 'FIXED' 
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                          : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                      }`}>
                        {expense.type === 'FIXED' ? 'F' : 'V'}
                      </div>
                      
                      {/* Name & Category Pill */}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-900 dark:text-white truncate text-base leading-tight">
                            {expense.name}
                        </h4>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            {expense.category}
                        </span>
                      </div>
                    </div>

                    {/* Amount & Percentage */}
                    <div className="text-right flex-shrink-0 ml-2">
                        <div className="font-bold text-rose-600 dark:text-rose-400 text-base whitespace-nowrap">
                            {isPrivacyEnabled 
                            ? '••••••' 
                            : `-R$ ${expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            }
                        </div>
                        {pct > 0 && !isPrivacyEnabled && (
                            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                {pct.toFixed(1)}% {pctLabel}
                            </div>
                        )}
                    </div>
                  </div>

                  {/* Expanded Edit Form */}
                  {isExpanded && editValues && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-1 md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Descrição</label>
                                <input 
                                    type="text"
                                    value={editValues.name}
                                    onChange={(e) => setEditValues({...editValues, name: e.target.value})}
                                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Valor</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    value={editValues.amount}
                                    onChange={(e) => setEditValues({...editValues, amount: parseFloat(e.target.value)})}
                                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Categoria</label>
                                <select 
                                    value={editValues.category}
                                    onChange={(e) => setEditValues({...editValues, category: e.target.value})}
                                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                                >
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Tipo</label>
                                <div className="flex rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1">
                                    <button 
                                        type="button"
                                        onClick={() => setEditValues({...editValues, type: 'FIXED'})}
                                        className={`flex-1 text-xs py-2 rounded font-medium transition-colors ${editValues.type === 'FIXED' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                                    >Fixa</button>
                                    <button 
                                        type="button"
                                        onClick={() => setEditValues({...editValues, type: 'VARIABLE'})}
                                        className={`flex-1 text-xs py-2 rounded font-medium transition-colors ${editValues.type === 'VARIABLE' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                                    >Variável</button>
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2 pt-2 flex justify-between gap-3">
                                <button 
                                    onClick={() => onRemove(expense.id)}
                                    className="flex items-center gap-2 text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-medium px-4 py-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-sm"
                                >
                                    <Trash2 className="w-4 h-4" /> Excluir
                                </button>
                                <div className="flex gap-2">
                                    <Button variant="secondary" onClick={() => setExpandedId(null)} className="bg-white dark:bg-slate-800">
                                        Cancelar
                                    </Button>
                                    <Button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700">
                                        Salvar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};