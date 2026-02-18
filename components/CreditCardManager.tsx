import React, { useState, useMemo } from 'react';
import { CreditCard as CardIcon, Plus, Trash2, Calendar, DollarSign, AlertCircle, Edit2, Check, Wifi, Cpu, PlusCircle, X } from 'lucide-react';
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
  'bg-emerald-600', // Stone ish
  'bg-purple-700', // Nubank UV
  'bg-pink-600' // Others
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
  
  const [isFormOpen, setIsFormOpen] = useState(false);

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
      setIsFormOpen(false);
  };

  const handleEdit = (card: CreditCard) => {
      setName(card.name || '');
      setLimit(card.limitAmount !== undefined ? card.limitAmount.toString() : '');
      setClosingDay(card.closingDay !== undefined ? card.closingDay.toString() : '');
      setDueDay(card.dueDay !== undefined ? card.dueDay.toString() : '');
      setSelectedColor(card.color || CARD_COLORS[0]);
      setEditingId(card.id);
      setIsFormOpen(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = () => {
      if (editingId) {
          if(window.confirm('Tem certeza que deseja excluir este cartão?')) {
              onRemove(editingId);
              resetForm();
          }
      }
  };

  const getCardStats = (cardId: string, limitAmount: number) => {
    const used = transactions
      .filter(t => t.cardId === cardId && (t.transactionType === 'EXPENSE'))
      .reduce((acc, t) => acc + t.amount, 0);
    
    const available = limitAmount - used;
    const percentage = limitAmount > 0 ? Math.min((used / limitAmount) * 100, 100) : 0;

    return { used, available, percentage };
  };

  const displayValue = (val: number) => isPrivacyEnabled ? '••••••' : val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 w-full mx-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <CardIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Meus Cartões de Crédito
          </h2>
        </div>

        <div className="p-6">
          {!isFormOpen && (
            <button
                onClick={() => setIsFormOpen(true)}
                className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-all mb-8 bg-slate-50/50 dark:bg-slate-800/30"
            >
                <PlusCircle className="w-5 h-5" />
                <span className="font-medium">Adicionar Novo Cartão</span>
            </button>
          )}

          {isFormOpen && (
            <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-4 mb-8 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-2 max-w-4xl mx-auto">
                <div className="col-span-12 flex justify-between items-center mb-2 md:hidden">
                    <h3 className="font-bold text-slate-700 dark:text-slate-200">{editingId ? 'Editar Cartão' : 'Novo Cartão'}</h3>
                    <button type="button" onClick={resetForm} className="text-slate-400 hover:text-rose-600"><X className="w-5 h-5" /></button>
                </div>

                <div className="col-span-12 md:col-span-5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nome do Cartão</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Nubank" className="block w-full rounded-lg border-slate-300 dark:border-slate-600 border bg-white dark:bg-slate-900 p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="col-span-12 md:col-span-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Limite (R$)</label>
                    <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0.00" className="block w-full rounded-lg border-slate-300 dark:border-slate-600 border bg-white dark:bg-slate-900 p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="col-span-6 md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Dia Fech.</label>
                    <input type="number" min="1" max="31" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} className="block w-full rounded-lg border-slate-300 dark:border-slate-600 border bg-white dark:bg-slate-900 p-2.5 text-sm text-center outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="col-span-6 md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Dia Venc.</label>
                    <input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="block w-full rounded-lg border-slate-300 dark:border-slate-600 border bg-white dark:bg-slate-900 p-2.5 text-sm text-center outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                
                <div className="col-span-12 flex flex-col md:flex-row md:items-center gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex-1 overflow-x-auto py-2">
                        <div className="flex gap-3">
                            {CARD_COLORS.map(color => (
                            <button type="button" key={color} onClick={() => setSelectedColor(color)} className={`w-8 h-8 rounded-full ${color} ${selectedColor === color ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110 shadow-md' : 'opacity-70 hover:opacity-100 hover:scale-110 transition-all'}`} />
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        {editingId && <Button type="button" variant="danger" onClick={handleDelete} className="px-3"><Trash2 className="w-4 h-4" /></Button>}
                        <Button type="button" variant="secondary" onClick={resetForm}>Cancelar</Button>
                        <Button type="submit" disabled={!name || !limit} className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]">
                            {editingId ? <Check className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            {editingId ? 'Salvar' : 'Adicionar'}
                        </Button>
                    </div>
                </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8 justify-items-center">
            {cards.map(card => {
              const { used, available, percentage } = getCardStats(card.id, card.limitAmount || 0);
              const isBeingEdited = editingId === card.id;

              return (
                <div 
                    key={card.id} 
                    onClick={() => handleEdit(card)}
                    className={`relative overflow-hidden rounded-2xl shadow-xl text-white p-6 cursor-pointer ${card.color || 'bg-slate-800'} transition-all transform hover:-translate-y-1 w-full max-w-[400px] ${isBeingEdited ? 'ring-4 ring-indigo-500 ring-offset-2 scale-[1.02]' : ''}`}
                    style={{ aspectRatio: '1.58/1' }}
                >
                   <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                   <div className="flex justify-between items-start mb-8 relative z-10">
                      <div className="flex gap-3 items-center">
                          <div className="w-10 h-7 bg-amber-200/80 rounded flex items-center justify-center shadow-inner"><Cpu className="w-full h-full text-amber-600/50 opacity-60" strokeWidth={1} /></div>
                          <Wifi className="w-5 h-5 text-white/50 rotate-90" />
                      </div>
                      <div className="text-right">
                          <h3 className="font-bold text-lg leading-tight drop-shadow-md truncate max-w-[180px]">{card.name}</h3>
                          <div className="flex gap-2 text-[10px] text-white/80 justify-end mt-1">
                              <span className="bg-black/20 px-1.5 py-0.5 rounded whitespace-nowrap">Vence dia {card.dueDay}</span>
                          </div>
                      </div>
                   </div>

                   <div className="space-y-4 relative z-10 mt-auto">
                      <div>
                         <div className="flex justify-between text-xs mb-1.5 font-medium"><span>Utilizado</span><span>{Math.round(percentage)}%</span></div>
                         <div className="w-full bg-black/30 rounded-full h-2.5 overflow-hidden border border-white/10">
                            <div className={`h-full rounded-full transition-all duration-700 ${percentage > 90 ? 'bg-rose-500' : 'bg-emerald-400'}`} style={{ width: `${percentage}%` }}></div>
                         </div>
                      </div>
                      <div className="flex items-end justify-between pt-1">
                         <div><p className="text-[10px] uppercase tracking-wider text-white/60 mb-0.5">Fatura Atual</p><p className="font-bold text-xl drop-shadow-sm">{displayValue(used)}</p></div>
                         <div className="text-right"><p className="text-[10px] uppercase tracking-wider text-white/60 mb-0.5">Disponível</p><p className="font-medium text-base text-emerald-300 drop-shadow-sm">{displayValue(available)}</p></div>
                      </div>
                   </div>
                </div>
              );
            })}
            
            {cards.length === 0 && !isFormOpen && (
               <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl w-full">
                   <CardIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                   <p>Nenhum cartão cadastrado ainda.</p>
                   <button onClick={() => setIsFormOpen(true)} className="mt-4 text-indigo-600 font-bold hover:underline">Adicionar meu primeiro cartão</button>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
