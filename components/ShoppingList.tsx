import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Check, ShoppingCart, Sparkles, Loader2, X, Edit2, Save, CheckCircle2, TrendingUp, TrendingDown, History, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { ShoppingItem, ShoppingHistoryEntry } from '../types';
import { Button } from './ui/Button';
import { suggestShoppingCategories } from '../services/aiService';

interface ShoppingListProps {
  items: ShoppingItem[];
  shoppingHistory?: ShoppingHistoryEntry[];
  history: Record<string, number>;
  onAdd: (item: ShoppingItem) => void;
  onUpdate: (item: ShoppingItem) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onFinalize?: () => void;
  onRemoveHistory?: (id: string) => void;
  onUpdateHistory?: (entry: ShoppingHistoryEntry) => void;
}

// Robust UUID generator
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const ShoppingList: React.FC<ShoppingListProps> = ({
  items,
  shoppingHistory = [],
  history,
  onAdd,
  onUpdate,
  onRemove,
  onClearAll,
  onFinalize,
  onRemoveHistory,
  onUpdateHistory
}) => {
  const [activeTab, setActiveTab] = useState<'LIST' | 'HISTORY'>('LIST');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // New Item State
  const [newName, setNewName] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newCategory, setNewCategory] = useState('');
  const [newPrice, setNewPrice] = useState('');
  
  const [isCategorizing, setIsCategorizing] = useState(false);
  
  // Expanded/Edit Mode State for Items
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<ShoppingItem | null>(null);

  // History Edit State
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [tempHistoryEntry, setTempHistoryEntry] = useState<ShoppingHistoryEntry | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    const payload = {
      id: generateUUID(),
      name: newName,
      quantity: parseFloat(newQuantity) || 1,
      category: newCategory || undefined,
      price: newPrice ? parseFloat(newPrice) : undefined,
      isChecked: false
    };

    onAdd(payload);
    
    // Reset form
    setNewName('');
    setNewQuantity('1');
    setNewCategory('');
    setNewPrice('');
  };

  const handleExpandItem = (item: ShoppingItem) => {
    if (expandedItemId === item.id) {
      // Close
      setExpandedItemId(null);
      setEditValues(null);
    } else {
      // Open
      setExpandedItemId(item.id);
      setEditValues({ ...item });
    }
  };

  const handleSaveEdit = () => {
    if (editValues) {
      onUpdate(editValues);
      setExpandedItemId(null);
      setEditValues(null);
    }
  };

  const handleToggle = (item: ShoppingItem) => {
    onUpdate({ ...item, isChecked: !item.isChecked });
  };

  const handleClearAllClick = () => {
    if (window.confirm('Tem certeza que deseja apagar toda a lista de compras? Esta ação não pode ser desfeita.')) {
      onClearAll();
    }
  };

  const handleFinalizeClick = () => {
    if (window.confirm('Isso criará uma despesa com o total dos itens marcados e salvará o histórico. Deseja continuar?')) {
        if (onFinalize) {
            onFinalize();
        }
    }
  };

  const handleCategorize = async () => {
    const itemsToProcess = items.filter(i => (!i.category || !i.price) && !i.isChecked);
    if (itemsToProcess.length === 0) return;

    setIsCategorizing(true);
    try {
      const names = itemsToProcess.map(i => i.name);
      const suggestions = await suggestShoppingCategories(names, 'groq');
      
      itemsToProcess.forEach(item => {
        const suggestion = suggestions[item.name];
        if (suggestion) {
          onUpdate({ 
            ...item, 
            category: item.category || suggestion.category,
            price: item.price || suggestion.price
          });
        }
      });
    } catch (err) {
      console.error(err);
      alert("Falha ao organizar e orçar itens.");
    } finally {
      setIsCategorizing(false);
    }
  };

  const normalizeCategory = (fullCategory: string) => {
    if (!fullCategory) return { name: 'Sem Categoria', icon: '' };
    const match = fullCategory.match(/[a-zA-Z0-9À-ÿ]/);
    const index = match?.index;
    if (index === undefined || index === -1) return { name: fullCategory, icon: '' };
    if (index === 0) return { name: fullCategory, icon: '' };
    const icon = fullCategory.substring(0, index).trim();
    const name = fullCategory.substring(index).trim();
    return { name, icon };
  };

  const groupedItems = useMemo(() => {
    const groups: Record<string, { name: string, icon: string, items: ShoppingItem[] }> = {};
    items.forEach(item => {
        const { name, icon } = normalizeCategory(item.category || '');
        const key = name === 'Sem Categoria' ? '___NULL___' : name.toUpperCase();
        if (!groups[key]) {
            groups[key] = { name: name, icon: icon, items: [] };
        }
        groups[key].items.push(item);
    });
    return Object.values(groups).sort((a, b) => {
        if (a.name === 'Sem Categoria') return -1;
        if (b.name === 'Sem Categoria') return 1;
        return a.name.localeCompare(b.name);
    });
  }, [items]);

  const totalEstimated = items.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
  const totalChecked = items.filter(i => i.isChecked).reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
  const countChecked = items.filter(i => i.isChecked).length;

  const getPriceComparison = (name: string, currentPrice: number) => {
      const lastPrice = history[name.toLowerCase().trim()];
      if (!lastPrice || currentPrice === 0) return null;

      const diff = currentPrice - lastPrice;
      const pct = (diff / lastPrice) * 100;
      const lastPriceFormatted = lastPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      if (Math.abs(diff) < 0.01) return <div className="text-xs text-slate-400 font-medium mt-0.5 text-right">=</div>;

      if (diff > 0) {
          return (
              <div className="text-xs font-bold text-rose-500 mt-0.5 text-right whitespace-nowrap" title={`Preço anterior: R$ ${lastPriceFormatted}`}>
                  +{pct.toFixed(0)}% (R$ {lastPriceFormatted})
              </div>
          );
      } else {
          return (
             <div className="text-xs font-bold text-emerald-500 mt-0.5 text-right whitespace-nowrap" title={`Preço anterior: R$ ${lastPriceFormatted}`}>
                 {pct.toFixed(0)}% (R$ {lastPriceFormatted})
             </div>
          );
      }
  };

  const toggleHistoryExpand = (id: string) => {
      // Prevent toggling if we are currently editing this item
      if (editingHistoryId === id) return;
      setExpandedHistoryId(expandedHistoryId === id ? null : id);
  };

  // --- History Edit Handlers ---
  const handleHistoryEditClick = (e: React.MouseEvent, entry: ShoppingHistoryEntry) => {
      e.stopPropagation();
      setEditingHistoryId(entry.id);
      setTempHistoryEntry(JSON.parse(JSON.stringify(entry)));
      setExpandedHistoryId(entry.id);
  };

  const handleHistoryDeleteClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (window.confirm("Tem certeza que deseja excluir este registro do histórico?")) {
          if (onRemoveHistory) onRemoveHistory(id);
      }
  };

  const handleHistorySave = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (tempHistoryEntry && onUpdateHistory) {
          const newTotal = tempHistoryEntry.items.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
          onUpdateHistory({ ...tempHistoryEntry, totalAmount: newTotal });
      }
      setEditingHistoryId(null);
      setTempHistoryEntry(null);
  };

  const handleHistoryCancel = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingHistoryId(null);
      setTempHistoryEntry(null);
  };

  const handleHistoryItemChange = (idx: number, field: keyof ShoppingItem, value: any) => {
      if (!tempHistoryEntry) return;
      const newItems = [...tempHistoryEntry.items];
      newItems[idx] = { ...newItems[idx], [field]: value };
      const newTotal = newItems.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
      setTempHistoryEntry({ ...tempHistoryEntry, items: newItems, totalAmount: newTotal });
  };

  const handleHistoryItemRemove = (idx: number) => {
      if (!tempHistoryEntry) return;
      const newItems = tempHistoryEntry.items.filter((_, i) => i !== idx);
      const newTotal = newItems.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
      setTempHistoryEntry({ ...tempHistoryEntry, items: newItems, totalAmount: newTotal });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      
      {/* TABS */}
      <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('LIST')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'LIST' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
              <ShoppingCart className="w-4 h-4" /> Lista Atual
          </button>
          <button 
            onClick={() => setActiveTab('HISTORY')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'HISTORY' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
          >
              <History className="w-4 h-4" /> Histórico
          </button>
      </div>

      {activeTab === 'LIST' ? (
      <>
        {/* ADD ITEM FORM */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        Adicionar Item
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Gerencie e categorize suas compras.
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    {items.length > 0 && (
                    <Button 
                        type="button"
                        onClick={handleClearAllClick} 
                        variant="danger" 
                        className="w-full sm:w-auto"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Limpar Lista
                    </Button>
                    )}
                    <Button 
                        type="button"
                        onClick={handleCategorize} 
                        variant="secondary" 
                        disabled={isCategorizing || items.length === 0}
                        className="w-full sm:w-auto"
                    >
                        {isCategorizing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Sparkles className="w-4 h-4 mr-2 text-purple-600"/>}
                        {isCategorizing ? 'IA: Organizar' : 'IA: Organizar'}
                    </Button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-2 mb-2 items-start md:items-stretch">
                <div className="flex-1 w-full">
                    <input 
                        type="text" 
                        placeholder="Nome do item (ex: Leite)" 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white"
                    />
                </div>
                {/* CATEGORY INPUT: Hidden on Mobile */}
                <div className="hidden md:block w-full md:w-40">
                    <input 
                        type="text" 
                        placeholder="Categoria" 
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white"
                    />
                </div>
                <div className="w-full md:w-32 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                    <input 
                        type="number" 
                        step="0.01"
                        placeholder="Preço" 
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="w-full p-3 pl-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white"
                    />
                </div>
                <div className="w-full md:w-24">
                    <input 
                        type="number" 
                        min="0.1"
                        step="0.1"
                        placeholder="Qtd" 
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(e.target.value)}
                        className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white text-center"
                    />
                </div>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white w-full md:w-auto">
                    <Plus className="w-5 h-5" />
                </Button>
            </form>
        </div>

        {/* SHOPPING LIST ITEMS */}
        <div className="space-y-6">
            {items.length === 0 && (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                    Sua lista de compras está vazia.
                </div>
            )}

            {groupedItems.map(group => (
                <div key={group.name} className="space-y-3">
                    <h3 className="font-semibold text-slate-600 dark:text-slate-300 text-sm uppercase tracking-wider pl-1 flex items-center gap-2">
                        {group.icon && <span className="text-base">{group.icon}</span>}
                        {group.name}
                        <span className="text-xs font-normal text-slate-400 normal-case bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            {group.items.length}
                        </span>
                    </h3>
                    
                    <div className="grid gap-3">
                        {group.items.map(item => {
                            const isExpanded = expandedItemId === item.id;
                            
                            return (
                                <div 
                                  key={item.id} 
                                  className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border transition-all duration-200 overflow-hidden ${isExpanded ? 'border-orange-500 ring-1 ring-orange-500 shadow-md' : 'border-slate-200 dark:border-slate-800'}`}
                                >
                                    {/* Main Card View */}
                                    <div 
                                      className={`p-4 flex items-center gap-4 cursor-pointer relative ${item.isChecked ? 'opacity-60 bg-slate-50 dark:bg-slate-900' : ''}`}
                                      onClick={() => handleExpandItem(item)}
                                    >
                                        {/* Large Circular Checkbox */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleToggle(item); }}
                                            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                                item.isChecked 
                                                ? 'bg-slate-900 border-slate-900 dark:bg-slate-100 dark:border-slate-100 text-white dark:text-slate-900' 
                                                : 'border-slate-300 dark:border-slate-600 hover:border-orange-500 dark:hover:border-orange-400 bg-white dark:bg-slate-800'
                                            }`}
                                        >
                                            {item.isChecked && <Check strokeWidth={3} className="w-4 h-4" />}
                                        </button>
                                        
                                        {/* Content */}
                                        <div className="flex-1 flex justify-between items-start min-w-0">
                                            <div className="flex flex-col pr-2 min-w-0">
                                                <span className={`text-lg font-medium leading-snug truncate ${item.isChecked ? 'line-through text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                                                    {item.name}
                                                </span>
                                                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                                    {item.quantity} un
                                                </span>
                                            </div>
                                            
                                            <div className="flex flex-col items-end flex-shrink-0">
                                                <span className={`text-xl font-semibold tracking-tight ${item.isChecked ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                                                    R$ {item.price ? item.price.toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '0,00'}
                                                </span>
                                                {item.price && !item.isChecked && getPriceComparison(item.name, item.price)}
                                            </div>
                                        </div>

                                        {/* Expand Chevron Hint */}
                                        <div className="absolute right-2 top-2 opacity-0">
                                            <ChevronDown className="w-4 h-4 text-slate-300" />
                                        </div>
                                    </div>

                                    {/* Expanded Edit Form */}
                                    {isExpanded && editValues && (
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="col-span-2">
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Nome / Descrição</label>
                                                    <input 
                                                        type="text"
                                                        value={editValues.name}
                                                        onChange={(e) => setEditValues({...editValues, name: e.target.value})}
                                                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Quantidade</label>
                                                    <div className="flex items-center">
                                                        <button 
                                                          onClick={() => setEditValues({...editValues, quantity: Math.max(0.1, editValues.quantity - 1)})}
                                                          className="w-10 h-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-l-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold"
                                                        >-</button>
                                                        <input 
                                                            type="number"
                                                            step="0.1"
                                                            value={editValues.quantity}
                                                            onChange={(e) => setEditValues({...editValues, quantity: parseFloat(e.target.value)})}
                                                            className="w-full h-10 border-y border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-center focus:ring-0 outline-none text-slate-900 dark:text-white font-medium"
                                                        />
                                                        <button 
                                                          onClick={() => setEditValues({...editValues, quantity: editValues.quantity + 1})}
                                                          className="w-10 h-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-r-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold"
                                                        >+</button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Preço Unit. (R$)</label>
                                                    <input 
                                                        type="number"
                                                        step="0.01"
                                                        value={editValues.price || ''}
                                                        onChange={(e) => setEditValues({...editValues, price: parseFloat(e.target.value)})}
                                                        placeholder="0.00"
                                                        className="w-full p-2.5 h-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white text-right font-medium"
                                                    />
                                                </div>
                                                
                                                <div className="col-span-2 pt-2 flex items-center justify-between gap-3">
                                                    <button 
                                                        onClick={() => onRemove(item.id)}
                                                        className="flex items-center gap-2 text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-medium px-2 py-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-sm"
                                                    >
                                                        <Trash2 className="w-4 h-4" /> Excluir Item
                                                    </button>
                                                    <Button onClick={handleSaveEdit} className="bg-orange-600 hover:bg-orange-700 px-6">
                                                        Salvar
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>

        {/* FOOTER TOTAL */}
        {items.length > 0 && (
            <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-auto flex flex-col md:flex-row items-end md:items-center gap-4 z-50">
                <div className="bg-slate-900 dark:bg-slate-800 text-white p-4 rounded-xl shadow-2xl border border-slate-700 w-full md:w-96 animate-in slide-in-from-bottom-10">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-400 text-sm">Total Estimado</span>
                        <span className="font-bold text-lg">R$ {totalEstimated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {totalChecked > 0 && (
                        <div className="flex justify-between items-center text-xs text-emerald-400">
                            <span>No carrinho (Marcados)</span>
                            <span>R$ {totalChecked.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    )}
                </div>
                
                {countChecked > 0 && (
                    <Button 
                        type="button"
                        onClick={handleFinalizeClick}
                        className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl py-4 md:py-3 animate-in zoom-in-95"
                    >
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Finalizar ({countChecked})
                    </Button>
                )}
            </div>
        )}
      </>
      ) : (
        <div className="space-y-4">
            {shoppingHistory.length === 0 ? (
                <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Nenhum histórico de compras encontrado.</p>
                </div>
            ) : (
                shoppingHistory.map(entry => {
                    const isExpanded = expandedHistoryId === entry.id;
                    const isEditing = editingHistoryId === entry.id;
                    const dataToShow = isEditing && tempHistoryEntry ? tempHistoryEntry : entry;

                    // Date formatting for the card
                    const dateObj = new Date(entry.date);
                    const dateStr = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
                    // Capitalize first letter and remove dot from month if present
                    const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1).replace('.', '');
                    
                    // Mobile date format (dd/mm/yyyy)
                    const mobileDate = dateObj.toLocaleDateString('pt-BR');

                    return (
                        <div 
                          key={entry.id} 
                          className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border transition-all duration-200 overflow-hidden ${
                            (isExpanded || isEditing) ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200 dark:border-slate-800'
                          }`}
                        >
                            {/* Card Header (Click to expand) */}
                            <div 
                                onClick={() => !isEditing && toggleHistoryExpand(entry.id)}
                                className={`flex items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${isEditing ? 'cursor-default' : ''}`}
                            >
                                {/* Left Icon */}
                                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center flex-shrink-0 text-emerald-600 mr-4">
                                    <Calendar className="w-6 h-6" />
                                </div>

                                {/* Center Info */}
                                <div className="flex-1 min-w-0">
                                    {isEditing ? (
                                         <input 
                                            type="date" 
                                            value={dataToShow.date ? new Date(dataToShow.date).toISOString().split('T')[0] : ''}
                                            onChange={(e) => setTempHistoryEntry(prev => prev ? {...prev, date: new Date(e.target.value).toISOString()} : null)}
                                            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-sm font-semibold text-slate-800 dark:text-white mb-1 w-full"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <h3 className="text-lg font-medium text-slate-900 dark:text-white truncate">
                                            <span className="md:hidden">{mobileDate}</span>
                                            <span className="hidden md:inline">{formattedDate}</span>
                                        </h3>
                                    )}
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {Array.isArray(dataToShow.items) ? dataToShow.items.length : 0} itens
                                    </p>
                                </div>

                                {/* Right Price */}
                                <div className="text-right flex-shrink-0 pl-2">
                                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                        R$ {dataToShow.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {(isExpanded || isEditing) && (
                                <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-4 animate-in slide-in-from-top-2">
                                    <div className="grid gap-2 mb-4">
                                        {Array.isArray(dataToShow.items) && dataToShow.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm p-2 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                                {isEditing ? (
                                                    // EDIT MODE ITEM ROW
                                                    <div className="flex flex-1 gap-2 items-center">
                                                        <input 
                                                            className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-slate-800 dark:text-white text-xs"
                                                            value={item.name}
                                                            onChange={(e) => handleHistoryItemChange(idx, 'name', e.target.value)}
                                                            placeholder="Nome"
                                                        />
                                                        <input 
                                                            className="w-16 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-slate-800 dark:text-white text-xs text-center"
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => handleHistoryItemChange(idx, 'quantity', parseFloat(e.target.value))}
                                                            placeholder="Qtd"
                                                        />
                                                        <input 
                                                            className="w-20 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-slate-800 dark:text-white text-xs text-right"
                                                            type="number"
                                                            step="0.01"
                                                            value={item.price}
                                                            onChange={(e) => handleHistoryItemChange(idx, 'price', parseFloat(e.target.value))}
                                                            placeholder="Preço"
                                                        />
                                                        <button 
                                                            onClick={() => handleHistoryItemRemove(idx)}
                                                            className="text-rose-400 hover:text-rose-600 p-1"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    // VIEW MODE ITEM ROW
                                                    <>
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0"></div>
                                                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{item.name}</span>
                                                            <span className="text-xs text-slate-400 whitespace-nowrap">x{item.quantity}</span>
                                                        </div>
                                                        <span className="font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap ml-2">
                                                            R$ {((item.price || 0) * item.quantity).toFixed(2)}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                                        {isEditing ? (
                                            <>
                                                <Button variant="secondary" size="sm" onClick={handleHistoryCancel}>
                                                    Cancelar
                                                </Button>
                                                <Button size="sm" onClick={handleHistorySave} className="bg-orange-600 hover:bg-orange-700">
                                                    Salvar Alterações
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <button 
                                                    onClick={(e) => handleHistoryDeleteClick(e, entry.id)}
                                                    className="flex items-center gap-2 text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 font-medium px-3 py-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-sm"
                                                >
                                                    <Trash2 className="w-4 h-4" /> Excluir
                                                </button>
                                                <Button size="sm" onClick={(e) => handleHistoryEditClick(e, entry)} variant="secondary" className="bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                                                    <Edit2 className="w-4 h-4 mr-2" /> Editar
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
      )}
    </div>
  );
};
