import React, { useState, useMemo } from 'react';
import { Upload, FileText, Calendar, Tag, DollarSign, Search, Edit2, Trash2, X, Check, Sparkles, Loader2, PlusCircle, Filter, ArrowUpCircle, ArrowDownCircle, ArrowRightCircle, Wallet } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { Transaction, ExpenseType, TransactionType } from '../types';
import { Button } from './ui/Button';
import { suggestCategories, parseBankStatement } from '../services/aiService';

// Fix for pdfjs-dist import in ESM environments
const pdfjs = (pdfjsLib as any).default || pdfjsLib;

// Use cdnjs for the worker to avoid "importScripts" errors with esm.sh or local path resolution issues
if (pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

interface TransactionsPageProps {
  transactions: Transaction[];
  categories: string[];
  onAdd: (transaction: Transaction) => void;
  onUpdate: (transaction: Transaction) => void;
  onRemove: (id: string) => void;
  isPrivacyEnabled: boolean;
}

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
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // Default current YYYY-MM
  
  // Import Logic States
  const [parsedTransactions, setParsedTransactions] = useState<Transaction[]>([]);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [importReferenceDate, setImportReferenceDate] = useState(''); // YYYY-MM

  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});

  // Manual Add Form State
  const [newTransDescription, setNewTransDescription] = useState('');
  const [newTransAmount, setNewTransAmount] = useState('');
  const [newTransCategory, setNewTransCategory] = useState(categories[0] || 'Outros');
  const [newTransDate, setNewTransDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTransRefDate, setNewTransRefDate] = useState(new Date().toISOString().split('T')[0].slice(0, 7)); // YYYY-MM
  const [newTransType, setNewTransType] = useState<ExpenseType>('VARIABLE');
  const [newTransKind, setNewTransKind] = useState<TransactionType>('EXPENSE');

  // ---------------- MANUAL ADD LOGIC ----------------

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransDescription || !newTransAmount) return;

    // Logic: If Income, Reference Date is ignored (set to actual date)
    // If Expense, Reference Date is used (for credit card bills, etc)
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
        transactionType: newTransKind
    });

    // Reset form
    setNewTransDescription('');
    setNewTransAmount('');
    setIsAdding(false);
  };

  // ---------------- IMPORT LOGIC ----------------

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        // Use pdfjs.getDocument instead of named import
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
        return fullText;
    } catch (error) {
        console.error("PDF Extraction Error:", error);
        throw new Error("Falha ao extrair texto do PDF. Verifique se o arquivo não está corrompido.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
        setIsParsingPdf(true);
        try {
            const text = await extractTextFromPDF(file);
            // Switch to Groq for PDF Parsing
            const extractedData = await parseBankStatement(text, 'groq');
            
            const newTransactions: Transaction[] = extractedData.map(item => ({
                id: crypto.randomUUID(),
                description: item.description || 'Transação PDF',
                amount: item.amount || 0,
                date: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
                category: 'Outros',
                type: 'VARIABLE',
                transactionType: item.transactionType || 'EXPENSE'
            }));
            
            setParsedTransactions(newTransactions);
        } catch (error) {
            console.error(error);
            alert("Erro ao processar PDF. Tente um arquivo diferente ou use CSV/OFX.");
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
          transactionType: transType
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
            transactionType: type
        });
      }
    });
    setParsedTransactions(newTransactions);
  };

  const confirmImport = () => {
    const transactionsToImport = parsedTransactions.map(t => {
        // If income, force refDate = date, else allow override
        let refDate = t.date;
        if (t.transactionType !== 'INCOME' && importReferenceDate) {
            refDate = new Date(`${importReferenceDate}-01`).toISOString();
        }
        return { ...t, referenceDate: refDate };
    });

    transactionsToImport.forEach(t => onAdd(t));
    setParsedTransactions([]);
    setIsImporting(false);
    setImportReferenceDate('');
  };

  const handleAutoCategorize = async () => {
    if (parsedTransactions.length === 0) return;
    
    setIsCategorizing(true);
    try {
        const descriptions = parsedTransactions.map(t => t.description);
        // Switch to Groq for Categorization
        const mapping = await suggestCategories(descriptions, categories, 'groq');
        
        setParsedTransactions(prev => prev.map(t => ({
            ...t,
            category: mapping[t.description] || t.category
        })));
    } catch (err) {
        console.error("Error auto categorizing", err);
        alert("Erro ao categorizar automaticamente. Tente novamente.");
    } finally {
        setIsCategorizing(false);
    }
  };

  // ---------------- EDIT LOGIC ----------------

  const startEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditForm({ ...transaction });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = () => {
    if (editingId && editForm.description && editForm.amount) {
      // Logic adjustment for Edit: If switched to Income, ensure refDate matches Date? 
      // Or trust user input. For safety, if user edits to Income, we can visually hide refDate but in DB keep it.
      // But let's try to align logic:
      let finalTrans = { ...editForm } as Transaction;
      if (finalTrans.transactionType === 'INCOME') {
          // Sync ref date to date for consistency if logic requires
           finalTrans.referenceDate = finalTrans.date;
      }
      onUpdate(finalTrans);
      setEditingId(null);
      setEditForm({});
    }
  };

  // ---------------- CALCULATIONS ----------------

  // 1. Global Balance (All time)
  const globalBalance = useMemo(() => {
    return transactions.reduce((acc, t) => {
        if (t.transactionType === 'INCOME') return acc + t.amount;
        // Treat transfers as money leaving the 'wallet' view if it's external, or just expense-like
        if (t.transactionType === 'EXPENSE' || t.transactionType === 'TRANSFER') return acc - t.amount;
        return acc;
    }, 0);
  }, [transactions]);

  // 2. Filtered for Table & Monthly Stats
  const filteredTransactions = transactions.filter(t => {
    // If Income, filter by DATE. If Expense/Transfer, filter by REFERENCE DATE.
    const dateToCheck = t.transactionType === 'INCOME' ? t.date : (t.referenceDate || t.date);
    const tMonth = dateToCheck.slice(0, 7); 
    
    const matchesMonth = monthFilter ? tMonth === monthFilter : true;
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategoryFilter ? t.category === selectedCategoryFilter : true;
    
    return matchesMonth && matchesSearch && matchesCategory;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const monthIncome = filteredTransactions
    .filter(t => t.transactionType === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthExpense = filteredTransactions
    .filter(t => t.transactionType === 'EXPENSE' || t.transactionType === 'TRANSFER')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthResult = monthIncome - monthExpense;

  const categorySummary = useMemo(() => {
    const map = new Map<string, number>();
    // Summarize expenses/transfers for the pie chart logic
    filteredTransactions.filter(t => t.transactionType === 'EXPENSE' || t.transactionType === 'TRANSFER').forEach(t => {
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    });
    
    return Array.from(map.entries()).map(([name, amount]) => ({
      name,
      amount,
      percentage: monthExpense > 0 ? (amount / monthExpense) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, monthExpense]);

  // ---------------- RENDER ----------------

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* LEFT COLUMN: List & Actions */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Info Banner - BANK STYLE */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             {/* Global Balance Card */}
             <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm col-span-1 md:col-span-4 lg:col-span-4 flex justify-between items-center transition-colors">
                <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                            <Wallet className="w-4 h-4" /> 
                        </div>
                        Saldo Total (Acumulado)
                    </p>
                    <p className={`text-4xl font-bold tracking-tight ${globalBalance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isPrivacyEnabled ? '••••••' : globalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
                <div className="text-right hidden sm:block">
                     <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-1">Visualizando Mês</p>
                     <div className="inline-flex items-center px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium capitalize">
                        <Calendar className="w-3.5 h-3.5 mr-2 text-slate-400" />
                        {new Date(monthFilter + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                     </div>
                </div>
             </div>

             {/* Monthly Stats Row */}
             <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm col-span-1 md:col-span-4 grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 transition-colors">
                <div className="text-center px-2">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 uppercase font-bold mb-1">Entradas (Mês)</p>
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                        {isPrivacyEnabled ? '••••' : monthIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
                <div className="text-center px-2">
                    <p className="text-xs text-rose-600 dark:text-rose-400 uppercase font-bold mb-1">Saídas (Mês)</p>
                    <p className="text-lg font-bold text-rose-700 dark:text-rose-300">
                        {isPrivacyEnabled ? '••••' : monthExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
                <div className="text-center px-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">Resultado (Mês)</p>
                    <p className={`text-lg font-bold ${monthResult >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isPrivacyEnabled ? '••••' : (monthResult > 0 ? '+' : '') + monthResult.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
             </div>
        </div>

        {/* Manual Entry Form */}
        {isAdding && (
             <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                        <PlusCircle className="w-5 h-5 text-emerald-600" />
                        Nova Transação
                    </h3>
                    <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                     <div className="md:col-span-12 mb-2">
                        <label className="block text-xs font-medium text-slate-500 mb-2">Tipo de Operação</label>
                        <div className="flex gap-2">
                            <button 
                                type="button" 
                                onClick={() => setNewTransKind('EXPENSE')}
                                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${newTransKind === 'EXPENSE' ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                            >
                                <ArrowDownCircle className="w-4 h-4" /> Despesa
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setNewTransKind('INCOME')}
                                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${newTransKind === 'INCOME' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                            >
                                <ArrowUpCircle className="w-4 h-4" /> Receita
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setNewTransKind('TRANSFER')}
                                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${newTransKind === 'TRANSFER' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                            >
                                <ArrowRightCircle className="w-4 h-4" /> Transferência
                            </button>
                        </div>
                     </div>

                    <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Descrição</label>
                        <input 
                            type="text" required
                            value={newTransDescription}
                            onChange={(e) => setNewTransDescription(e.target.value)}
                            className="w-full rounded-md border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-sm"
                            placeholder={newTransKind === 'INCOME' ? "Ex: Salário, Pix recebido" : "Ex: Almoço, Uber"}
                        />
                    </div>
                    <div className="md:col-span-3">
                         <label className="block text-xs font-medium text-slate-500 mb-1">Categoria</label>
                         <select 
                            value={newTransCategory}
                            onChange={(e) => setNewTransCategory(e.target.value)}
                            className="w-full rounded-md border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-sm"
                         >
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Valor (R$)</label>
                        <input 
                            type="number" step="0.01" required
                            value={newTransAmount}
                            onChange={(e) => setNewTransAmount(e.target.value)}
                            className="w-full rounded-md border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-sm"
                            placeholder="0.00"
                        />
                    </div>
                    <div className="md:col-span-2">
                         <label className="block text-xs font-medium text-slate-500 mb-1">Data Real</label>
                         <input 
                            type="date" required
                            value={newTransDate}
                            onChange={(e) => setNewTransDate(e.target.value)}
                            className="w-full rounded-md border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-sm"
                         />
                    </div>
                    
                    {/* Only show Reference Month if NOT Income */}
                    {newTransKind !== 'INCOME' && (
                        <div className="md:col-span-4">
                             <label className="block text-xs font-medium text-slate-500 mb-1">Referência (Fatura/Competência)</label>
                             <input 
                                type="month" required
                                value={newTransRefDate}
                                onChange={(e) => setNewTransRefDate(e.target.value)}
                                className="w-full rounded-md border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 text-sm"
                             />
                        </div>
                    )}

                    <div className="md:col-span-12 flex justify-end gap-2 mt-2">
                         <Button type="button" variant="secondary" onClick={() => setIsAdding(false)} size="sm">Cancelar</Button>
                         <Button type="submit" size="sm">Salvar</Button>
                    </div>
                </form>
             </div>
        )}

        {/* Actions Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-20 z-10">
          <div className="flex gap-2 w-full md:w-auto flex-wrap md:flex-nowrap">
              {!isAdding && (
                  <Button onClick={() => setIsAdding(true)} className="whitespace-nowrap">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Nova
                  </Button>
              )}
              
              {/* Reference Month Filter */}
              <div className="relative">
                 <input 
                    type="month"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="pl-3 pr-2 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 dark:text-slate-200"
                    title="Filtrar por Mês de Referência"
                 />
              </div>

              <div className="relative w-full md:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
          </div>
          
          <Button onClick={() => setIsImporting(!isImporting)} variant="secondary" className="w-full md:w-auto">
             <Upload className="w-4 h-4 mr-2" />
             Importar
          </Button>
        </div>

        {/* Import Panel */}
        {isImporting && (
           <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-4">
              <div className="flex justify-between items-start mb-4">
                 <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    Importação em Lote (PDF/OFX/CSV)
                 </h3>
                 <button onClick={() => setIsImporting(false)} className="text-slate-400 hover:text-rose-500"><X className="w-5 h-5" /></button>
              </div>

              {/* Reference Date Input */}
              <div className="mb-4 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center gap-4">
                 <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Mês/Ano de Referência (Apenas para Despesas/Faturas)
                    </label>
                    <input 
                        type="month" 
                        value={importReferenceDate}
                        onChange={(e) => setImportReferenceDate(e.target.value)}
                        className="w-full rounded-md border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm p-2"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                        Se selecionado, a "Data de Compra" será mantida original, mas a "Data de Referência" será o dia 1 deste mês (Para Receitas, será mantida a data real).
                    </p>
                 </div>
              </div>

              {parsedTransactions.length === 0 ? (
                 isParsingPdf ? (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
                        <p>Lendo PDF e processando com IA...</p>
                    </div>
                 ) : (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center bg-white dark:bg-slate-900/50">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 mb-4">Arraste seu arquivo .pdf, .csv ou .ofx aqui</p>
                    <input 
                        type="file" 
                        accept=".csv,.ofx,.pdf" 
                        onChange={handleFileUpload} 
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                </div>
                 )
              ) : (
                <div>
                   <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-3">
                      <span className="text-sm font-medium text-emerald-600">{parsedTransactions.length} transações encontradas</span>
                      <div className="flex gap-2 flex-wrap justify-end">
                         <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={handleAutoCategorize}
                            disabled={isCategorizing}
                            className="text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
                         >
                            {isCategorizing ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4 mr-2" />
                            )}
                            Identificar (IA)
                         </Button>
                         <Button size="sm" variant="ghost" onClick={() => setParsedTransactions([])}>Limpar</Button>
                         <Button size="sm" onClick={confirmImport}>Confirmar Importação</Button>
                      </div>
                   </div>
                   <div className="max-h-60 overflow-y-auto custom-scrollbar border rounded-lg bg-white dark:bg-slate-900">
                      <table className="w-full text-sm text-left">
                         <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10">
                            <tr>
                               <th className="px-3 py-2">Data Real</th>
                               <th className="px-3 py-2">Descrição</th>
                               <th className="px-3 py-2">Tipo</th>
                               <th className="px-3 py-2">Categoria</th>
                               <th className="px-3 py-2 text-right">Valor</th>
                            </tr>
                         </thead>
                         <tbody>
                            {parsedTransactions.map((t, idx) => (
                               <tr key={idx} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                  <td className="px-3 py-2">
                                    {new Date(t.date).toLocaleDateString()}
                                  </td>
                                  <td className="px-3 py-2">{t.description}</td>
                                  <td className="px-3 py-2">
                                      {t.transactionType === 'INCOME' ? (
                                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Entrada</span>
                                      ) : t.transactionType === 'TRANSFER' ? (
                                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Transf.</span>
                                      ) : (
                                          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">Saída</span>
                                      )}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className={`px-2 py-0.5 rounded text-xs border ${t.category === 'Outros' ? 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400' : 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                                        {t.category}
                                    </span>
                                  </td>
                                  <td className={`px-3 py-2 text-right font-medium ${t.transactionType === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                     {t.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
              )}
           </div>
        )}

        {/* Filter Indicator */}
        {selectedCategoryFilter && (
            <div className="flex items-center gap-2 mb-2 animate-in fade-in slide-in-from-left-2">
                <span className="text-sm text-slate-500">Filtrando por:</span>
                <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                    {selectedCategoryFilter}
                    <button onClick={() => setSelectedCategoryFilter(null)} className="hover:text-indigo-900"><X className="w-3 h-3" /></button>
                </span>
            </div>
        )}

        {/* Main Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
                 <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold">
                    <tr>
                       <th className="px-6 py-4">Data Compra</th>
                       <th className="px-6 py-4">Ref.</th>
                       <th className="px-6 py-4">Descrição</th>
                       <th className="px-6 py-4">Tipo</th>
                       <th className="px-6 py-4">Categoria</th>
                       <th className="px-6 py-4 text-right">Valor</th>
                       <th className="px-6 py-4 text-center">Ações</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTransactions.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                                {selectedCategoryFilter 
                                    ? `Nenhuma transação encontrada na categoria "${selectedCategoryFilter}" neste mês.`
                                    : "Nenhuma transação encontrada neste mês de referência."}
                            </td>
                        </tr>
                    ) : filteredTransactions.map((transaction) => (
                       <tr key={transaction.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          {editingId === transaction.id ? (
                             // EDIT MODE ROWS
                             <>
                                <td className="px-6 py-3">
                                   <input 
                                      type="date" 
                                      value={editForm.date ? new Date(editForm.date).toISOString().split('T')[0] : ''}
                                      onChange={(e) => setEditForm({...editForm, date: e.target.valueAsDate?.toISOString() || editForm.date})}
                                      className="w-full rounded border p-1 text-xs dark:bg-slate-700 dark:border-slate-600"
                                   />
                                </td>
                                <td className="px-6 py-3">
                                   {editForm.transactionType !== 'INCOME' && (
                                       <input 
                                          type="month" 
                                          value={editForm.referenceDate ? editForm.referenceDate.slice(0, 7) : ''}
                                          onChange={(e) => setEditForm({...editForm, referenceDate: new Date(`${e.target.value}-01`).toISOString()})}
                                          className="w-full rounded border p-1 text-xs dark:bg-slate-700 dark:border-slate-600"
                                       />
                                   )}
                                </td>
                                <td className="px-6 py-3">
                                   <input 
                                      type="text" 
                                      value={editForm.description}
                                      onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                      className="w-full rounded border p-1 text-xs dark:bg-slate-700 dark:border-slate-600"
                                   />
                                </td>
                                <td className="px-6 py-3">
                                   <select 
                                      value={editForm.transactionType}
                                      onChange={(e) => setEditForm({...editForm, transactionType: e.target.value as TransactionType})}
                                      className="w-full rounded border p-1 text-xs dark:bg-slate-700 dark:border-slate-600"
                                   >
                                      <option value="EXPENSE">Saída</option>
                                      <option value="INCOME">Entrada</option>
                                      <option value="TRANSFER">Transf.</option>
                                   </select>
                                </td>
                                <td className="px-6 py-3">
                                   <select 
                                      value={editForm.category}
                                      onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                                      className="w-full rounded border p-1 text-xs dark:bg-slate-700 dark:border-slate-600"
                                   >
                                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                   </select>
                                </td>
                                <td className="px-6 py-3">
                                   <input 
                                      type="number" step="0.01"
                                      value={editForm.amount}
                                      onChange={(e) => setEditForm({...editForm, amount: parseFloat(e.target.value)})}
                                      className="w-full rounded border p-1 text-xs text-right dark:bg-slate-700 dark:border-slate-600"
                                   />
                                </td>
                                <td className="px-6 py-3 text-center">
                                   <div className="flex justify-center gap-1">
                                      <button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-4 h-4" /></button>
                                      <button onClick={cancelEdit} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><X className="w-4 h-4" /></button>
                                   </div>
                                </td>
                             </>
                          ) : (
                             // VIEW MODE ROWS
                             <>
                                <td className="px-6 py-4 whitespace-nowrap">
                                   <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-slate-400" />
                                      {new Date(transaction.date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                                   </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                                   {transaction.transactionType !== 'INCOME' && transaction.referenceDate 
                                      ? new Date(transaction.referenceDate).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
                                      : '-'
                                   }
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{transaction.description}</td>
                                <td className="px-6 py-4">
                                     {transaction.transactionType === 'INCOME' ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400">
                                            <ArrowUpCircle className="w-3 h-3 mr-1" /> Entrada
                                          </span>
                                      ) : transaction.transactionType === 'TRANSFER' ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400">
                                            <ArrowRightCircle className="w-3 h-3 mr-1" /> Transf.
                                          </span>
                                      ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400">
                                            <ArrowDownCircle className="w-3 h-3 mr-1" /> Saída
                                          </span>
                                      )}
                                </td>
                                <td className="px-6 py-4">
                                   <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                      <Tag className="w-3 h-3 mr-1" />
                                      {transaction.category}
                                   </span>
                                </td>
                                <td className={`px-6 py-4 text-right font-bold ${transaction.transactionType === 'INCOME' ? 'text-emerald-600' : 'text-rose-600 dark:text-rose-400'}`}>
                                   {isPrivacyEnabled 
                                      ? '••••••' 
                                      : transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                   }
                                </td>
                                <td className="px-6 py-4 text-center">
                                   <div className="flex justify-center gap-2">
                                      <button 
                                         onClick={() => startEdit(transaction)}
                                         className="p-1 text-slate-400 hover:text-indigo-600 transition-colors" 
                                         title="Editar"
                                      >
                                         <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button 
                                         onClick={() => onRemove(transaction.id)}
                                         className="p-1 text-slate-400 hover:text-rose-600 transition-colors" 
                                         title="Excluir"
                                      >
                                         <Trash2 className="w-4 h-4" />
                                      </button>
                                   </div>
                                </td>
                             </>
                          )}
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Summary */}
      <div className="lg:col-span-4 space-y-6">
         <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 sticky top-24">
            <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Saídas por Categoria
                </h3>
                {selectedCategoryFilter && (
                    <button 
                        onClick={() => setSelectedCategoryFilter(null)}
                        className="text-xs text-slate-400 hover:text-indigo-600"
                    >
                        Limpar filtro
                    </button>
                )}
            </div>
            
            <div className="space-y-4">
               {categorySummary.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">Sem despesas para exibir neste mês.</p>
               ) : categorySummary.map(cat => (
                  <div 
                    key={cat.name} 
                    onClick={() => setSelectedCategoryFilter(selectedCategoryFilter === cat.name ? null : cat.name)}
                    className={`space-y-1 cursor-pointer p-2 rounded-lg transition-colors ${selectedCategoryFilter === cat.name ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-200 dark:ring-indigo-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                     <div className="flex justify-between text-sm">
                        <span className={`font-medium ${selectedCategoryFilter === cat.name ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>{cat.name}</span>
                        <span className={`font-bold ${selectedCategoryFilter === cat.name ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white'}`}>
                           {isPrivacyEnabled ? '•••' : cat.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                     </div>
                     <div className="relative w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                           className={`absolute left-0 top-0 h-full rounded-full ${selectedCategoryFilter === cat.name ? 'bg-indigo-500' : 'bg-rose-500'}`} 
                           style={{ width: `${cat.percentage}%` }}
                        />
                     </div>
                     <div className="text-xs text-right text-slate-400">
                        {cat.percentage.toFixed(1)}% do total
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};