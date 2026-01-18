
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, SpendingInsight, Category, AccountSource } from './types';
import { extractTransaction, generateInsights } from './services/geminiService';
import { SOURCE_COLORS, SOURCE_ICONS } from './constants';
import Dashboard from './components/Dashboard';
import AIChatInput from './components/AIChatInput';

const STORAGE_KEY = 'artho_finance_v3_data';
const DEFAULT_PIN = '0000';

const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'demo-1',
    amount: 45000,
    category: 'Income',
    date: new Date(Date.now() - 86400000 * 5).toISOString(),
    type: 'income',
    source: 'BRAC BANK',
    note: 'Monthly Salary',
    rawInput: 'Salary credited to Brac Bank 45000'
  },
  {
    id: 'demo-2',
    amount: 1200,
    category: 'Food',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    type: 'expense',
    source: 'BKASH',
    note: 'Dinner at Sultans Dine',
    rawInput: 'বিকাশ এ ১২০০ টাকা সুলতান ডাইন এ খরচ'
  }
];

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  
  const [visibleItems, setVisibleItems] = useState<Record<string, boolean>>({});

  const [filterCategory, setFilterCategory] = useState<Category | 'All'>('All');
  const [filterSource, setFilterSource] = useState<AccountSource | 'All'>('All');
  const [filterTime, setFilterTime] = useState<'All' | 'Today' | 'Week' | 'Month'>('All');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Load Data with Robust Validation
  useEffect(() => {
    const loadSavedData = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved !== null) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setTransactions(parsed);
          } else {
            setTransactions(DEMO_TRANSACTIONS);
          }
        } else {
          // First time user
          setTransactions(DEMO_TRANSACTIONS);
        }
      } catch (e) {
        console.error("Storage load error", e);
        setTransactions(DEMO_TRANSACTIONS);
      }
    };

    loadSavedData();

    // 2. Cross-tab Synchronization
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setTransactions(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 3. Save Data whenever transactions change
  useEffect(() => {
    if (transactions.length > 0 || (localStorage.getItem(STORAGE_KEY) !== null)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    }
  }, [transactions]);

  useEffect(() => {
    if (transactions.length > 0) {
      refreshInsights();
    }
  }, [transactions.length]);

  const refreshInsights = async () => {
    const newInsights = await generateInsights(transactions);
    setInsights(newInsights);
  };

  const handleProcessInput = async (input: string) => {
    setIsLoading(true);
    try {
      const result = await extractTransaction(input);
      if (result && result.amount > 0) {
        const newTransaction: Transaction = {
          id: crypto.randomUUID(),
          amount: result.amount,
          category: result.category,
          date: new Date().toISOString(),
          type: result.type,
          source: result.source || 'CASH',
          note: result.note,
          rawInput: input
        };
        setTransactions(prev => [...prev, newTransaction]);
      }
    } catch (error) {
      console.error("Process error", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = () => {
    if (pinInput === DEFAULT_PIN) {
      setIsUnlocked(true);
      setPinError(false);
      setPinInput('');
    } else {
      setPinError(true);
    }
  };

  const handleLockApp = () => {
    setIsUnlocked(false);
    setPinInput('');
    setVisibleItems({});
  };

  const toggleVisibility = (key: string) => {
    setVisibleItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // 4. Backup & Restore Features
  const exportData = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `artho_backup_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const imported = JSON.parse(content);
        if (Array.isArray(imported)) {
          if (confirm(`Import ${imported.length} transactions? This will replace your current data.`)) {
            setTransactions(imported);
          }
        } else {
          alert("Invalid backup file format.");
        }
      } catch (err) {
        alert("Failed to parse the backup file.");
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
      const matchesSource = filterSource === 'All' || t.source === filterSource;
      
      const txDate = new Date(t.date);
      const now = new Date();
      let matchesTime = true;

      if (filterTime === 'Today') {
        matchesTime = txDate.toDateString() === now.toDateString();
      } else if (filterTime === 'Week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        matchesTime = txDate >= weekAgo;
      } else if (filterTime === 'Month') {
        matchesTime = txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      }

      return matchesCategory && matchesSource && matchesTime;
    });
  }, [transactions, filterCategory, filterSource, filterTime]);

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-3xl font-black mb-8 shadow-2xl shadow-indigo-500/20">A</div>
        <h1 className="text-2xl font-black mb-2 tracking-tighter uppercase tracking-[0.1em]">Artho Vault</h1>
        <p className="text-slate-400 text-sm mb-12 font-medium">Enter PIN to access (Default: 0000)</p>
        
        <div className="w-full max-w-[280px] space-y-12">
          <div className="flex justify-center gap-5">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i} 
                className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                  pinInput.length > i 
                    ? 'bg-indigo-500 border-indigo-500 scale-125' 
                    : 'bg-transparent border-slate-700'
                } ${pinError ? 'border-rose-500 bg-rose-500 animate-shake' : ''}`}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'Clear', 0, 'Go'].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  if (pinError) {
                    setPinError(false);
                    setPinInput('');
                  }
                  if (val === 'Clear') setPinInput('');
                  else if (val === 'Go') { if(pinInput.length === 4) handlePinSubmit(); }
                  else if (pinInput.length < 4) {
                    const newInput = pinInput + val;
                    setPinInput(newInput);
                    if (newInput.length === 4) {
                      setTimeout(() => {
                        if (newInput === DEFAULT_PIN) {
                          setIsUnlocked(true);
                          setPinError(false);
                          setPinInput('');
                        } else {
                          setPinError(true);
                        }
                      }, 100);
                    }
                  }
                }}
                className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold transition-all active:scale-90 select-none ${
                  typeof val === 'number' 
                    ? 'bg-slate-800 hover:bg-slate-700 text-white shadow-lg' 
                    : 'text-indigo-400 text-[10px] uppercase font-black tracking-widest'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>
        
        {pinError && (
          <p className="mt-8 text-rose-500 text-xs font-black uppercase tracking-widest animate-bounce">Access Denied</p>
        )}
        
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-6px); }
            75% { transform: translateX(6px); }
          }
          .animate-shake { animation: shake 0.2s ease-in-out; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
      <div className="w-full max-w-4xl">
        <header className="flex items-center justify-between py-8 px-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-indigo-200 transition-transform hover:rotate-3">A</div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Artho</h1>
              <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-1">AI Financial Vault</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="w-12 h-12 rounded-[1.25rem] bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-all active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button 
              onClick={handleLockApp}
              className="w-12 h-12 rounded-[1.25rem] bg-slate-800 text-white shadow-lg flex items-center justify-center hover:bg-slate-900 transition-all active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </button>
          </div>
        </header>

        <Dashboard 
          transactions={filteredTransactions} 
          insights={insights} 
          visibleItems={visibleItems}
          onToggleItem={toggleVisibility}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          filterSource={filterSource}
          setFilterSource={setFilterSource}
          filterTime={filterTime}
          setFilterTime={setFilterTime}
        />

        <AIChatInput 
          onProcess={handleProcessInput} 
          isLoading={isLoading} 
          transactions={transactions} 
        />
      </div>

      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-8 animate-slide-left flex flex-col rounded-l-[3.5rem] border-l border-white/20">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">History</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Transaction Ledger</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-4 bg-slate-100 rounded-2xl text-slate-600 hover:bg-slate-200 transition-all active:scale-90">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Backup & Restore Bar */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button 
                onClick={exportData}
                className="flex items-center justify-center gap-2 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Backup
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-100 hover:bg-slate-100 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Restore
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={importData} 
                accept=".json" 
                className="hidden" 
              />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-5 pr-2 no-scrollbar">
              {filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-30">
                  <span className="text-6xl mb-6">🏜️</span>
                  <p className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 text-center">No matching records</p>
                </div>
              ) : (
                [...filteredTransactions].reverse().map(t => (
                  <div 
                    key={t.id} 
                    className="p-6 rounded-[2.25rem] bg-white border border-slate-100 group relative hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-black text-white text-[10px]" style={{ backgroundColor: SOURCE_COLORS[t.source] }}>
                          <span role="img" aria-label={t.source}>{SOURCE_ICONS[t.source]}</span>
                          <span className="uppercase tracking-tighter">{t.source}</span>
                        </div>
                        <span className="text-[10px] uppercase font-black text-slate-300 tracking-[0.15em]">{t.category}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">{new Date(t.date).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex justify-between items-center mb-4">
                      <p className="font-bold text-slate-800 text-base">{t.note}</p>
                      <p className={`font-black text-xl tracking-tight ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {t.type === 'income' ? '+' : '-'}৳{t.amount.toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100/50">
                      <p className="text-[11px] text-slate-500 font-medium italic leading-snug">
                        <span className="text-indigo-400 mr-1 not-italic">“</span>
                        {t.rawInput}
                        <span className="text-indigo-400 ml-1 not-italic">”</span>
                      </p>
                    </div>

                    <button 
                      onClick={(e) => { e.stopPropagation(); if(confirm('Delete permanently?')) setTransactions(prev => prev.filter(x => x.id !== t.id)); }}
                      className="absolute top-4 right-4 p-2 bg-rose-50 rounded-xl text-rose-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-rose-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100">
               <button 
                onClick={() => {
                   if(confirm('Wipe all data from this device?')) {
                     setTransactions([]);
                     setInsights([]);
                     localStorage.removeItem(STORAGE_KEY);
                   }
                }}
                className="w-full py-5 text-rose-500 text-xs font-black uppercase tracking-[0.2em] hover:bg-rose-50 rounded-[1.75rem] transition-all border-2 border-transparent hover:border-rose-100"
               >
                 Destroy Vault Data
               </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slide-left {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-left {
          animation: slide-left 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
};

export default App;
