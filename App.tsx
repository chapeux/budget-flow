
import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, Wallet, TrendingDown, PieChart, Loader2, FileDown, Eye, EyeOff, LogOut, Moon, Sun, LayoutDashboard, ListOrdered, CreditCard as CardIcon, ShoppingCart, Target, Wrench, FlaskConical, RotateCcw } from 'lucide-react';
import { IncomeManager } from './components/IncomeManager';
import { ExpenseManager } from './components/ExpenseManager';
import { InvestmentManager } from './components/InvestmentManager';
import { ScheduledEventManager } from './components/ScheduledEventManager';
import { CreditCardManager } from './components/CreditCardManager';
import { ShoppingList } from './components/ShoppingList';
import { BudgetCharts } from './components/BudgetCharts';
import { AIAnalysis } from './components/AIAnalysis';
import { CashFlowForecast } from './components/CashFlowForecast';
import { TransactionsPage } from './components/TransactionsPage';
import { MonthClosing } from './components/MonthClosing';
import { ToolsPage } from './components/ToolsPage';
import { Auth } from './components/Auth';
import { LandingPage } from './components/LandingPage';
import { Income, Expense, Investment, ScheduledEvent, Transaction, CreditCard, ShoppingItem, ShoppingHistoryEntry } from './types';
import { supabase } from './lib/supabase';
import { generateBudgetPDF } from './services/pdfGenerator';
import { Button } from './components/ui/Button';
import { Skeleton, SkeletonCard, SkeletonList } from './components/ui/Skeleton';

