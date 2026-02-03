import React, { useState } from 'react';
import { PlusCircle, Trash2, CalendarClock, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { ScheduledEvent } from '../types';
import { Button } from './ui/Button';

interface ScheduledEventManagerProps {
  events: ScheduledEvent[];
  onAdd: (event: ScheduledEvent) => void;
  onRemove: (id: string) => void;
  isPrivacyEnabled: boolean;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const ScheduledEventManager: React.FC<ScheduledEventManagerProps> = ({ 
  events, 
  onAdd, 
  onRemove,
  isPrivacyEnabled
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(0); // Default January
  const [type, setType] = useState<'INJECTION' | 'WITHDRAWAL'>('INJECTION');

  // Filter out the ones that are actually "One Time Investments" created in the other component
  const seasonalEvents = events.filter(e => !e.name.includes('(Aporte Único)'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;

    onAdd({
      id: crypto.randomUUID(),
      name,
      amount: parseFloat(amount),
      month,
      type,
    });

    setName('');
    setAmount('');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Eventos Sazonais (PLR, 13º, IPVA...)
        </h2>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
          <div className="md:col-span-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Recebimento PLR"
              className="block w-full rounded-lg border-slate-300 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 p-2.5 text-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-white dark:placeholder-slate-500"
            />
          </div>
          
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mês de Ocorrência</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="block w-full rounded-lg border-slate-300 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 p-2.5 text-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-white"
            >
              {MONTHS.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor (R$)</label>
            <div className="flex gap-2">
                <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="block w-full rounded-lg border-slate-300 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 p-2.5 text-sm focus:ring-purple-500 focus:border-purple-500 text-slate-900 dark:text-white dark:placeholder-slate-500"
                />
            </div>
          </div>

          <div className="md:col-span-2">
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
             <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
                <button
                    type="button"
                    onClick={() => setType('INJECTION')}
                    title="Aporte Extra"
                    className={`flex-1 flex justify-center py-2 rounded-md transition-all ${type === 'INJECTION' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}
                >
                    <ArrowUpCircle className="w-5 h-5" />
                </button>
                <button
                    type="button"
                    onClick={() => setType('WITHDRAWAL')}
                    title="Gasto Extra / Retirada"
                    className={`flex-1 flex justify-center py-2 rounded-md transition-all ${type === 'WITHDRAWAL' ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}
                >
                    <ArrowDownCircle className="w-5 h-5" />
                </button>
             </div>
          </div>
          
          <div className="md:col-span-12 flex justify-end">
            <Button type="submit" disabled={!name || !amount} className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 focus:ring-purple-500">
              <PlusCircle className="w-4 h-4 mr-2" />
              Adicionar Evento
            </Button>
          </div>
        </form>

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {seasonalEvents.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
              Nenhum evento sazonal configurado.
            </div>
          ) : (
            seasonalEvents.sort((a, b) => a.month - b.month).map((evt) => (
              <div key={evt.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group border-l-4 border-l-purple-500">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${evt.type === 'INJECTION' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                    {evt.type === 'INJECTION' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">{evt.name}</h4>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium bg-purple-50 dark:bg-purple-900/30 inline-block px-2 py-0.5 rounded border border-purple-100 dark:border-purple-900 mt-1">
                      {MONTHS[evt.month]} {evt.year ? `(${evt.year})` : '(Anual)'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`font-bold ${evt.type === 'INJECTION' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {isPrivacyEnabled 
                        ? '••••••'
                        : `${evt.type === 'INJECTION' ? '+' : '-'} R$ ${evt.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      }
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(evt.id)}
                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-transparent hover:border-rose-100 dark:hover:border-rose-900"
                    aria-label="Remover evento"
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