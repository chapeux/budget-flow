import React, { useState } from 'react';
import { Plus, Trash2, DollarSign, User } from 'lucide-react';
import { Income } from '../types';
import { Button } from './ui/Button';

interface IncomeManagerProps {
  incomes: Income[];
  onAdd: (income: Income) => void;
  onRemove: (id: string) => void;
  isPrivacyEnabled: boolean;
}

export const IncomeManager: React.FC<IncomeManagerProps> = ({ incomes, onAdd, onRemove, isPrivacyEnabled }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

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
            incomes.map((income) => (
              <div key={income.id} className="flex items-center justify-between p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-xs border border-emerald-200 dark:border-emerald-800">
                    {income.personName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{income.personName}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Renda Mensal</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {isPrivacyEnabled 
                      ? '••••••' 
                      : `+ R$ ${income.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    }
                  </span>
                  <button
                    onClick={() => onRemove(income.id)}
                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                    aria-label="Remover renda"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};