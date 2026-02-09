import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, Wallet, TrendingDown, PieChart, Loader2, FileDown, Eye, EyeOff, LogOut, Moon, Sun, LayoutDashboard, ListOrdered, CreditCard as CardIcon, ShoppingCart } from 'lucide-react';
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
import { Auth } from './components/Auth';
import { Income, Expense, Investment, ScheduledEvent, Transaction, CreditCard, ShoppingItem, ShoppingHistoryEntry } from './types';
import { supabase } from './lib/supabase';
import { generateBudgetPDF } from './services/pdfGenerator';
import { Button } from './components/ui/Button';

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

// Robust UUID generator that works in all contexts (including HTTP)
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
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]); // This is BUDGET
  const [transactions, setTransactions] = useState<Transaction[]>([]); // This is REALIZED
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [shoppingHistory, setShoppingHistory] = useState<ShoppingHistoryEntry[]>([]);
  const [priceHistory, setPriceHistory] = useState<Record<string, number>>({});
  
  // Split categories into custom (fetched) and default
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'transactions' | 'cards' | 'shopping'>('dashboard');
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('theme');
        return (saved === 'dark' || saved === 'light') ? saved : 'light';
    }
    return 'light';
  });

  // Apply Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const isDarkMode = theme === 'dark';

  // Manage Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch Data when Session exists
  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // CLEAR STATE immediately
        setIncomes([]);
        setExpenses([]);
        setTransactions([]);
        setInvestments([]);
        setScheduledEvents([]);
        setCards([]);
        setShoppingItems([]);
        setShoppingHistory([]);
        setCustomCategories([]);
        setPriceHistory({});
        
        // 1. Fetch Custom Categories
        const { data: catData } = await supabase
          .from('categories')
          .select('name')
          .eq('user_id', session.user.id);
        
        if (catData) setCustomCategories(catData.map((c: any) => c.name));

        // 2. Fetch Incomes
        const { data: incData } = await supabase
          .from('incomes')
          .select('*')
          .eq('user_id', session.user.id);
        
        if (incData) {
            const mappedIncomes = incData.map((i: any) => ({
                id: i.id,
                personName: i.person_name, 
                amount: i.amount,
                description: i.description
            }));
            setIncomes(mappedIncomes);
        }

        // 3. Fetch Budget Expenses
        const { data: expData } = await supabase
          .from('expenses')
          .select('*')
          .eq('user_id', session.user.id);

        if (expData) setExpenses(expData);

        // 4. Fetch Real Transactions
        const { data: transData } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', session.user.id);
        
        if (transData) {
            const mappedTransactions = transData.map((t: any) => ({
                id: t.id,
                description: t.description,
                amount: t.amount,
                category: t.category,
                type: t.type,
                transactionType: t.transaction_type || 'EXPENSE',
                status: t.status || 'DONE',
                date: t.date,
                referenceDate: t.reference_date,
                cardId: t.card_id // Map card_id
            }));
            setTransactions(mappedTransactions);
        }

        // 5. Fetch Investments
        const { data: invData } = await supabase
          .from('investments')
          .select('*')
          .eq('user_id', session.user.id);
        
        if (invData) {
             const mappedInvestments = invData.map((i: any) => ({
                id: i.id,
                name: i.name,
                amount: i.amount,
                annualRate: i.annual_rate,
                category: i.category
            }));
            setInvestments(mappedInvestments);
        }

        // 6. Fetch Scheduled Events
        const { data: eventData } = await supabase
          .from('scheduled_events')
          .select('*')
          .eq('user_id', session.user.id);
        
        if (eventData) {
            setScheduledEvents(eventData);
        }

        // 7. Fetch Cards
        const { data: cardData } = await supabase
          .from('credit_cards')
          .select('*')
          .eq('user_id', session.user.id);
          
        if (cardData) {
            const mappedCards = cardData.map((c: any) => ({
                id: c.id,
                name: c.name,
                limitAmount: c.limit_amount,
                closingDay: c.closing_day,
                dueDay: c.due_day,
                color: c.color
            }));
            setCards(mappedCards);
        }

        // 8. Fetch Shopping Items
        const { data: shopData } = await supabase
          .from('shopping_items')
          .select('*')
          .eq('user_id', session.user.id);
        
        if (shopData) {
            const mappedItems = shopData.map((s: any) => ({
                id: s.id,
                name: s.name,
                quantity: s.quantity,
                isChecked: s.is_checked,
                category: s.category,
                price: s.price // Map Price if exists in DB
            }));
            setShoppingItems(mappedItems);
        }

        // 9. Fetch Product History (Best effort)
        try {
            const { data: historyData } = await supabase
                .from('product_history')
                .select('product_name, last_price')
                .eq('user_id', session.user.id);
            
            if (historyData) {
                const historyMap: Record<string, number> = {};
                historyData.forEach((h: any) => {
                    historyMap[h.product_name.toLowerCase().trim()] = h.last_price;
                });
                setPriceHistory(historyMap);
            }
        } catch (err) {
            console.log('Product history table might not exist yet, skipping.');
        }

        // 10. Fetch Shopping History
        try {
            const { data: shData } = await supabase
                .from('shopping_history')
                .select('*')
                .eq('user_id', session.user.id)
                .order('date', { ascending: false });
            
            if (shData) {
                const mappedHistory = shData.map((h: any) => ({
                    id: h.id,
                    date: h.date,
                    totalAmount: h.total_amount,
                    items: h.items // Assumes JSONB
                }));
                setShoppingHistory(mappedHistory);
            }
        } catch (err) {
            console.log('Shopping history table might not exist yet.');
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [session]);

  // Derived State
  const allCategories = useMemo(() => {
    return Array.from(new Set([...DEFAULT_CATEGORIES, ...customCategories]));
  }, [customCategories]);

  const totalIncome = useMemo(() => incomes.reduce((acc, curr) => acc + curr.amount, 0), [incomes]);
  const totalBudgetExpenses = useMemo(() => expenses.reduce((acc, curr) => acc + curr.amount, 0), [expenses]);
  const totalInvestments = useMemo(() => investments.reduce((acc, curr) => acc + curr.amount, 0), [investments]);
  
  const balance = totalIncome - totalBudgetExpenses;
  const freeCash = balance - totalInvestments;

  const displayValue = (value: number) => {
    return isPrivacyMode 
      ? '••••••' 
      : `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const handleLogout = async () => {
    setIncomes([]);
    setExpenses([]);
    setTransactions([]);
    setInvestments([]);
    setScheduledEvents([]);
    setCards([]);
    setShoppingItems([]);
    setShoppingHistory([]);
    setCustomCategories([]);
    setPriceHistory({});
    await supabase.auth.signOut();
  };

  // CRUD Handlers
  const addIncome = async (income: Income) => {
    if (!session?.user?.id) return;
    try {
      const { error } = await supabase
        .from('incomes')
        .insert([{
            person_name: income.personName,
            amount: income.amount,
            description: income.description,
            user_id: session.user.id
        }]);

      if (error) throw error;
      setIncomes([...incomes, income]);
    } catch (err) {
      console.error('Error adding income:', err);
    }
  };

  const removeIncome = async (id: string) => {
    try {
      const { error } = await supabase.from('incomes').delete().eq('id', id);
      if (error) throw error;
      setIncomes(incomes.filter(i => i.id !== id));
    } catch (err) {
        console.error('Error deleting income:', err);
    }
  };

  const addExpense = async (expense: Expense) => {
    if (!session?.user?.id) return;
    try {
      const { error } = await supabase.from('expenses').insert([{
        name: expense.name,
        amount: expense.amount,
        category: expense.category,
        type: expense.type,
        date: expense.date,
        user_id: session.user.id
      }])
      .select()
      .single();

      if (error) throw error;
      
      const newExpense = { ...expense, id: (error as any)?.data?.id || expense.id }; 
      setExpenses(prev => [...prev, newExpense]);
    } catch (err) {
      console.error('Error adding expense:', err);
    }
  };

  const removeExpense = async (id: string) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      setExpenses(expenses.filter(e => e.id !== id));
    } catch (err) {
      console.error('Error removing expense:', err);
    }
  };

  // --- TRANSACTIONS HANDLERS ---

  const addTransaction = async (transaction: Transaction) => {
    if (!session?.user?.id) return;
    try {
        const refDate = transaction.referenceDate || transaction.date;

        const { data, error } = await supabase.from('transactions').insert([{
            description: transaction.description,
            amount: transaction.amount,
            category: transaction.category,
            type: transaction.type,
            transaction_type: transaction.transactionType,
            status: transaction.status,
            date: transaction.date,
            reference_date: refDate,
            card_id: transaction.cardId, // Save card_id
            user_id: session.user.id
        }])
        .select()
        .single();

        if (error) throw error;
        
        const newTrans = { ...transaction, id: data.id, referenceDate: refDate };
        setTransactions(prev => [...prev, newTrans]);
    } catch (err) {
        console.error('Error adding transaction:', err);
        setTransactions(prev => [...prev, transaction]);
    }
  };

  const updateTransaction = async (updatedTrans: Transaction) => {
      try {
          const { error } = await supabase.from('transactions').update({
              description: updatedTrans.description,
              amount: updatedTrans.amount,
              category: updatedTrans.category,
              type: updatedTrans.type,
              transaction_type: updatedTrans.transactionType,
              status: updatedTrans.status,
              date: updatedTrans.date,
              reference_date: updatedTrans.referenceDate,
              card_id: updatedTrans.cardId // Update card_id
          }).eq('id', updatedTrans.id);
          
          if (error) throw error;
          setTransactions(prev => prev.map(t => t.id === updatedTrans.id ? updatedTrans : t));
      } catch (err) {
          console.error('Error updating transaction:', err);
      }
  };

  const removeTransaction = async (id: string) => {
      try {
          const { error } = await supabase.from('transactions').delete().eq('id', id);
          if (error) throw error;
          setTransactions(prev => prev.filter(t => t.id !== id));
      } catch (err) {
          console.error('Error removing transaction:', err);
      }
  };

  // --- CARDS HANDLERS ---
  const addCard = async (card: CreditCard) => {
    if (!session?.user?.id) return;
    try {
        const { error } = await supabase.from('credit_cards').insert([{
            name: card.name,
            limit_amount: card.limitAmount,
            closing_day: card.closingDay,
            due_day: card.dueDay,
            color: card.color,
            user_id: session.user.id
        }]);

        if (error) throw error;
        setCards([...cards, card]);
    } catch (err) {
        console.error('Error adding card:', err);
        setCards([...cards, card]);
    }
  };
  
  const updateCard = async (card: CreditCard) => {
    if (!session?.user?.id) return;
    try {
        const { error } = await supabase.from('credit_cards').update({
            name: card.name,
            limit_amount: card.limitAmount,
            closing_day: card.closingDay,
            due_day: card.dueDay,
            color: card.color,
        }).eq('id', card.id);

        if (error) throw error;
        setCards(prev => prev.map(c => c.id === card.id ? card : c));
    } catch (err) {
        console.error('Error updating card:', err);
    }
  };

  const removeCard = async (id: string) => {
      try {
          const { error } = await supabase.from('credit_cards').delete().eq('id', id);
          if (error) throw error;
          setCards(prev => prev.filter(c => c.id !== id));
      } catch (err) {
          console.error('Error removing card:', err);
          setCards(prev => prev.filter(c => c.id !== id));
      }
  };

  // --- SHOPPING LIST HANDLERS ---
  
  const addShoppingItem = async (item: ShoppingItem) => {
    if (!session?.user?.id) return;
    try {
        const { error } = await supabase.from('shopping_items').insert([{
            name: item.name,
            quantity: item.quantity,
            is_checked: item.isChecked,
            category: item.category,
            price: item.price, // Save price
            user_id: session.user.id
        }]).select().single();

        if (error) throw error;
        setShoppingItems(prev => [...prev, item]);
    } catch (err) {
        console.error('Error adding shopping item:', err);
        setShoppingItems(prev => [...prev, item]); // Optimistic
    }
  };

  const updateShoppingItem = async (item: ShoppingItem) => {
    try {
        const { error } = await supabase.from('shopping_items').update({
            name: item.name,
            quantity: item.quantity,
            is_checked: item.isChecked,
            category: item.category,
            price: item.price // Update price
        }).eq('id', item.id);

        if (error) throw error;
        setShoppingItems(prev => prev.map(i => i.id === item.id ? item : i));
    } catch (err) {
        console.error('Error updating shopping item:', err);
        setShoppingItems(prev => prev.map(i => i.id === item.id ? item : i)); // Optimistic
    }
  };

  const removeShoppingItem = async (id: string) => {
    try {
        const { error } = await supabase.from('shopping_items').delete().eq('id', id);
        if (error) throw error;
        setShoppingItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
        console.error('Error removing shopping item:', err);
        setShoppingItems(prev => prev.filter(i => i.id !== id)); // Optimistic
    }
  };

  const clearShoppingList = async () => {
    if (!session?.user?.id) return;
    const ids = shoppingItems.map(i => i.id);
    if (ids.length === 0) return;

    // Optimistic Update
    const backupItems = [...shoppingItems];
    setShoppingItems([]);

    try {
        // Mass delete by IDs which is safer than deleting all for user if filtering exists
        const { error } = await supabase.from('shopping_items').delete().in('id', ids);
        if (error) throw error;
    } catch (err) {
        console.error('Error clearing shopping list:', err);
        // Rollback if failed
        setShoppingItems(backupItems);
        alert("Erro ao limpar a lista. Tente novamente.");
    }
  };

  const finalizeShoppingList = async () => {
      if (!session?.user?.id) return;
      
      const checkedItems = shoppingItems.filter(i => i.isChecked);
      if (checkedItems.length === 0) {
          alert("Nenhum item marcado para finalizar.");
          return;
      }

      const totalAmount = checkedItems.reduce((acc, item) => acc + ((item.price || 0) * item.quantity), 0);
      const today = new Date().toISOString();

      try {
          // 1. Create Transaction (Financial Record)
          await addTransaction({
              id: generateUUID(),
              description: `Compras de Supermercado (${new Date().toLocaleDateString()})`,
              amount: totalAmount,
              category: 'Compras',
              date: today,
              referenceDate: today.slice(0, 7),
              type: 'VARIABLE',
              transactionType: 'EXPENSE',
              status: 'DONE'
          });

          // 2. Save Shopping History (Detailed Record)
          // We intentionally do this BEFORE deleting items to ensure history is saved.
          const { data: histData, error: histError } = await supabase.from('shopping_history').insert({
              user_id: session.user.id,
              date: today,
              total_amount: totalAmount,
              items: checkedItems // Saves JSON
          }).select().single();

          if (histError) throw histError;

          if (histData) {
              setShoppingHistory(prev => [{
                  id: histData.id,
                  date: histData.date,
                  totalAmount: histData.total_amount,
                  items: histData.items
              }, ...prev]);
          }

          // 3. Update Price History (For future suggestions)
          const newHistory = { ...priceHistory };
          for (const item of checkedItems) {
              if (item.price && item.price > 0) {
                  const cleanName = item.name.toLowerCase().trim();
                  newHistory[cleanName] = item.price;
                  try {
                      await supabase.from('product_history').upsert({
                          user_id: session.user.id,
                          product_name: cleanName,
                          last_price: item.price,
                          updated_at: today
                      }, { onConflict: 'user_id, product_name' });
                  } catch (e) {
                      // Silent fail
                  }
              }
          }
          setPriceHistory(newHistory);

          // 4. Clear Checked Items (Mass Delete by ID)
          const idsToRemove = checkedItems.map(i => i.id);
          const { error: deleteError } = await supabase.from('shopping_items').delete().in('id', idsToRemove);
          
          if (deleteError) {
             console.error("Error deleting items after finalize:", deleteError);
             alert("Histórico salvo, mas houve um erro ao limpar os itens da lista.");
          } else {
             setShoppingItems(prev => prev.filter(i => !idsToRemove.includes(i.id)));
             alert(`Compras finalizadas e histórico salvo! R$ ${totalAmount.toFixed(2)} registrados.`);
          }

      } catch (err) {
          console.error("Critical error finalizing shopping:", err);
          alert("Erro ao finalizar compras. Verifique sua conexão.");
      }
  };

  const removeShoppingHistoryEntry = async (id: string) => {
    try {
        const { error } = await supabase.from('shopping_history').delete().eq('id', id);
        if (error) throw error;
        setShoppingHistory(prev => prev.filter(h => h.id !== id));
    } catch (err) {
        console.error('Error deleting shopping history:', err);
    }
  };

  const updateShoppingHistoryEntry = async (entry: ShoppingHistoryEntry) => {
    try {
        const { error } = await supabase.from('shopping_history').update({
            date: entry.date,
            total_amount: entry.totalAmount,
            items: entry.items
        }).eq('id', entry.id);

        if (error) throw error;
        setShoppingHistory(prev => prev.map(h => h.id === entry.id ? entry : h));
    } catch (err) {
        console.error('Error updating shopping history:', err);
    }
  };


  const addInvestment = async (investment: Investment) => {
    if (!session?.user?.id) return;
    try {
      const { error } = await supabase.from('investments').insert([{
        name: investment.name,
        amount: investment.amount,
        annual_rate: investment.annualRate,
        category: investment.category,
        user_id: session.user.id
      }]);

      if (error) throw error;
      setInvestments([...investments, investment]);
    } catch (err) {
      console.error('Error adding investment:', err);
    }
  };

  const removeInvestment = async (id: string) => {
    try {
      const { error } = await supabase.from('investments').delete().eq('id', id);
      if (error) throw error;
      setInvestments(investments.filter(i => i.id !== id));
    } catch (err) {
        console.error('Error removing investment:', err);
    }
  };

  const addScheduledEvent = async (event: ScheduledEvent) => {
    if (!session?.user?.id) return;
    try {
        const payload = {
            name: event.name,
            type: event.type,
            amount: event.amount,
            month: event.month,
            year: event.year || null,
            user_id: session.user.id
        };

        const { data, error } = await supabase
            .from('scheduled_events')
            .insert([payload])
            .select()
            .single();

        if (error) throw error;

        if (data) {
            setScheduledEvents(prev => [...prev, data as ScheduledEvent]);
        }
    } catch (err: any) {
        console.error('Error adding scheduled event:', err);
    }
  };

  const removeScheduledEvent = async (id: string) => {
    try {
        const { error } = await supabase.from('scheduled_events').delete().eq('id', id);
        if (error) throw error;
        setScheduledEvents(scheduledEvents.filter(e => e.id !== id));
    } catch (err) {
        console.error('Error removing scheduled event:', err);
    }
  };

  const addCategory = async (category: string) => {
    if (allCategories.includes(category) || !session?.user?.id) return;
    try {
      await supabase.from('categories').insert([{ 
          name: category,
          user_id: session.user.id
      }]);
      setCustomCategories(prev => [...prev, category]);
    } catch (err) {
      console.error('Error adding category:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm transition-colors duration-300">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
                src="https://i.imgur.com/iS5ZfNx.png" 
                alt="Ativva Logo" 
                className="w-16 h-16 object-contain rounded-lg"
            />
            <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">Ativva</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Finanças Inteligentes</p>
            </div>
          </div>

          <div className="hidden md:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
             <button
               onClick={() => setCurrentView('dashboard')}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                 currentView === 'dashboard' 
                   ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-white shadow-sm' 
                   : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
               }`}
             >
               <LayoutDashboard className="w-4 h-4" />
               Orçamento
             </button>
             <button
               onClick={() => setCurrentView('transactions')}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                 currentView === 'transactions' 
                   ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-white shadow-sm' 
                   : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
               }`}
             >
               <ListOrdered className="w-4 h-4" />
               Transações
             </button>
             <button
               onClick={() => setCurrentView('cards')}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                 currentView === 'cards' 
                   ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-white shadow-sm' 
                   : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
               }`}
             >
               <CardIcon className="w-4 h-4" />
               Cartões
             </button>
             <button
               onClick={() => setCurrentView('shopping')}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                 currentView === 'shopping' 
                   ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-white shadow-sm' 
                   : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
               }`}
             >
               <ShoppingCart className="w-4 h-4" />
               Compras
             </button>
          </div>
          
          <div className="flex items-center gap-3">
             <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={isDarkMode ? "Modo Claro" : "Modo Escuro"}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setIsPrivacyMode(!isPrivacyMode)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={isPrivacyMode ? "Mostrar valores" : "Ocultar valores"}
            >
              {isPrivacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>

            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => generateBudgetPDF(incomes, expenses, investments, scheduledEvents)}
              className="flex items-center gap-2 hidden sm:flex dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700"
              disabled={incomes.length === 0 && expenses.length === 0 && investments.length === 0 && scheduledEvents.length === 0}
            >
              <FileDown className="w-4 h-4" />
              <span>Relatório</span>
            </Button>

            <button
                onClick={handleLogout}
                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                title="Sair"
            >
                <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="md:hidden flex border-t border-slate-200 dark:border-slate-800 overflow-x-auto">
             <button
               onClick={() => setCurrentView('dashboard')}
               className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all whitespace-nowrap ${
                 currentView === 'dashboard' 
                   ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10' 
                   : 'text-slate-500 dark:text-slate-400'
               }`}
             >
               <LayoutDashboard className="w-4 h-4" />
               Orçamento
             </button>
             <button
               onClick={() => setCurrentView('transactions')}
               className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all whitespace-nowrap ${
                 currentView === 'transactions' 
                   ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10' 
                   : 'text-slate-500 dark:text-slate-400'
               }`}
             >
               <ListOrdered className="w-4 h-4" />
               Transações
             </button>
             <button
               onClick={() => setCurrentView('cards')}
               className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all whitespace-nowrap ${
                 currentView === 'cards' 
                   ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10' 
                   : 'text-slate-500 dark:text-slate-400'
               }`}
             >
               <CardIcon className="w-4 h-4" />
               Cartões
             </button>
             <button
               onClick={() => setCurrentView('shopping')}
               className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all whitespace-nowrap ${
                 currentView === 'shopping' 
                   ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10' 
                   : 'text-slate-500 dark:text-slate-400'
               }`}
             >
               <ShoppingCart className="w-4 h-4" />
               Compras
             </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300">
        {currentView === 'dashboard' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Renda Planejada</h3>
                  <PlusCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {displayValue(totalIncome)}
                </p>
              </div>
              
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Teto de Gastos</h3>
                  <TrendingDown className="w-5 h-5 text-rose-500" />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {displayValue(totalBudgetExpenses)}
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Investimentos Fixos</h3>
                  <PieChart className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {displayValue(totalInvestments)}
                </p>
              </div>

              <div className={`bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors ${freeCash < 0 ? 'border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-900' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Saldo Livre</h3>
                  <Wallet className="w-5 h-5 text-emerald-500" />
                </div>
                <p className={`text-2xl font-bold ${freeCash < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {displayValue(freeCash)}
                </p>
              </div>
            </div>

            <div className="mb-8">
              <AIAnalysis 
                incomes={incomes} 
                expenses={expenses} 
                investments={investments}
                balance={balance}
                isPrivacyEnabled={isPrivacyMode}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-8">
                <IncomeManager 
                  incomes={incomes} 
                  onAdd={addIncome} 
                  onRemove={removeIncome}
                  isPrivacyEnabled={isPrivacyMode} 
                />
                
                <ExpenseManager 
                  expenses={expenses} 
                  categories={allCategories}
                  onAdd={addExpense} 
                  onRemove={removeExpense}
                  onAddCategory={addCategory}
                  totalIncome={totalIncome}
                  totalExpenses={totalBudgetExpenses}
                  isPrivacyEnabled={isPrivacyMode}
                />

                <div className="grid grid-cols-1 gap-8">
                    <InvestmentManager
                        investments={investments}
                        scheduledEvents={scheduledEvents}
                        onAdd={addInvestment}
                        onAddOneTime={addScheduledEvent}
                        onRemove={removeInvestment}
                        onRemoveOneTime={removeScheduledEvent}
                        isPrivacyEnabled={isPrivacyMode}
                    />
                    <ScheduledEventManager
                        events={scheduledEvents}
                        onAdd={addScheduledEvent}
                        onRemove={removeScheduledEvent}
                        isPrivacyEnabled={isPrivacyMode}
                    />
                </div>
              </div>

              <div className="lg:col-span-5 space-y-8">
                <CashFlowForecast 
                  totalIncome={totalIncome}
                  totalExpenses={totalBudgetExpenses}
                  investments={investments}
                  scheduledEvents={scheduledEvents}
                  isDarkMode={isDarkMode}
                />
                <BudgetCharts 
                  incomes={incomes} 
                  expenses={expenses}
                  isPrivacyEnabled={isPrivacyMode}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>
          </>
        ) : currentView === 'cards' ? (
          <CreditCardManager 
             cards={cards}
             transactions={transactions}
             onAdd={addCard}
             onUpdate={updateCard}
             onRemove={removeCard}
             isPrivacyEnabled={isPrivacyMode}
          />
        ) : currentView === 'shopping' ? (
          <ShoppingList
             items={shoppingItems}
             shoppingHistory={shoppingHistory}
             onAdd={addShoppingItem}
             onUpdate={updateShoppingItem}
             onRemove={removeShoppingItem}
             onClearAll={clearShoppingList}
             onFinalize={finalizeShoppingList}
             history={priceHistory}
             onRemoveHistory={removeShoppingHistoryEntry}
             onUpdateHistory={updateShoppingHistoryEntry}
          />
        ) : (
          <TransactionsPage 
            transactions={transactions}
            categories={allCategories}
            cards={cards}
            onAdd={addTransaction}
            onUpdate={updateTransaction}
            onRemove={removeTransaction}
            isPrivacyEnabled={isPrivacyMode}
          />
        )}
      </main>
    </div>
  );
}
