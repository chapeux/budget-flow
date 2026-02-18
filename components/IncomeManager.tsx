import React, { useState } from 'react';
import { Plus, Trash2, DollarSign, User, Save, X } from 'lucide-react';
import { Income } from '../types';
import { Button } from './ui/Button';

interface IncomeManagerProps {
  incomes: Income[];
  onAdd: (income: Income) => void;
  onUpdate?: (income: Income) => void;
  onRemove: (id: string) => void;
  isPrivacyEnabled: boolean;
}

export const IncomeManager: React.FC<IncomeManagerProps> = ({ incomes, onAdd, onUpdate, onRemove, isPrivacyEnabled }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  // Edit State
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Income | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;

    onAdd({
      id: crypto.randomUUID(),
      personName: name,
      amount: parseFloat(amount),
    });

    setName('');
    setAmount('');
  };

  const handleExpand = (income: Income) => {
    if (expandedId === income.id) {
        setExpandedId(null);
        setEditValues(null);
    } else {
        setExpandedId(income.id);
        setEditValues({ ...income });
    }
  };

  const handleSaveEdit = () => {
    if (editValues && onUpdate) {
        onUpdate(editValues);
        setExpandedId(null);
        setEditValues(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Renda Familiar
        </h2>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome da Pessoa</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João"
                className="pl-10 block w-full rounded-lg border-slate-300 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 p-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 dark:text-white dark:placeholder-slate-500"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor Mensal (R$)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="block w-full rounded-lg border-slate-300 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 p-2.5 text-sm focus:ring-emerald-500 focus:border-emerald-500 dark:text-white dark:placeholder-slate-500"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={!name || !amount} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </form>

        <div className="space-y-3">
          {incomes.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
              Nenhuma renda cadastrada.
            </div>
          ) : (
            incomes.map((income) => {
              const isExpanded = expandedId === income.id;
              
              return (
                <div 
                    key={income.id} 
                    className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 overflow-hidden ${
                        isExpanded 
                        ? 'border-emerald-500 ring-1 ring-emerald-500 shadow-lg' 
                        : 'border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                  <div 
                    className="p-4 cursor-pointer flex items-center justify-between"
                    onClick={() => handleExpand(income)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Icon Circle - Hidden on Mobile */}
                      <div className="hidden sm:flex w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center text-xl font-bold flex-shrink-0 text-emerald-700 dark:text-emerald-400">
                        {income.personName.charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Name & Badge */}
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-white truncate text-base leading-tight">
                            {income.personName}
                        </h4>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                            Renda Mensal
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0 ml-2">
                        <div className="font-bold text-emerald-700 dark:text-emerald-400 text-base whitespace-nowrap">
                            {isPrivacyEnabled 
                            ? '••••••' 
                            : `+R$ ${income.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            }
                        </div>
                    </div>
                  </div>

                  {/* Expanded Edit Form */}
                  {isExpanded && editValues && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-1 md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Nome</label>
                                <input 
                                    type="text"
                                    value={editValues.personName}
                                    onChange={(e) => setEditValues({...editValues, personName: e.target.value})}
                                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Valor</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    value={editValues.amount}
                                    onChange={(e) => setEditValues({...editValues, amount: parseFloat(e.target.value)})}
                                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-white"
                                />
                            </div>
                            
                            <div className="col-span-1 md:col-span-2 pt-2 flex justify-between gap-3">
                                <button 
                                    onClick={() => onRemove(income.id)}
                                    className="flex items-center gap-2 text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-medium px-4 py-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-sm"
                                >
                                    <Trash2 className="w-4 h-4" /> Excluir
                                </button>
                                <div className="flex gap-2">
                                    <Button variant="secondary" onClick={() => setExpandedId(null)} className="bg-white dark:bg-slate-800">
                                        Cancelar
                                    </Button>
                                    <Button onClick={handleSaveEdit} className="bg-emerald-600 hover:bg-emerald-700">
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