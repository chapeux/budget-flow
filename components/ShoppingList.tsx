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

  const [newName, setNewName] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newCategory, setNewCategory] = useState('');
  const [newPrice, setNewPrice] = useState('');
  
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // History Edit State
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [tempHistoryEntry, setTempHistoryEntry] = useState<ShoppingHistoryEntry | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    const payload = {
      name: newName,
      quantity: parseFloat(newQuantity) || 1,
      category: newCategory || undefined,
      price: newPrice ? parseFloat(newPrice) : undefined
    };

    if (editingId) {
      // Update existing item
      const existingItem = items.find(i => i.id === editingId);
      if (existingItem) {
        onUpdate({
          ...existingItem,
          ...payload
        });
      }
      resetForm();
    } else {
      // Add new item
      onAdd({
        id: generateUUID(),
        ...payload,
        isChecked: false,
      });
      resetForm();
    }
  };

  const handleEdit = (item: ShoppingItem) => {
    setEditingId(item.id);
    setNewName(item.name);
    setNewQuantity(item.quantity.toString());
    setNewCategory(item.category || '');
    setNewPrice(item.price?.toString() || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setNewName('');
    setNewQuantity('1');
    setNewCategory('');
    setNewPrice('');
    setEditingId(null);
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
      // Ensure 'groq' is used as requested
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

  const updateItemPrice = (item: ShoppingItem, priceStr: string) => {
    const price = parseFloat(priceStr);
    onUpdate({ ...item, price: isNaN(price) ? undefined : price });
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
      
      if (Math.abs(diff) < 0.01) return <span className="text-xs text-slate-400">=</span>;

      if (diff > 0) {
          return (
              <div className="flex items-center gap-1 text-[10px] text-rose-500 font-medium bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded" title={`Preço anterior: R$ ${lastPriceFormatted}`}>
                  <TrendingUp className="w-3 h-3" />
                  <span>+{pct.toFixed(0)}% (R$ {lastPriceFormatted})</span>
              </div>
          );
      } else {
          return (
             <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded" title={`Preço anterior: R$ ${lastPriceFormatted}`}>
                 <TrendingDown className="w-3 h-3" />
                 <span>{pct.toFixed(0)}% (R$ {lastPriceFormatted})</span>
             </div>
          );
      }
  };

  const toggleHistoryExpand = (id: string) => {
      // Don't toggle if we are editing this one (clicks inside input might propagate)
      if (editingHistoryId === id) return;
      setExpandedHistoryId(expandedHistoryId === id ? null : id);
  };

  // --- History Edit Handlers ---

  const handleHistoryEditClick = (e: React.MouseEvent, entry: ShoppingHistoryEntry) => {
      e.stopPropagation();
      setEditingHistoryId(entry.id);
      setTempHistoryEntry(JSON.parse(JSON.stringify(entry))); // Deep copy
      setExpandedHistoryId(entry.id); // Ensure expanded
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
          // Recalculate total just in case
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
      
      // Auto recalc total for local state
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
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
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        {editingId ? 'Editar Item' : 'Itens da Lista'}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Gerencie e categorize suas compras.
                    </p>
                </div>
                
                {!editingId && (
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
                        {isCategorizing ? 'Processando...' : 'Organizar com IA (Groq)'}
                    </Button>
                </div>
                )}
            </div>

            {/* INPUT FORM */}
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-2 mb-8 items-start md:items-stretch">
                <div className="flex-1 w-full">
                    <input 
                        type="text" 
                        placeholder="Nome do item (ex: Leite)" 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white"
                    />
                </div>
                <div className="w-full md:w-40">
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
                <div className="flex w-full md:w-auto gap-2">
                {editingId && (
                    <Button type="button" onClick={resetForm} variant="secondary" className="flex-1 md:flex-none">
                    <X className="w-5 h-5" />
                    </Button>
                )}
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white flex-1 md:flex-none">
                    {editingId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </Button>
                </div>
            </form>

            <div className="space-y-6">
                {items.length === 0 && (
                    <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                        Sua lista de compras está vazia.
                    </div>
                )}

                {groupedItems.map(group => (
                    <div key={group.name} className="space-y-2">
                        <h3 className="font-semibold text-slate-600 dark:text-slate-300 text-sm uppercase tracking-wider pl-1 flex items-center gap-2">
                            {group.icon && <span className="text-base">{group.icon}</span>}
                            {group.name}
                            <span className="text-xs font-normal text-slate-400 normal-case bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                {group.items.length}
                            </span>
                        </h3>
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            {group.items.map(item => (
                                <div 
                                    key={item.id} 
                                    className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-white dark:hover:bg-slate-800 transition-colors ${item.isChecked ? 'opacity-50 bg-slate-50 dark:bg-slate-900' : ''} ${editingId === item.id ? 'ring-2 ring-orange-500 ring-inset bg-orange-50 dark:bg-orange-900/10' : ''}`}
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <button 
                                            onClick={() => handleToggle(item)}
                                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                                                item.isChecked 
                                                ? 'bg-emerald-500 border-emerald-500 text-white' 
                                                : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                                            }`}
                                        >
                                            {item.isChecked && <Check className="w-3.5 h-3.5" />}
                                        </button>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-medium text-slate-800 dark:text-white block truncate ${item.isChecked ? 'line-through text-slate-500 dark:text-slate-500' : ''}`}>
                                                    {item.name}
                                                </span>
                                                {item.price && !item.isChecked && getPriceComparison(item.name, item.price)}
                                            </div>
                                        </div>
                                        
                                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-1 rounded shadow-sm border border-slate-100 dark:border-slate-700 min-w-[2rem] text-center whitespace-nowrap">
                                            {item.quantity} un
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 justify-between sm:justify-end w-full sm:w-auto pl-9 sm:pl-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-400 text-sm">R$</span>
                                            <input 
                                                type="number"
                                                step="0.01"
                                                value={item.price || ''}
                                                placeholder="0.00"
                                                onChange={(e) => updateItemPrice(item, e.target.value)}
                                                className="w-20 p-1 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-right focus:border-orange-500 focus:outline-none"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>

                                        <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => handleEdit(item)}
                                            className="text-slate-400 hover:text-blue-500 transition-colors p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                            title="Editar item"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => onRemove(item.id)}
                                            className="text-slate-400 hover:text-rose-500 transition-colors p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                            title="Remover item"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
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
                    const isEditing = editingHistoryId === entry.id;
                    const dataToShow = isEditing && tempHistoryEntry ? tempHistoryEntry : entry;

                    return (
                        <div key={entry.id} className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border overflow-hidden ${isEditing ? 'border-orange-500 dark:border-orange-500 ring-1 ring-orange-500' : 'border-slate-200 dark:border-slate-800'}`}>
                            <div 
                                onClick={() => !isEditing && toggleHistoryExpand(entry.id)}
                                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${isEditing ? 'cursor-default' : ''}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        {isEditing ? (
                                            <input 
                                                type="date" 
                                                value={dataToShow.date ? new Date(dataToShow.date).toISOString().split('T')[0] : ''}
                                                onChange={(e) => setTempHistoryEntry(prev => prev ? {...prev, date: new Date(e.target.value).toISOString()} : null)}
                                                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-sm font-semibold text-slate-800 dark:text-white mb-1"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <p className="font-semibold text-slate-800 dark:text-white">
                                                {new Date(entry.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            </p>
                                        )}
                                        <p className="text-xs text-slate-500">
                                            {Array.isArray(dataToShow.items) ? dataToShow.items.length : 0} itens
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`font-bold ${isEditing ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        R$ {dataToShow.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                    
                                    {!isEditing && (
                                        <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-3 ml-2">
                                            <button 
                                                onClick={(e) => handleHistoryEditClick(e, entry)}
                                                className="text-slate-400 hover:text-blue-500 p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={(e) => handleHistoryDeleteClick(e, entry.id)}
                                                className="text-slate-400 hover:text-rose-500 p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}

                                    {!isEditing && (
                                        expandedHistoryId === entry.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />
                                    )}
                                </div>
                            </div>

                            {expandedHistoryId === entry.id && (
                                <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-4">
                                    <div className="grid gap-2">
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
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                                                            <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{item.quantity}x</span>
                                                        </div>
                                                        <span className="font-medium text-slate-600 dark:text-slate-400">
                                                            R$ {((item.price || 0) * item.quantity).toFixed(2)}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {isEditing && (
                                        <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                                            <Button variant="secondary" size="sm" onClick={handleHistoryCancel}>
                                                Cancelar
                                            </Button>
                                            <Button size="sm" onClick={handleHistorySave} className="bg-orange-600 hover:bg-orange-700">
                                                Salvar Alterações
                                            </Button>
                                        </div>
                                    )}
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
