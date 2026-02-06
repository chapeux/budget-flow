import React, { useState, useMemo } from 'react';
import { 
  Upload, Search, Edit2, Trash2, X, Check, 
  Sparkles, Loader2, PlusCircle, ArrowUpCircle, ArrowDownCircle, ArrowRightCircle, 
  Wallet, TrendingUp, MoreVertical, ChevronRight, ChevronLeft, AlertCircle, CheckCircle2,
  Save, Wand2, Circle, Filter, ArrowLeftRight, XCircle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import * as pdfjsLib from 'pdfjs-dist';
import { Transaction, ExpenseType, TransactionType } from '../types';
import { Button } from './ui/Button';
import { suggestCategories, parseBankStatement } from '../services/aiService';

// Fix for pdfjs-dist import in ESM environments with safety check
try {
  const pdfjs = (pdfjsLib as any).default || pdfjsLib;
  if (pdfjs && pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
} catch (e) {
  console.warn('PDF Worker Init Failed', e);
}

interface TransactionsPageProps {
  transactions: Transaction[];
  categories: string[];
  onAdd: (transaction: Transaction) => void;
  onUpdate: (transaction: Transaction) => void;
  onRemove: (id: string) => void;
  isPrivacyEnabled: boolean;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#64748b'];

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  transactions,
  categories,
  onAdd,
  onUpdate,
  onRemove,
  isPrivacyEnabled
}) => {
  // UI States
  const [isImporting, setIsImporting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DONE' | 'PENDING'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  
  // Pending Card State
  const [pendingView, setPendingView] = useState<'EXPENSES' | 'INCOMES'>('EXPENSES');

  // Initialize with current month
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  // Import Logic States
  const [parsedTransactions, setParsedTransactions] = useState<Transaction[]>([]);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [importReferenceDate, setImportReferenceDate] = useState('');

  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});

  // Manual Add Form State
  const [newTransDescription, setNewTransDescription] = useState('');
  const [newTransAmount, setNewTransAmount] = useState('');
  const [newTransCategory, setNewTransCategory] = useState(categories[0] || 'Outros');
  const [newTransDate, setNewTransDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTransRefDate, setNewTransRefDate] = useState(new Date().toISOString().split('T')[0].slice(0, 7));
  const [newTransType, setNewTransType] = useState<ExpenseType>('VARIABLE');
  const [newTransKind, setNewTransKind] = useState<TransactionType>('EXPENSE');
  const [newTransStatus, setNewTransStatus] = useState<'DONE' | 'PENDING'>('DONE');

  // --- DATE NAVIGATION HANDLERS ---
  
  const handlePrevMonth = () => {
    const [y, m] = monthFilter.split('-').map(Number);
    const date = new Date(y, m - 1 - 1, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setMonthFilter(newMonth);
  };

  const handleNextMonth = () => {
    const [y, m] = monthFilter.split('-').map(Number);
    const date = new Date(y, m - 1 + 1, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setMonthFilter(newMonth);
  };

  const formatMonthDisplay = (isoMonth: string) => {
    if(!isoMonth) return '';
    const [y, m] = isoMonth.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    const str = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // --- DATA PROCESSING ---

  // Filter List for Display (Search/Category/Status/Type)
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Logic: Income uses 'date', Expense uses 'referenceDate' (competence)
      const dateToCheck = t.transactionType === 'INCOME' ? t.date : (t.referenceDate || t.date);
      const tMonth = dateToCheck ? dateToCheck.slice(0, 7) : '';
      
      const matchesMonth = monthFilter ? tMonth === monthFilter : true;
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategoryFilter ? t.category === selectedCategoryFilter : true;
      const matchesStatus = statusFilter === 'ALL' ? true : t.status === statusFilter;
      
      let matchesType = true;
      if (typeFilter === 'INCOME') matchesType = t.transactionType === 'INCOME';
      if (typeFilter === 'EXPENSE') matchesType = t.transactionType === 'EXPENSE' || t.transactionType === 'TRANSFER';

      return matchesMonth && matchesSearch && matchesCategory && matchesStatus && matchesType;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, monthFilter, searchTerm, selectedCategoryFilter, statusFilter, typeFilter]);

  // Balance Logic (Cumulative / Bank-like)
  // Calculates STRICTLY based on date strings to avoid timezone issues.
  const balanceInfo = useMemo(() => {
    if (!monthFilter) return { initial: 0, current: 0, forecast: 0 };
    
    // YYYY-MM
    const currentMonthKey = monthFilter;

    let initial = 0;
    let monthFlowRealized = 0;
    let monthFlowPending = 0;

    transactions.forEach(t => {
        const rawDate = t.transactionType === 'INCOME' ? t.date : (t.referenceDate || t.date);
        const tMonth = rawDate.slice(0, 7);
        
        // Calculate signed amount
        let val = 0;
        if (t.transactionType === 'INCOME') val = t.amount;
        else if (t.transactionType === 'EXPENSE' || t.transactionType === 'TRANSFER') val = -t.amount;

        // INITIAL: Strictly Before current month AND STATUS IS DONE
        if (tMonth < currentMonthKey && t.status === 'DONE') {
            initial += val;
        } 
        // CURRENT MONTH FLOW (Realized)
        else if (tMonth === currentMonthKey && t.status === 'DONE') {
            monthFlowRealized += val;
        }
        // CURRENT MONTH FLOW (Pending)
        else if (tMonth === currentMonthKey && t.status === 'PENDING') {
            monthFlowPending += val;
        }
    });

    const currentBalance = initial + monthFlowRealized;
    
    return {
        initial: initial,
        current: currentBalance,
        forecast: currentBalance + monthFlowPending
    };
  }, [transactions, monthFilter]);

  // Evolution Chart Data (Daily Expenses) - Includes PENDING? Probably yes to see projection.
  const evolutionData = useMemo(() => {
      if (!monthFilter || !/^\d{4}-\d{2}$/.test(monthFilter)) return [];

      const [yearStr, monthStr] = monthFilter.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);

      if (isNaN(year) || isNaN(month)) return [];

      const daysInMonth = new Date(year, month, 0).getDate();
      if (isNaN(daysInMonth) || daysInMonth <= 0) return [];

      const data = new Array(daysInMonth).fill(0).map((_, i) => ({ day: i + 1, amount: 0 }));
      
      filteredTransactions.forEach(t => {
          if (t.transactionType === 'EXPENSE' || t.transactionType === 'TRANSFER') {
              const tDate = new Date(t.date);
              if (!isNaN(tDate.getTime())) {
                const day = tDate.getDate(); 
                if (data[day - 1]) {
                    data[day - 1].amount += t.amount;
                }
              }
          }
      });
      
      return data.map(d => ({
          name: `${d.day < 10 ? '0' : ''}${d.day}/${monthStr}`,
          amount: d.amount
      }));
  }, [filteredTransactions, monthFilter]);

  // Summary Bar Chart Data
  const summaryData = useMemo(() => {
    const income = filteredTransactions
        .filter(t => t.transactionType === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);
        
    const expense = filteredTransactions
        .filter(t => t.transactionType === 'EXPENSE' || t.transactionType === 'TRANSFER')
        .reduce((sum, t) => sum + t.amount, 0);

    return [
        { name: 'Receitas', value: income, color: '#10b981' },
        { name: 'Despesas', value: expense, color: '#f43f5e' }
    ];
  }, [filteredTransactions]);

  // Pending Expenses Logic (Dynamic based on View)
  const pendingInfo = useMemo(() => {
      // Logic: Iterate over transactions for the current month
      // Filter based on pendingView state (Expenses or Incomes)
      
      const currentMonthKey = monthFilter;

      const relevantTransactions = transactions.filter(t => {
          const rawDate = t.transactionType === 'INCOME' ? t.date : (t.referenceDate || t.date);
          const tMonth = rawDate.slice(0, 7);
          return tMonth === currentMonthKey && t.status === 'PENDING';
      });

      const items = relevantTransactions.filter(t => {
          if (pendingView === 'EXPENSES') {
              return t.transactionType === 'EXPENSE' || t.transactionType === 'TRANSFER';
          } else {
              return t.transactionType === 'INCOME';
          }
      });

      return {
          count: items.length,
          total: items.reduce((sum, t) => sum + t.amount, 0)
      };
  }, [transactions, monthFilter, pendingView]);

  // Category Data for Donut
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    const expenses = filteredTransactions.filter(t => t.transactionType === 'EXPENSE' || t.transactionType === 'TRANSFER');
    const totalExp = expenses.reduce((s, t) => s + t.amount, 0);

    expenses.forEach(t => {
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    });
    
    return Array.from(map.entries()).map(([name, amount]) => ({
      name,
      value: amount,
      percent: totalExp > 0 ? (amount / totalExp) * 100 : 0
    })).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);


  // --- HANDLERS ---

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransDescription || !newTransAmount) return;

    let refDateIso = '';
    if (newTransKind === 'INCOME') {
        refDateIso = new Date(newTransDate).toISOString();
    } else {
        refDateIso = new Date(`${newTransRefDate}-01`).toISOString();
    }

    onAdd({
        id: crypto.randomUUID(),
        description: newTransDescription,
        amount: parseFloat(newTransAmount),
        category: newTransCategory,
        date: new Date(newTransDate).toISOString(),
        referenceDate: refDateIso,
        type: newTransType,
        transactionType: newTransKind,
        status: newTransStatus
    });

    setNewTransDescription('');
    setNewTransAmount('');
    setIsAdding(false);
  };

  const handleStatusToggle = (t: Transaction) => {
      onUpdate({
          ...t,
          status: t.status === 'DONE' ? 'PENDING' : 'DONE'
      });
  };

  const handleVerifyPending = () => {
    setStatusFilter('PENDING');
    setTypeFilter(pendingView === 'INCOMES' ? 'INCOME' : 'EXPENSE');
    // Also clear category search to ensure user sees results
    setSelectedCategoryFilter(null);
    setSearchTerm('');
  };
  
  const clearFilters = () => {
      setSearchTerm('');
      setStatusFilter('ALL');
      setTypeFilter('ALL');
      setSelectedCategoryFilter(null);
  };

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'ALL' || typeFilter !== 'ALL' || selectedCategoryFilter !== null;

  // ... (Parsing logic remains the same, assuming imports default to DONE) ...
  const parseCSV = (text: string) => {
    const lines = text.split('\n');
    const newTransactions: Transaction[] = [];

    lines.forEach(line => {
      const parts = line.split(/[;,]/);
      if (parts.length < 2) return;

      const cleanParts = parts.map(p => p.replace(/"/g, '').trim());
      
      let date = new Date().toISOString();
      let amount = 0;
      let description = '';
      let transType: TransactionType = 'EXPENSE';

      const datePart = cleanParts.find(p => !isNaN(Date.parse(p)) && p.includes('-'));
      if (datePart) date = new Date(datePart).toISOString();

      const amountPart = cleanParts.find(p => !isNaN(parseFloat(p.replace(',', '.'))) && p.length > 0);
      if (amountPart) {
          const val = parseFloat(amountPart.replace(',', '.'));
          amount = Math.abs(val);
          transType = val > 0 ? 'INCOME' : 'EXPENSE'; 
      }

      const descPart = cleanParts.find(p => p !== datePart && p !== amountPart && p.length > 3);
      description = descPart || 'Importado CSV';

      if (amount > 0) {
        newTransactions.push({
          id: crypto.randomUUID(),
          description: description,
          amount: amount,
          date: date,
          category: 'Outros',
          type: 'VARIABLE',
          transactionType: transType,
          status: 'DONE'
        });
      }
    });
    setParsedTransactions(newTransactions);
  };

  const parseOFX = (text: string) => {
    const newTransactions: Transaction[] = [];
    const transactions = text.split('<STMTTRN>');

    transactions.forEach(block => {
      if (!block.includes('</STMTTRN>')) return;

      const dateMatch = block.match(/<DTPOSTED>(.*?)(\r|\n|<)/);
      const amountMatch = block.match(/<TRNAMT>(.*?)(\r|\n|<)/);
      const memoMatch = block.match(/<MEMO>(.*?)(\r|\n|<)/);

      if (dateMatch && amountMatch) {
        const rawDate = dateMatch[1].trim().substring(0, 8); // YYYYMMDD
        const year = rawDate.substring(0, 4);
        const month = rawDate.substring(4, 6);
        const day = rawDate.substring(6, 8);
        const isoDate = `${year}-${month}-${day}T12:00:00.000Z`;

        const rawAmount = parseFloat(amountMatch[1].replace(',', '.'));
        const desc = memoMatch ? memoMatch[1].trim() : 'Transação Bancária';
        
        const type = rawAmount < 0 ? 'EXPENSE' : 'INCOME';

        newTransactions.push({
            id: crypto.randomUUID(),
            description: desc,
            amount: Math.abs(rawAmount),
            date: isoDate,
            category: 'Outros',
            type: 'VARIABLE',
            transactionType: type,
            status: 'DONE'
        });
      }
    });
    setParsedTransactions(newTransactions);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
        setIsParsingPdf(true);
        try {
            // @ts-ignore
            const pdfjs = (pdfjsLib as any).default || pdfjsLib;
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                // @ts-ignore
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += pageText + '\n';
            }
            const extractedData = await parseBankStatement(fullText, 'groq');
            const newTransactions = extractedData.map(item => ({
                id: crypto.randomUUID(),
                description: item.description || 'Transação PDF',
                amount: item.amount || 0,
                date: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
                category: 'Outros',
                type: 'VARIABLE' as ExpenseType,
                transactionType: (item.transactionType || 'EXPENSE') as TransactionType,
                status: 'DONE' as 'DONE' | 'PENDING'
            }));
            setParsedTransactions(newTransactions);
        } catch (error) {
            console.error(error);
            alert("Erro ao processar PDF.");
        } finally {
            setIsParsingPdf(false);
        }
    } else {
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (file.name.toLowerCase().endsWith('.ofx')) {
                parseOFX(text);
            } else {
                parseCSV(text);
            }
        };
        reader.readAsText(file);
    }
  };

  const handleAutoCategorize = async () => {
     if (parsedTransactions.length === 0) return;
     setIsCategorizing(true);
     try {
         const mapping = await suggestCategories(parsedTransactions.map(t => t.description), categories, 'groq');
         setParsedTransactions(prev => prev.map(t => ({ ...t, category: mapping[t.description] || t.category })));
     } finally { setIsCategorizing(false); }
  };

  const updateParsedTransaction = (index: number, field: keyof Transaction, value: any) => {
    setParsedTransactions(prev => {
        const newData = [...prev];
        newData[index] = { ...newData[index], [field]: value };
        return newData;
    });
  };

  const removeParsedTransaction = (index: number) => {
     setParsedTransactions(prev => prev.filter((_, i) => i !== index));
  };

  const confirmImport = () => {
    const transactionsToImport = parsedTransactions.map(t => {
        let refDate = t.date;
        if (t.transactionType !== 'INCOME' && importReferenceDate) {
            refDate = new Date(`${importReferenceDate}-01`).toISOString();
        }
        return { ...t, referenceDate: refDate };
    });
    transactionsToImport.forEach(t => onAdd(t));
    setParsedTransactions([]);
    setIsImporting(false);
  };

  const startEdit = (t: Transaction) => { setEditingId(t.id); setEditForm({...t}); };
  const saveEdit = (e: React.FormEvent) => { 
      e.preventDefault();
      if(editingId && editForm.description) { 
          onUpdate(editForm as Transaction); 
          setEditingId(null); 
      }
  };

  const displayValue = (val: number) => isPrivacyEnabled ? '••••••' : val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // --- RENDER ---

  return (
    <div className="space-y-6">
      
      {/* HEADER ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
         <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
             
             {/* MONTH NAVIGATOR */}
             <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white shadow-sm hover:shadow">
                    <ChevronLeft className="w-4 h-4"/>
                </button>
                <span className="px-4 text-sm font-semibold capitalize min-w-[140px] text-center text-slate-700 dark:text-white select-none">
                    {formatMonthDisplay(monthFilter)}
                </span>
                <button onClick={handleNextMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white shadow-sm hover:shadow">
                    <ChevronRight className="w-4 h-4"/>
                </button>
             </div>

             <div className="relative flex-1 md:w-64 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar transação..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
             </div>

             <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                 {/* TYPE FILTER */}
                 <div className="relative flex-1 sm:flex-none min-w-[140px]">
                     <select 
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as any)}
                        className={`w-full pl-3 pr-8 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-colors ${
                            typeFilter !== 'ALL'
                              ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300 font-medium'
                              : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                        }`}
                     >
                         <option value="ALL">Todos os Tipos</option>
                         <option value="INCOME">Receitas</option>
                         <option value="EXPENSE">Despesas</option>
                     </select>
                     <ArrowLeftRight className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                         typeFilter !== 'ALL' ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400'
                     }`} />
                 </div>

                 {/* STATUS FILTER */}
                 <div className="relative flex-1 sm:flex-none min-w-[140px]">
                     <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className={`w-full pl-3 pr-8 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none transition-colors ${
                            statusFilter !== 'ALL'
                              ? 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300 font-medium'
                              : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                        }`}
                     >
                         <option value="ALL">Todos Status</option>
                         <option value="DONE">Efetivadas</option>
                         <option value="PENDING">Pendentes</option>
                     </select>
                     <Filter className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                         statusFilter !== 'ALL' ? 'text-orange-500 dark:text-orange-400' : 'text-slate-400'
                     }`} />
                 </div>

                 {/* CLEAR FILTERS BUTTON */}
                 {hasActiveFilters && (
                    <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                        title="Limpar todos os filtros"
                    >
                        <XCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Limpar</span>
                    </button>
                 )}
             </div>
         </div>
         <div className="flex gap-2 w-full md:w-auto">
             <Button onClick={() => setIsImporting(!isImporting)} variant="secondary" size="sm">
                <Upload className="w-4 h-4 mr-2" /> Importar
             </Button>
             <Button onClick={() => setIsAdding(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 p-0 flex items-center justify-center md:w-auto md:h-auto md:px-4 md:py-2 md:rounded-lg">
                <PlusCircle className="w-5 h-5 md:mr-2" /> <span className="hidden md:inline">Nova Transação</span>
             </Button>
         </div>
      </div>

      {/* IMPORT MODAL */}
      {isImporting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4 flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600">
                  <Upload className="w-5 h-5" />
                </div>
                Importar Transações
              </h3>
              <button onClick={() => { setIsImporting(false); setParsedTransactions([]); }} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1">
              {parsedTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
                  <input 
                    type="file" 
                    accept=".csv,.ofx,.pdf" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {isParsingPdf ? (
                     <div className="flex flex-col items-center">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                        <p className="text-slate-600 dark:text-slate-300 font-medium">Processando PDF com IA...</p>
                        <p className="text-xs text-slate-400 mt-2">Isso pode levar alguns segundos.</p>
                     </div>
                  ) : (
                      <>
                        <Upload className="w-12 h-12 text-slate-400 mb-4" />
                        <p className="text-slate-700 dark:text-slate-300 font-medium text-lg">Clique ou arraste o arquivo aqui</p>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Suporta OFX, CSV e PDF (Faturas)</p>
                      </>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Actions Bar */}
                  <div className="flex flex-wrap gap-4 items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                     <div className="flex items-center gap-4">
                        <div className="text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Total:</span>
                            <span className="ml-2 font-bold text-slate-900 dark:text-white">{parsedTransactions.length} transações</span>
                        </div>
                        <div className="text-sm flex items-center gap-2">
                             <span className="text-slate-500 dark:text-slate-400">Ref:</span>
                             <input 
                                type="month" 
                                value={importReferenceDate}
                                onChange={(e) => setImportReferenceDate(e.target.value)}
                                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm"
                             />
                        </div>
                     </div>
                     <div className="flex gap-2">
                        <Button onClick={handleAutoCategorize} variant="secondary" size="sm" disabled={isCategorizing}>
                            {isCategorizing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Sparkles className="w-4 h-4 mr-2 text-purple-500"/>}
                            {isCategorizing ? 'Categorizando...' : 'Categorizar com IA'}
                        </Button>
                        <Button onClick={confirmImport} size="sm">
                            <Check className="w-4 h-4 mr-2" /> Confirmar Importação
                        </Button>
                     </div>
                  </div>

                  {/* List */}
                  <div className="space-y-2">
                      {parsedTransactions.map((t, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row gap-3 items-center p-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                              <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">
                                  {t.transactionType === 'INCOME' ? <ArrowUpCircle className="w-4 h-4 text-emerald-500"/> : <ArrowDownCircle className="w-4 h-4 text-rose-500"/>}
                              </div>
                              <input 
                                className="flex-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none text-slate-800 dark:text-slate-200"
                                value={t.description}
                                onChange={(e) => updateParsedTransaction(idx, 'description', e.target.value)}
                              />
                              <input 
                                type="date"
                                className="w-32 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none text-slate-600 dark:text-slate-400"
                                value={t.date.split('T')[0]}
                                onChange={(e) => updateParsedTransaction(idx, 'date', new Date(e.target.value).toISOString())}
                              />
                              <div className="relative w-32">
                                  <input 
                                    className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none font-medium text-right"
                                    value={t.amount}
                                    type="number"
                                    onChange={(e) => updateParsedTransaction(idx, 'amount', parseFloat(e.target.value))}
                                  />
                              </div>
                              <select 
                                className="w-32 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none text-slate-600 dark:text-slate-400"
                                value={t.category}
                                onChange={(e) => updateParsedTransaction(idx, 'category', e.target.value)}
                              >
                                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <button onClick={() => removeParsedTransaction(idx)} className="text-slate-400 hover:text-rose-500 p-1">
                                  <Trash2 className="w-4 h-4"/>
                              </button>
                          </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MANUAL ADD MODAL/PANEL */}
      {isAdding && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600">
                            <PlusCircle className="w-5 h-5" />
                        </div>
                        Nova Transação
                    </h3>
                    <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="col-span-2 flex gap-2 mb-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                         {(['EXPENSE', 'INCOME', 'TRANSFER'] as const).map(k => (
                             <button
                                key={k} type="button" onClick={() => setNewTransKind(k)}
                                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${newTransKind === k ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                             >
                                 {k === 'EXPENSE' ? <ArrowDownCircle className="w-4 h-4 text-rose-500"/> : k === 'INCOME' ? <ArrowUpCircle className="w-4 h-4 text-emerald-500"/> : <ArrowRightCircle className="w-4 h-4 text-blue-500"/>}
                                 {k === 'EXPENSE' ? 'Despesa' : k === 'INCOME' ? 'Receita' : 'Transferência'}
                             </button>
                         ))}
                     </div>
                     <div className="col-span-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Descrição</label>
                        <input type="text" required className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" value={newTransDescription} onChange={e => setNewTransDescription(e.target.value)} />
                     </div>
                     <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">Valor</label>
                        <input type="number" step="0.01" required className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" value={newTransAmount} onChange={e => setNewTransAmount(e.target.value)} />
                     </div>
                     <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">Categoria</label>
                        <select className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" value={newTransCategory} onChange={e => setNewTransCategory(e.target.value)}>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase">Data Real</label>
                        <input type="date" required className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" value={newTransDate} onChange={e => setNewTransDate(e.target.value)} />
                     </div>
                     {newTransKind !== 'INCOME' && (
                         <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase">Data Referência</label>
                            <input type="month" required className="w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" value={newTransRefDate} onChange={e => setNewTransRefDate(e.target.value)} />
                         </div>
                     )}
                     
                     {/* STATUS CHECKBOX */}
                     <div className="col-span-2">
                        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={newTransStatus === 'DONE'}
                                onChange={(e) => setNewTransStatus(e.target.checked ? 'DONE' : 'PENDING')}
                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">Transação Efetivada?</span>
                                <span className="text-xs text-slate-500">Se desmarcado, ficará como pendente e entrará apenas no saldo previsto.</span>
                            </div>
                        </label>
                     </div>

                     <div className="col-span-2 pt-4 flex gap-3">
                         <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsAdding(false)}>Cancelar</Button>
                         <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">Salvar Transação</Button>
                     </div>
                </form>
            </div>
          </div>
      )}

      {/* DASHBOARD GRID START */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* ROW 1: STATUS, CHART, PENDING */}
        
        {/* COL 1: Vertical Balance */}
        <div className="md:col-span-3 bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden">          
            <div className="relative z-10 space-y-8">
                {/* Initial */}
                <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-700">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-400 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Inicial</p>
                    <p className="text-xl font-bold text-slate-600 dark:text-slate-300">{displayValue(balanceInfo.initial)}</p>
                </div>

                {/* Current */}
                <div className="relative pl-6 border-l-2 border-blue-500">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-white dark:border-slate-900"></div>
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900 animate-pulse"></div>
                    <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">Saldo acumulado (Efetivado)</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{displayValue(balanceInfo.current)}</p>
                </div>

                {/* Forecast */}
                <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-700 border-dashed">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900"></div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Previsto (Com Pendentes)</p>
                    <p className="text-xl font-bold text-slate-500 dark:text-slate-400">{displayValue(balanceInfo.forecast)}</p>
                </div>
            </div>
        </div>

        {/* COL 2: Evolution Chart */}
        <div className="md:col-span-5 bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">Evolução das despesas</h3>
                <MoreVertical className="w-4 h-4 text-slate-400 cursor-pointer" />
            </div>
            <div className="flex-1 min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={evolutionData}>
                        <defs>
                            <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} interval={4} />
                        <RechartsTooltip 
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                            formatter={(value: number) => [`R$ ${value}`, 'Gasto']}
                        />
                        <Area type="monotone" dataKey="amount" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* COL 3: Pending Card */}
        <div className="md:col-span-4 bg-white dark:bg-slate-900 rounded-xl p-0 shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="flex border-b border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => setPendingView('EXPENSES')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                    pendingView === 'EXPENSES' 
                      ? 'text-rose-500 border-rose-500 bg-rose-50 dark:bg-rose-900/10' 
                      : 'text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Despesas
                </button>
                <button 
                  onClick={() => setPendingView('INCOMES')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                    pendingView === 'INCOMES' 
                      ? 'text-emerald-500 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' 
                      : 'text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Receitas
                </button>
            </div>
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                  pendingView === 'EXPENSES' ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'
                }`}>
                    <AlertCircle className={`w-6 h-6 ${pendingView === 'EXPENSES' ? 'text-rose-500' : 'text-emerald-500'}`} />
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm mb-1">
                    Você tem <strong className="text-slate-900 dark:text-white">
                      {pendingInfo.count} {pendingView === 'EXPENSES' ? 'despesas' : 'receitas'} pendentes
                    </strong>
                </p>
                <p className="text-xs text-slate-400 mb-4">
                    no total de <strong className={pendingView === 'EXPENSES' ? 'text-rose-500' : 'text-emerald-500'}>{displayValue(pendingInfo.total)}</strong>
                </p>
                <Button 
                  onClick={handleVerifyPending}
                  variant="secondary" 
                  size="sm" 
                  className={`rounded-full px-6 transition-colors ${
                    pendingView === 'EXPENSES' 
                      ? 'border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300' 
                      : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300'
                  }`}
                >
                    Verificar
                </Button>
            </div>
        </div>

        {/* ROW 2: GENERAL OVERVIEW CARDS */}
        <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
             {/* General Balance (Accounts) */}
             <div className="bg-blue-500 text-white p-5 rounded-xl shadow-md relative overflow-hidden group">
                 <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Wallet className="w-16 h-16 text-white"/></div>
                 <p className="text-blue-100 text-xs font-medium mb-1">Contas</p>
                 <h4 className="text-2xl font-bold">{displayValue(balanceInfo.current)}</h4>
                 <p className="text-blue-100 text-xs mt-2 opacity-80">Saldo efetivado acumulado</p>
             </div>

             {/* Incomes */}
             <div className="bg-emerald-500 text-white p-5 rounded-xl shadow-md relative overflow-hidden group">
                 <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><ArrowUpCircle className="w-16 h-16 text-white"/></div>
                 <div className="flex justify-between items-start">
                    <div>
                        <p className="text-emerald-100 text-xs font-medium mb-1">Receitas</p>
                        <h4 className="text-2xl font-bold">{displayValue(filteredTransactions.filter(t => t.transactionType === 'INCOME').reduce((s, t) => s + t.amount, 0))}</h4>
                    </div>
                 </div>
             </div>

             {/* Expenses */}
             <div className="bg-rose-500 text-white p-5 rounded-xl shadow-md relative overflow-hidden group">
                 <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><ArrowDownCircle className="w-16 h-16 text-white"/></div>
                 <div className="flex justify-between items-start">
                    <div>
                        <p className="text-rose-100 text-xs font-medium mb-1">Despesas</p>
                        <h4 className="text-2xl font-bold">{displayValue(filteredTransactions.filter(t => t.transactionType === 'EXPENSE' || t.transactionType === 'TRANSFER').reduce((s, t) => s + t.amount, 0))}</h4>
                    </div>
                 </div>
             </div>

             {/* Balance Month */}
             <div className="bg-amber-400 text-white p-5 rounded-xl shadow-md relative overflow-hidden group">
                 <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp className="w-16 h-16 text-white"/></div>
                 <p className="text-amber-100 text-xs font-medium mb-1">Balanço (Mês)</p>
                 <h4 className="text-2xl font-bold">
                    {displayValue(
                        filteredTransactions.filter(t => t.transactionType === 'INCOME').reduce((s, t) => s + t.amount, 0) - 
                        filteredTransactions.filter(t => t.transactionType === 'EXPENSE' || t.transactionType === 'TRANSFER').reduce((s, t) => s + t.amount, 0)
                    )}
                 </h4>
                 <p className="text-amber-100 text-xs mt-2 opacity-80">Receitas - Despesas</p>
             </div>
        </div>

        {/* ROW 3: LIST AND PIE */}
        
        {/* COL 1: Transactions List (Styled as 'Contas') */}
        <div className="md:col-span-8 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Transações</h3>
                <MoreVertical className="w-4 h-4 text-slate-400" />
            </div>
            
            {/* Added scroll container and removed slice */}
            <div className="overflow-y-auto custom-scrollbar h-[600px]">
                <table className="w-full text-left text-sm relative">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase font-medium sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                            <th className="px-6 py-4">Descrição / Conta</th>
                            <th className="px-6 py-4">Categoria</th>
                            <th className="px-6 py-4 text-center">Tipo</th>
                            <th className="px-6 py-4 text-right">Valor</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${t.transactionType === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'} dark:bg-slate-800`}>
                                            {t.transactionType === 'INCOME' ? <ArrowUpCircle className="w-4 h-4"/> : <ArrowDownCircle className="w-4 h-4"/>}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800 dark:text-white">{t.description}</p>
                                            <p className="text-xs text-slate-500">{new Date(t.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs border border-slate-200 dark:border-slate-700">{t.category}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {t.transactionType === 'TRANSFER' && <span className="text-xs font-bold text-blue-500">Transf.</span>}
                                    {t.transactionType === 'INCOME' && <span className="text-xs font-bold text-emerald-500">Receita</span>}
                                    {t.transactionType === 'EXPENSE' && <span className="text-xs font-bold text-rose-500">Despesa</span>}
                                </td>
                                <td className={`px-6 py-4 text-right font-bold ${t.transactionType === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {displayValue(t.amount)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => handleStatusToggle(t)}
                                        className={`transition-all duration-200 p-1 rounded-full ${
                                            t.status === 'DONE' 
                                            ? 'text-emerald-600 bg-emerald-100 hover:bg-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30' 
                                            : 'text-slate-400 bg-slate-100 hover:bg-slate-200 dark:text-slate-500 dark:bg-slate-800 dark:hover:bg-slate-700'
                                        }`}
                                        title={t.status === 'DONE' ? "Marcar como pendente" : "Marcar como efetivada"}
                                    >
                                        {t.status === 'DONE' ? <CheckCircle2 className="w-5 h-5"/> : <Circle className="w-5 h-5"/>}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => startEdit(t)} className="text-slate-400 hover:text-blue-500 transition-colors" title="Editar"><Edit2 className="w-4 h-4"/></button>
                                        <button onClick={() => onRemove(t.id)} className="text-slate-400 hover:text-rose-500 transition-colors" title="Remover"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredTransactions.length === 0 && (
                    <div className="p-8 text-center text-slate-500">Nenhuma transação encontrada.</div>
                )}
            </div>
        </div>

        {/* COL 2: Charts Column */}
        <div className="md:col-span-4 flex flex-col gap-6">
            
            {/* Chart 1: Donut */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Despesas por categoria</h3>
                    <div className="flex gap-2">
                        <button className="text-slate-400 hover:text-slate-600"><Upload className="w-4 h-4" /></button>
                        <button className="text-slate-400 hover:text-slate-600"><MoreVertical className="w-4 h-4" /></button>
                    </div>
                </div>
                <div className="flex-1 relative">
                    {isPrivacyEnabled && (
                        <div className="absolute inset-0 z-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-slate-400" />
                        </div>
                    )}
                    {categoryData.length > 0 ? (
                        <div className="h-[250px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value: number) => displayValue(value)} />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <p className="text-xs text-slate-500">Total</p>
                                <p className="text-lg font-bold text-slate-800 dark:text-white">
                                    {displayValue(categoryData.reduce((a, b) => a + b.value, 0))}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
                    )}
                </div>
                <div className="mt-6 space-y-3">
                    {categoryData.slice(0, 4).map((c, i) => (
                        <div key={c.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                                <span className="text-slate-600 dark:text-slate-300">{c.name}</span>
                            </div>
                            <span className="font-medium text-slate-500 dark:text-slate-400">{Math.round(c.percent)}%</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chart 2: Summary Bar Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col flex-1 min-h-[300px]">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Resumo do Período</h3>
                <div className="flex-1 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={summaryData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} tickFormatter={(val) => `R$${val/1000}k`} />
                            <RechartsTooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                formatter={(value: number) => [displayValue(value), 'Valor']}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                {summaryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};
