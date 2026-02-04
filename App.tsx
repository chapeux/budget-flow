import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, Wallet, TrendingDown, PieChart, Loader2, FileDown, Eye, EyeOff, LogOut, Moon, Sun, LayoutDashboard, ListOrdered } from 'lucide-react';
import { IncomeManager } from './components/IncomeManager';
import { ExpenseManager } from './components/ExpenseManager';
import { InvestmentManager } from './components/InvestmentManager';
import { ScheduledEventManager } from './components/ScheduledEventManager';
import { BudgetCharts } from './components/BudgetCharts';
import { AIAnalysis } from './components/AIAnalysis';
import { CashFlowForecast } from './components/CashFlowForecast';
import { TransactionsPage } from './components/TransactionsPage';
import { Auth } from './components/Auth';
import { Income, Expense, Investment, ScheduledEvent, Transaction } from './types';
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

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]); // This is BUDGET
  const [transactions, setTransactions] = useState<Transaction[]>([]); // This is REALIZED
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([]);
  
  // Split categories into custom (fetched) and default
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'transactions'>('dashboard');
  
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
        setCustomCategories([]);
        
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
                transactionType: t.transaction_type || 'EXPENSE', // Default to expense if null/old
                date: t.date,
                referenceDate: t.reference_date // Map from snake_case DB to camelCase
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
    setCustomCategories([]);
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
        // Use referenceDate or fallback to date if not provided
        const refDate = transaction.referenceDate || transaction.date;

        const { data, error } = await supabase.from('transactions').insert([{
            description: transaction.description,
            amount: transaction.amount,
            category: transaction.category,
            type: transaction.type,
            transaction_type: transaction.transactionType, // New column
            date: transaction.date,
            reference_date: refDate, 
            user_id: session.user.id
        }])
        .select()
        .single();

        if (error) throw error;
        
        const newTrans = { ...transaction, id: data.id, referenceDate: refDate };
        setTransactions(prev => [...prev, newTrans]);
    } catch (err) {
        console.error('Error adding transaction:', err);
        // Optimistic update fallback (or error handling)
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
              date: updatedTrans.date,
              reference_date: updatedTrans.referenceDate 
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
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm transition-colors duration-300">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-2 rounded-lg shadow-sm">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">BudgetFlow AI</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Organize suas finanças</p>
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
               Orçamento (Meta)
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
               Transações (Real)
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
        
        <div className="md:hidden flex border-t border-slate-200 dark:border-slate-800">
             <button
               onClick={() => setCurrentView('dashboard')}
               className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
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
               className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all ${
                 currentView === 'transactions' 
                   ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10' 
                   : 'text-slate-500 dark:text-slate-400'
               }`}
             >
               <ListOrdered className="w-4 h-4" />
               Transações
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
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Teto de Gastos (Orçamento)</h3>
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
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Saldo Livre (Projetado)</h3>
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
        ) : (
          <TransactionsPage 
            transactions={transactions}
            categories={allCategories}
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