const DEFAULT_CATEGORIES = [
  'Alimentação',
  'Moradia',
  'Transporte',
  'Saúde',
  'Lazer',
  'Educação',
  'Compras',
  'Serviços',
  'Outros'
];

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]); 
  const [transactions, setTransactions] = useState<Transaction[]>([]); 
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [shoppingHistory, setShoppingHistory] = useState<ShoppingHistoryEntry[]>([]);
  const [priceHistory, setPriceHistory] = useState<Record<string, number>>({});
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'transactions' | 'cards' | 'shopping' | 'closing' | 'tools'>('dashboard');
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  
  // Simulated Plan State (PRO logic)
  const [userPlan, setUserPlan] = useState<'FREE' | 'PRO'>('FREE');

  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [snapshot, setSnapshot] = useState<any>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('theme');
        return (saved === 'dark' || saved === 'light') ? saved : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const isDarkMode = theme === 'dark';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveringPassword(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async (silent = false) => {
    if (!session?.user?.id || isRecoveringPassword) return;
    try {
      if (!silent) setIsLoading(true);
      const [catRes, incRes, expRes, transRes, invRes, eventRes, cardRes, shopRes] = await Promise.all([
        supabase.from('categories').select('name').eq('user_id', session.user.id),
        supabase.from('incomes').select('*').eq('user_id', session.user.id),
        supabase.from('expenses').select('*').eq('user_id', session.user.id),
        supabase.from('transactions').select('*').eq('user_id', session.user.id),
        supabase.from('investments').select('*').eq('user_id', session.user.id),
        supabase.from('scheduled_events').select('*').eq('user_id', session.user.id),
        supabase.from('credit_cards').select('*').eq('user_id', session.user.id),
        supabase.from('shopping_items').select('*').eq('user_id', session.user.id)
      ]);
      
      if (catRes.data) setCustomCategories(catRes.data.map((c: any) => c.name));
      if (incRes.data) setIncomes(incRes.data.map((i: any) => ({ id: i.id, personName: i.person_name, amount: i.amount, description: i.description })));
      if (expRes.data) setExpenses(expRes.data);
      if (transRes.data) setTransactions(transRes.data.map((t: any) => ({ 
        id: t.id, 
        description: t.description, 
        amount: t.amount, 
        category: t.category, 
        type: t.type, 
        transactionType: t.transaction_type || 'EXPENSE', 
        status: t.status || 'DONE', 
        date: t.date, 
        reference_date: t.reference_date,
        cardId: t.card_id
      })));
      if (invRes.data) setInvestments(invRes.data.map((i: any) => ({ id: i.id, name: i.name, amount: i.amount, annualRate: i.annual_rate, category: i.category })));
      if (eventRes.data) setScheduledEvents(eventRes.data);
      if (cardRes.data) setCards(cardRes.data.map((c: any) => ({ 
        id: c.id, 
        name: c.name, 
        limit_amount: c.limit_amount || 0,
        closing_day: c.closing_day || 1,
        due_day: c.due_day || 1,
        color: c.color 
      })));
      if (shopRes.data) setShoppingItems(shopRes.data.map((s: any) => ({ id: s.id, name: s.name, quantity: s.quantity, is_checked: s.is_checked, category: s.category, price: s.price })));

      try {
          const { data: historyData } = await supabase.from('product_history').select('product_name, last_price').eq('user_id', session.user.id);
          if (historyData) {
              const historyMap: Record<string, number> = {};
              historyData.forEach((h: any) => { historyMap[h.product_name.toLowerCase().trim()] = h.last_price; });
              setPriceHistory(historyMap);
          }
      } catch (err) {}

      try {
          const { data: shData } = await supabase.from('shopping_history').select('*').eq('user_id', session.user.id).order('date', { ascending: false });
          if (shData) setShoppingHistory(shData.map((h: any) => ({ id: h.id, date: h.date, total_amount: h.total_amount, items: h.items })));
      } catch (err) {}

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id && !isRecoveringPassword) fetchData();
  }, [session?.user?.id, isRecoveringPassword]);

  const toggleSimulation = () => {
    if (!isSimulationMode) {
      setSnapshot({ incomes, expenses, transactions, investments, scheduledEvents, cards, shoppingItems });
      setIsSimulationMode(true);
    } else {
      fetchData(true);
      setIsSimulationMode(false);
      setSnapshot(null);
    }
  };

  const resetSimulation = () => {
      if (snapshot) {
          setIncomes(snapshot.incomes);
          setExpenses(snapshot.expenses);
          setTransactions(snapshot.transactions);
          setInvestments(snapshot.investments);
          setScheduledEvents(snapshot.scheduledEvents);
          setCards(snapshot.cards);
          setShoppingItems(snapshot.shoppingItems);
      }
  };

  const allCategories = useMemo(() => Array.from(new Set([...DEFAULT_CATEGORIES, ...customCategories])), [customCategories]);
  const totalIncome = useMemo(() => incomes.reduce((acc, curr) => acc + curr.amount, 0), [incomes]);
  const totalBudgetExpenses = useMemo(() => expenses.reduce((acc, curr) => acc + curr.amount, 0), [expenses]);
  const totalInvestments = useMemo(() => investments.reduce((acc, curr) => acc + curr.amount, 0), [investments]);
  const balance = totalIncome - totalBudgetExpenses;
  const freeCash = balance - totalInvestments;

  // Fix reference error: changed isPrivacyEnabled to isPrivacyMode
  const displayValue = (value: number) => isPrivacyMode ? '••••••' : `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const handleLogout = async () => {
    setIncomes([]); setExpenses([]); setTransactions([]); setInvestments([]); setScheduledEvents([]); setCards([]); setShoppingItems([]); setShoppingHistory([]); setCustomCategories([]); setPriceHistory({});
    await supabase.auth.signOut();
  };

  const addIncome = async (income: Income) => {
    if (isSimulationMode) { setIncomes(prev => [...prev, income]); return; }
    if (!session?.user?.id) return;
    const { error } = await supabase.from('incomes').insert([{ person_name: income.personName, amount: income.amount, description: income.description, user_id: session.user.id }]);
    if (!error) setIncomes([...incomes, income]);
  };

  const updateIncome = async (updatedIncome: Income) => {
    if (isSimulationMode) { setIncomes(prev => prev.map(i => i.id === updatedIncome.id ? updatedIncome : i)); return; }
    const { error } = await supabase.from('incomes').update({ person_name: updatedIncome.personName, amount: updatedIncome.amount, description: updatedIncome.description }).eq('id', updatedIncome.id);
    if (!error) setIncomes(prev => prev.map(i => i.id === updatedIncome.id ? updatedIncome : i));
  };

  const removeIncome = async (id: string) => {
    if (isSimulationMode) { setIncomes(prev => prev.filter(i => i.id !== id)); return; }
    const { error } = await supabase.from('incomes').delete().eq('id', id);
    if (!error) setIncomes(incomes.filter(i => i.id !== id));
  };

  const addExpense = async (expense: Expense) => {
    if (isSimulationMode) { setExpenses(prev => [...prev, expense]); return; }
    if (!session?.user?.id) return;
    const { error } = await supabase.from('expenses').insert([{ name: expense.name, amount: expense.amount, category: expense.category, type: expense.type, date: expense.date, user_id: session.user.id }]);
    if (!error) setExpenses(prev => [...prev, expense]);
  };

  const updateExpense = async (updatedExpense: Expense) => {
      if (isSimulationMode) { setExpenses(prev => prev.map(e => e.id === updatedExpense.id ? updatedExpense : e)); return; }
      const { error } = await supabase.from('expenses').update({ name: updatedExpense.name, amount: updatedExpense.amount, category: updatedExpense.category, type: updatedExpense.type, date: updatedExpense.date }).eq('id', updatedExpense.id);
      if (!error) setExpenses(prev => prev.map(e => e.id === updatedExpense.id ? updatedExpense : e));
  };

  const removeExpense = async (id: string) => {
    if (isSimulationMode) { setExpenses(prev => prev.filter(e => e.id !== id)); return; }
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) setExpenses(expenses.filter(e => e.id !== id));
  };

  const addTransaction = async (transaction: Transaction) => {
    if (isSimulationMode) { setTransactions(prev => [...prev, { ...transaction, id: generateUUID() }]); return; }
    if (!session?.user?.id) return;
    const refDate = transaction.referenceDate || transaction.date;
    const { data, error } = await supabase.from('transactions').insert([{ description: transaction.description, amount: transaction.amount, category: transaction.category, type: transaction.type, transaction_type: transaction.transactionType, status: transaction.status, date: transaction.date, reference_date: refDate, card_id: transaction.cardId, user_id: session.user.id }]).select().single();
    if (!error) setTransactions(prev => [...prev, { ...transaction, id: data.id, referenceDate: refDate }]);
  };

  const updateTransaction = async (updatedTrans: Transaction) => {
      if (isSimulationMode) { setTransactions(prev => prev.map(t => t.id === updatedTrans.id ? updatedTrans : t)); return; }
      const { error } = await supabase.from('transactions').update({ description: updatedTrans.description, amount: updatedTrans.amount, category: updatedTrans.category, type: updatedTrans.type, transaction_type: updatedTrans.transactionType, status: updatedTrans.status, date: updatedTrans.date, reference_date: updatedTrans.referenceDate, card_id: updatedTrans.cardId }).eq('id', updatedTrans.id);
      if (!error) setTransactions(prev => prev.map(t => t.id === updatedTrans.id ? updatedTrans : t));
  };

  const removeTransaction = async (id: string) => {
      if (isSimulationMode) { setTransactions(prev => prev.filter(t => t.id !== id)); return; }
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (!error) setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const addCard = async (card: CreditCard) => {
    if (isSimulationMode) { setCards(prev => [...prev, card]); return; }
    if (!session?.user?.id) return;
    const cardId = card.id || generateUUID();
    const { error } = await supabase.from('credit_cards').insert([{ id: cardId, name: card.name, limit_amount: card.limitAmount, closing_day: card.closingDay, due_day: card.dueDay, color: card.color, user_id: session.user.id }]);
    if (!error) setCards(prev => [...prev, { ...card, id: cardId }]);
  };
  
  const updateCard = async (card: CreditCard) => {
    if (isSimulationMode) { setCards(prev => prev.map(c => c.id === card.id ? card : c)); return; }
    const { error } = await supabase.from('credit_cards').update({ name: card.name, limit_amount: card.limitAmount, closing_day: card.closingDay, due_day: card.dueDay, color: card.color }).eq('id', card.id);
    if (!error) setCards(prev => prev.map(c => c.id === card.id ? card : c));
  };

  const removeCard = async (id: string) => {
      if (isSimulationMode) { setCards(prev => prev.filter(c => c.id !== id)); return; }
      const { error } = await supabase.from('credit_cards').delete().eq('id', id);
      if (!error) setCards(prev => prev.filter(c => c.id !== id));
  };

  const addShoppingItem = async (item: ShoppingItem) => {
    if (isSimulationMode) { setShoppingItems(prev => [...prev, item]); return; }
    if (!session?.user?.id) return;
    const { error } = await supabase.from('shopping_items').insert([{ name: item.name, quantity: item.quantity, is_checked: item.isChecked, category: item.category, price: item.price, user_id: session.user.id }]);
    if (!error) setShoppingItems(prev => [...prev, item]);
  };

  const updateShoppingItem = async (item: ShoppingItem) => {
    if (isSimulationMode) { setShoppingItems(prev => prev.map(i => i.id === item.id ? item : i)); return; }
    const { error } = await supabase.from('shopping_items').update({ name: item.name, quantity: item.quantity, is_checked: item.isChecked, category: item.category, price: item.price }).eq('id', item.id);
    if (!error) setShoppingItems(prev => [...prev, item]);
  };

  const removeShoppingItem = async (id: string) => {
    if (isSimulationMode) { setShoppingItems(prev => prev.filter(i => i.id !== id)); return; }
    const { error } = await supabase.from('shopping_items').delete().eq('id', id);
    if (!error) setShoppingItems(prev => prev.filter(i => i.id !== id));
  };

  const clearShoppingList = async () => {
    if (isSimulationMode) { setShoppingItems([]); return; }
    if (!session?.user?.id) return;
    const ids = shoppingItems.map(i => i.id);
    if (ids.length === 0) return;
    const { error } = await supabase.from('shopping_items').delete().in('id', ids);
    if (!error) setShoppingItems([]);
  };

  const finalizeShoppingList = async () => {
      const checkedItems = shoppingItems.filter(i => i.isChecked);
      if (checkedItems.length === 0) return;
      const totalAmount = checkedItems.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
      const today = new Date().toISOString();
      
      if (isSimulationMode) {
          addTransaction({ id: generateUUID(), description: `Compras (Simulação)`, amount: totalAmount, category: 'Compras', date: today, referenceDate: today.slice(0, 7), transactionType: 'EXPENSE', status: 'DONE' });
          setShoppingItems(prev => prev.filter(i => !i.isChecked));
          return;
      }
      
      if (!session?.user?.id) return;
      try {
          await addTransaction({ id: generateUUID(), description: `Compras (${new Date().toLocaleDateString()})`, amount: totalAmount, category: 'Compras', date: today, referenceDate: today.slice(0, 7), transactionType: 'EXPENSE', status: 'DONE' });
          const { data: histData } = await supabase.from('shopping_history').insert({ user_id: session.user.id, date: today, total_amount: totalAmount, items: checkedItems }).select().single();
          if (histData) setShoppingHistory(prev => [{ id: histData.id, date: histData.date, totalAmount: histData.total_amount, items: histData.items }, ...prev]);
          const idsToRemove = checkedItems.map(i => i.id);
          await supabase.from('shopping_items').delete().in('id', idsToRemove);
          setShoppingItems(prev => prev.filter(i => !idsToRemove.includes(i.id)));
      } catch (err) {}
  };

  const addInvestment = async (investment: Investment) => {
    if (isSimulationMode) { setInvestments(prev => [...prev, investment]); return; }
    if (!session?.user?.id) return;
    const { error } = await supabase.from('investments').insert([{ name: investment.name, amount: investment.amount, annual_rate: investment.annualRate, category: investment.category, user_id: session.user.id }]);
    if (!error) setInvestments(prev => [...prev, investment]);
  };

  const updateInvestment = async (updatedInv: Investment) => {
    if (isSimulationMode) { setInvestments(prev => prev.map(i => i.id === updatedInv.id ? updatedInv : i)); return; }
    const { error } = await supabase.from('investments').update({ name: updatedInv.name, amount: updatedInv.amount, annual_rate: updatedInv.annualRate, category: updatedInv.category }).eq('id', updatedInv.id);
    if (!error) setInvestments(prev => prev.map(i => i.id === updatedInv.id ? updatedInv : i));
  };

  const removeInvestment = async (id: string) => {
    if (isSimulationMode) { setInvestments(prev => prev.filter(i => i.id !== id)); return; }
    const { error } = await supabase.from('investments').delete().eq('id', id);
    if (!error) setInvestments(investments.filter(i => i.id !== id));
  };

  const addScheduledEvent = async (event: ScheduledEvent) => {
    if (isSimulationMode) { setScheduledEvents(prev => [...prev, { ...event, id: generateUUID() }]); return; }
    if (!session?.user?.id) return;
    const { data, error } = await supabase.from('scheduled_events').insert([{ name: event.name, type: event.type, amount: event.amount, month: event.month, year: event.year || null, user_id: session.user.id }]).select().single();
    if (!error && data) setScheduledEvents(prev => [...prev, data as ScheduledEvent]);
  };

  const updateScheduledEvent = async (updatedEvent: ScheduledEvent) => {
    if (isSimulationMode) { setScheduledEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e)); return; }
    const { error } = await supabase.from('scheduled_events').update({ name: updatedEvent.name, type: updatedEvent.type, amount: updatedEvent.amount, month: updatedEvent.month, year: updatedEvent.year || null }).eq('id', updatedEvent.id);
    if (!error) setScheduledEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const removeScheduledEvent = async (id: string) => {
    if (isSimulationMode) { setScheduledEvents(prev => prev.filter(e => e.id !== id)); return; }
    const { error } = await supabase.from('scheduled_events').delete().eq('id', id);
    if (!error) setScheduledEvents(scheduledEvents.filter(e => e.id !== id));
  };

  const addCategory = async (category: string) => {
    if (allCategories.includes(category)) return;
    if (isSimulationMode) { setCustomCategories(prev => [...prev, category]); return; }
    if (!session?.user?.id) return;
    const { error } = await supabase.from('categories').insert([{ name: category, user_id: session.user.id }]);
    if (!error) setCustomCategories(prev => [...prev, category]);
  };

  // Logic: Session is primary. If no session, show Landing OR Auth.
  if (!session && !isLoading) {
    if (showAuth || isRecoveringPassword) {
      return (
        <Auth 
          onFinishedRecovery={() => {
            setIsRecoveringPassword(false);
            fetchData();
          }} 
          onBack={() => setShowAuth(false)}
        />
      );
    }
    return <LandingPage 
             theme={theme} 
             toggleTheme={toggleTheme} 
             onGetStarted={() => setShowAuth(true)} 
             onLogin={() => setShowAuth(true)} 
           />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-20 transition-colors duration-300 ${isSimulationMode ? 'bg-amber-50/30 dark:bg-amber-950/10' : 'bg-slate-50 dark:bg-slate-950'}`}>
      
      {isSimulationMode && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white py-2 px-4 shadow-lg sticky top-0 z-[60] flex items-center justify-between animate-in slide-in-from-top-full duration-300">
              <div className="flex items-center gap-3">
                  <FlaskConical className="w-4 h-4 animate-pulse" />
                  <div className="text-xs sm:text-sm font-bold">
                      <span className="hidden sm:inline">MODO LABORATÓRIO ATIVO:</span>
                      <span className="font-normal opacity-90 ml-2">As alterações não afetarão seu banco de dados real.</span>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <button onClick={resetSimulation} className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-[10px] font-bold uppercase transition-all"><RotateCcw className="w-3 h-3" /> Reiniciar</button>
                  <button onClick={toggleSimulation} className="px-3 py-1 bg-white text-orange-600 hover:bg-orange-50 rounded-full text-[10px] font-black uppercase transition-all">Sair</button>
              </div>
          </div>
      )}

      <header className={`bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm transition-all ${isSimulationMode ? 'border-amber-300 dark:border-amber-800' : ''}`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <img src="https://i.imgur.com/iS5ZfNx.png" alt="Ativva Logo" className="w-16 h-16 object-contain rounded-lg" />
            <div><h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">Ativva</h1><p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Finanças Inteligentes</p></div>
          </div>
          <div className="hidden md:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
             {[
               { id: 'dashboard', icon: LayoutDashboard, label: 'Orçamento' },
               { id: 'closing', icon: Target, label: 'Fechamento' },
               { id: 'transactions', icon: ListOrdered, label: 'Transações' },
               { id: 'cards', icon: CardIcon, label: 'Cartões' },
               { id: 'shopping', icon: ShoppingCart, label: 'Compras' },
               { id: 'tools', icon: Wrench, label: 'Ferramentas' }
             ].map(tab => (
               <button key={tab.id} onClick={() => setCurrentView(tab.id as any)} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === tab.id ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'}`}>
                 <tab.icon className="w-4 h-4" />{tab.label}
               </button>
             ))}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
             <button onClick={toggleSimulation} title="Modo Laboratório" className={`p-2 rounded-lg transition-all ${isSimulationMode ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><FlaskConical className="w-5 h-5" /></button>
             <button onClick={toggleTheme} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">{isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
             <button onClick={() => setIsPrivacyMode(!isPrivacyMode)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">{isPrivacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
             <Button variant="secondary" size="sm" onClick={() => generateBudgetPDF(incomes, expenses, investments, scheduledEvents)} className="hidden sm:flex dark:bg-slate-800"><FileDown className="w-4 h-4 mr-2" />Relatório</Button>
             <button onClick={handleLogout} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="md:hidden flex border-t border-slate-200 dark:border-slate-800 overflow-x-auto">
             {[
               { id: 'dashboard', icon: LayoutDashboard, label: 'Orçamento' },
               { id: 'closing', icon: Target, label: 'Fechamento' },
               { id: 'transactions', icon: ListOrdered, label: 'Transações' },
               { id: 'cards', icon: CardIcon, label: 'Cartões' },
               { id: 'shopping', icon: ShoppingCart, label: 'Compras' },
               { id: 'tools', icon: Wrench, label: 'Ferramentas' }
             ].map(tab => (
               <button key={tab.id} onClick={() => setCurrentView(tab.id as any)} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all whitespace-nowrap ${currentView === tab.id ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10' : 'text-slate-500'}`}><tab.icon className="w-4 h-4" />{tab.label}</button>
             ))}
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300">
        {isLoading ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"><Skeleton className="h-6 w-48 mb-4" /><Skeleton className="h-20 w-full" /></div>
          </div>
        ) : (
          currentView === 'dashboard' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className={`p-5 rounded-xl shadow-sm border ${isSimulationMode ? 'bg-amber-100/30 border-amber-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}><h3 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-1.5">Renda Planejada {isSimulationMode && <FlaskConical className="w-3 h-3 text-amber-500" />}</h3><p className="text-xl font-bold">{displayValue(totalIncome)}</p></div>
                <div className={`p-5 rounded-xl shadow-sm border ${isSimulationMode ? 'bg-amber-100/30 border-amber-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}><h3 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-1.5">Teto de Gastos {isSimulationMode && <FlaskConical className="w-3 h-3 text-amber-500" />}</h3><p className="text-xl font-bold">{displayValue(totalBudgetExpenses)}</p></div>
                <div className={`p-5 rounded-xl shadow-sm border ${isSimulationMode ? 'bg-amber-100/30 border-amber-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}><h3 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-1.5">Investimentos Fixos {isSimulationMode && <FlaskConical className="w-3 h-3 text-amber-500" />}</h3><p className="text-xl font-bold text-blue-600">{displayValue(totalInvestments)}</p></div>
                <div className={`p-5 rounded-xl shadow-sm border ${freeCash < 0 ? 'bg-rose-50 border-rose-200' : (isSimulationMode ? 'bg-amber-100/30 border-amber-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800')}`}><h3 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-1.5">Saldo Livre {isSimulationMode && <FlaskConical className="w-3 h-3 text-amber-500" />}</h3><p className={`text-xl font-bold ${freeCash < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{displayValue(freeCash)}</p></div>
              </div>
              <div className="mb-8"><AIAnalysis incomes={incomes} expenses={expenses} investments={investments} balance={balance} isPrivacyEnabled={isPrivacyMode} onAddExpense={addExpense} onAddInvestment={addInvestment} userPlan={userPlan} /></div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-8">
                  <IncomeManager incomes={incomes} onAdd={addIncome} onUpdate={updateIncome} onRemove={removeIncome} isPrivacyEnabled={isPrivacyMode} />
                  <ExpenseManager expenses={expenses} categories={allCategories} onAdd={addExpense} onUpdate={updateExpense} onRemove={removeExpense} onAddCategory={addCategory} totalIncome={totalIncome} totalExpenses={totalBudgetExpenses} isPrivacyEnabled={isPrivacyMode} />
                  <div className="grid grid-cols-1 gap-8"><InvestmentManager investments={investments} scheduledEvents={scheduledEvents} onAdd={addInvestment} onUpdate={updateInvestment} onAddOneTime={addScheduledEvent} onUpdateOneTime={updateScheduledEvent} onRemove={removeInvestment} onRemoveOneTime={removeScheduledEvent} isPrivacyEnabled={isPrivacyMode} /><ScheduledEventManager events={scheduledEvents} onAdd={addScheduledEvent} onUpdate={updateScheduledEvent} onRemove={removeScheduledEvent} isPrivacyEnabled={isPrivacyMode} /></div>
                </div>
                <div className="lg:col-span-5 space-y-8"><CashFlowForecast totalIncome={totalIncome} totalExpenses={totalBudgetExpenses} investments={investments} scheduledEvents={scheduledEvents} isDarkMode={isDarkMode} /><BudgetCharts incomes={incomes} expenses={expenses} isPrivacyEnabled={isPrivacyMode} isDarkMode={isDarkMode} /></div>
              </div>
            </>
          ) : currentView === 'closing' ? (
            <MonthClosing expenses={expenses} transactions={transactions} incomes={incomes} isPrivacyEnabled={isPrivacyMode} isDarkMode={isDarkMode} />
          ) : currentView === 'cards' ? (
            <CreditCardManager cards={cards} transactions={transactions} onAdd={addCard} onUpdate={updateCard} onRemove={removeCard} isPrivacyEnabled={isPrivacyMode} />
          ) : currentView === 'shopping' ? (
            <ShoppingList items={shoppingItems} shoppingHistory={shoppingHistory} history={priceHistory} onAdd={addShoppingItem} onUpdate={updateShoppingItem} onRemove={removeShoppingItem} onClearAll={clearShoppingList} onFinalize={finalizeShoppingList} />
          ) : currentView === 'tools' ? (
            <ToolsPage />
          ) : (
            <TransactionsPage transactions={transactions} categories={allCategories} cards={cards} onAdd={addTransaction} onUpdate={updateTransaction} onRemove={removeTransaction} isPrivacyEnabled={isPrivacyMode} />
          )
        )}
      </main>
    </div>
  );
}
