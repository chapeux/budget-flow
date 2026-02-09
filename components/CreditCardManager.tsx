import React, { useState, useMemo } from 'react';
import { CreditCard as CardIcon, Plus, Trash2, Calendar, DollarSign, AlertCircle, Edit2, Check } from 'lucide-react';
import { CreditCard, Transaction } from '../types';
import { Button } from './ui/Button';

interface CreditCardManagerProps {
  cards: CreditCard[];
  transactions: Transaction[];
  onAdd: (card: CreditCard) => void;
  onUpdate: (card: CreditCard) => void;
  onRemove: (id: string) => void;
  isPrivacyEnabled: boolean;
}

const CARD_COLORS = [
  'bg-slate-800', // Black/Default
  'bg-indigo-600', // Nubank ish
  'bg-red-600', // Santander ish
  'bg-orange-500', // Inter ish
  'bg-blue-700', // Caixa/BB ish
  'bg-yellow-500', // C6 ish
  'bg-emerald-600' // Stone ish
];

export const CreditCardManager: React.FC<CreditCardManagerProps> = ({ 
  cards, 
  transactions, 
  onAdd, 
  onUpdate,
  onRemove,
  isPrivacyEnabled
}) => {
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [selectedColor, setSelectedColor] = useState(CARD_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !limit || !closingDay || !dueDay) return;

    const payload = {
        name,
        limitAmount: parseFloat(limit),
        closingDay: parseInt(closingDay),
        dueDay: parseInt(dueDay),
        color: selectedColor
    };

    if (editingId) {
        onUpdate({
            id: editingId,
            ...payload
        });
        setEditingId(null);
    } else {
        onAdd({
            id: crypto.randomUUID(),
            ...payload
        });
    }

    resetForm();
  };

  const resetForm = () => {
      setName('');
      setLimit('');
      setClosingDay('');
      setDueDay('');
      setSelectedColor(CARD_COLORS[0]);
      setEditingId(null);
  };

  const handleEdit = (card: CreditCard) => {
      setName(card.name);
      setLimit(card.limitAmount.toString());
      setClosingDay(card.closingDay.toString());
      setDueDay(card.dueDay.toString());
      setSelectedColor(card.color || CARD_COLORS[0]);
      setEditingId(card.id);
  };

  const getCardStats = (cardId: string, limitAmount: number) => {
    // Simplificação: Soma de todas as despesas associadas a este cartão no período carregado (transactions)
    const used = transactions
      .filter(t => t.cardId === cardId && (t.transactionType === 'EXPENSE'))
      .reduce((acc, t) => acc + t.amount, 0);
    
    const available = limitAmount - used;
    const percentage = Math.min((used / limitAmount) * 100, 100);

    return { used, available, percentage };
  };

  const displayValue = (val: number) => isPrivacyEnabled ? '••••••' : val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <CardIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Meus Cartões de Crédito
          </h2>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
            <div className="md:col-span-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome do Cartão</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Nubank, Visa Infinite"
                className="block w-full rounded-lg border-slate-300 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 p-2.5 text-sm focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Limite (R$)</label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="0.00"
                className="block w-full rounded-lg border-slate-300 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 p-2.5 text-sm focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" title="Dia que a fatura fecha">Dia Fech.</label>
              <input
                type="number"
                min="1"
                max="31"
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
                placeholder="Dia"
                className="block w-full rounded-lg border-slate-300 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 p-2.5 text-sm focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" title="Dia que a fatura vence">Dia Venc.</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                placeholder="Dia"
                className="block w-full rounded-lg border-slate-300 dark:border-slate-700 border bg-slate-50 dark:bg-slate-800 p-2.5 text-sm focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
            
            <div className="md:col-span-12 flex items-center gap-4">
               <div className="flex gap-2">
                 {CARD_COLORS.map(color => (
                   <button
                    type="button"
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-6 h-6 rounded-full ${color} ${selectedColor === color ? 'ring-2 ring-offset-2 ring-indigo-500' : 'opacity-70 hover:opacity-100'}`}
                   />
                 ))}
               </div>
               <div className="flex-1 text-right flex justify-end gap-2">
                  {editingId && (
                      <Button type="button" variant="secondary" onClick={resetForm}>
                          Cancelar
                      </Button>
                  )}
                  <Button type="submit" disabled={!name || !limit} className="bg-indigo-600 hover:bg-indigo-700">
                    {editingId ? <Check className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {editingId ? 'Salvar Alterações' : 'Adicionar Cartão'}
                  </Button>
               </div>
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {cards.map(card => {
              const { used, available, percentage } = getCardStats(card.id, card.limitAmount);
              const isBeingEdited = editingId === card.id;

              return (
                <div key={card.id} className={`relative overflow-hidden rounded-xl shadow-lg text-white p-6 ${card.color || 'bg-slate-800'} transition-all hover:scale-[1.02] ${isBeingEdited ? 'ring-4 ring-indigo-500 scale-[1.02]' : ''}`}>
                   <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="font-bold text-lg">{card.name}</h3>
                        <p className="text-white/70 text-xs">Fechamento dia {card.closingDay} • Vence dia {card.dueDay}</p>
                      </div>
                      <CardIcon className="w-8 h-8 text-white/20" />
                   </div>

                   <div className="space-y-4">
                      <div>
                         <div className="flex justify-between text-xs mb-1 text-white/80">
                            <span>Limite Utilizado</span>
                            <span>{Math.round(percentage)}%</span>
                         </div>
                         <div className="w-full bg-black/20 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${percentage > 90 ? 'bg-red-400' : 'bg-emerald-400'}`} 
                              style={{ width: `${percentage}%` }}
                            ></div>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                         <div>
                            <p className="text-xs text-white/60">Fatura Atual</p>
                            <p className="font-bold text-lg">{displayValue(used)}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-xs text-white/60">Limite Disponível</p>
                            <p className="font-bold text-lg">{displayValue(available)}</p>
                         </div>
                      </div>
                   </div>

                   <div className="absolute top-4 right-4 flex gap-1">
                       <button 
                          onClick={() => handleEdit(card)}
                          className="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                       >
                          <Edit2 className="w-4 h-4" />
                       </button>
                       <button 
                          onClick={() => onRemove(card.id)}
                          className="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                       >
                          <Trash2 className="w-4 h-4" />
                       </button>
                   </div>
                </div>
              );
            })}
            
            {cards.length === 0 && (
               <div className="col-span-full text-center py-12 text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  <CardIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Nenhum cartão cadastrado.</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};