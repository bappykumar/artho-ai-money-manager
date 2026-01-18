
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
  }
];

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'records' | 'sync'>('records');
  
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  
  const [visibleItems, setVisibleItems] = useState<Record<string, boolean>>({});
  const [filterCategory, setFilterCategory] = useState<Category | 'All'>('All');
  const [filterSource, setFilterSource] = useState<AccountSource | 'All'>('All');
  const [filterTime, setFilterTime] = useState<'All' | 'Today' | 'Week' | 'Month'>('All');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setTransactions(JSON.parse(saved));
      } catch (e) {
        setTransactions(DEMO_TRANSACTIONS);
      }
    } else {
      setTransactions(DEMO_TRANSACTIONS);
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) setTransactions(JSON.parse(e.newValue));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    if (transactions.length > 0) refreshInsights();
  }, [transactions]);

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

  const handleLockApp = () => {
    setIsUnlocked(false);
    setPinInput('');
    setVisibleItems({});
  };

  const generateRecoveryKey = () => {
    return btoa(JSON.stringify(transactions));
  };

  const importRecoveryKey = (key: string) => {
    try {
      const decoded = JSON.parse(atob(key));
      if (Array.isArray(decoded)) {
        if (confirm(`Import ${decoded.length} transactions? This will overwrite existing data.`)) {
          setTransactions(decoded);
          alert("Data restored successfully!");
        }
      }
    } catch (e) {
      alert("Invalid Recovery Key!");
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `artho_backup_${new Date().toISOString().split('T')[0]}.json`);
    linkElement.click();
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesCategory = filterCategory === 'All' || t.category === filterCategory;
      const matchesSource = filterSource === 'All' || t.source === filterSource;
      const txDate = new Date(t.date);
      const now = new Date();
      let matchesTime = true;
      if (filterTime === 'Today') matchesTime = txDate.toDateString() === now.toDateString();
      else if (filterTime === 'Week') {
        const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
        matchesTime = txDate >= weekAgo;
      } else if (filterTime === 'Month') matchesTime = txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      return matchesCategory && matchesSource && matchesTime;
    });
  }, [transactions, filterCategory, filterSource, filterTime]);

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-3xl font-black mb-8 shadow-2xl shadow-indigo-500/20">A</div>
        <h1 className="text-2xl font-black mb-2 tracking-tighter uppercase tracking-[0.1em]">Artho Vault</h1>
        <p className="text-slate-400 text-sm mb-12 font-medium">Enter PIN (Default: 0000)</p>
        <div className="w-full max-w-[280px] space-y-12">
          <div className="flex justify-center gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${pinInput.length > i ? 'bg-indigo-500 border-indigo-500 scale-125' : 'bg-transparent border-slate-700'} ${pinError ? 'border-rose-500 bg-rose-500 animate-shake' : ''}`} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((val) => (
              <button key={val} type="button" onClick={() => {
                if (val === 'C') setPinInput('');
                else if (val === 'OK') { if(pinInput === DEFAULT_PIN) setIsUnlocked(true); else setPinError(true); }
                else if (pinInput.length < 4) {
                  const next = pinInput + val;
                  setPinInput(next);
                  if (next === DEFAULT_PIN) setTimeout(() => { setIsUnlocked(true); setPinInput(''); }, 200);
                  else if (next.length === 4) setPinError(true);
                }
              }} className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold bg-slate-800 hover:bg-slate-700 text-white shadow-lg active:scale-90 select-none">
                {val}
              </button>
            ))}
          </div>
        </div>
        <style>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } } .animate-shake { animation: shake 0.2s ease-in-out; }`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
      <div className="w-full max-w-4xl">
        <header className="flex items-center justify-between py-8 px-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-indigo-200">A</div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Artho</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">AI Vault</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Offline Synced
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowHistory(true)} className="w-12 h-12 rounded-[1.25rem] bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            <button onClick={handleLockApp} className="w-12 h-12 rounded-[1.25rem] bg-slate-800 text-white shadow-lg flex items-center justify-center hover:bg-slate-900 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </button>
          </div>
        </header>

        <Dashboard 
          transactions={filteredTransactions} 
          insights={insights} 
          visibleItems={visibleItems}
          onToggleItem={(k) => setVisibleItems(p => ({ ...p, [k]: !p[k] }))}
          filterCategory={filterCategory} setFilterCategory={setFilterCategory}
          filterSource={filterSource} setFilterSource={setFilterSource}
          filterTime={filterTime} setFilterTime={setFilterTime}
        />
        <AIChatInput onProcess={handleProcessInput} isLoading={isLoading} transactions={transactions} />
      </div>

      {showHistory && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-8 animate-slide-left flex flex-col rounded-l-[3.5rem] border-l border-white/20">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Vault</h2>
                <div className="flex gap-4 mt-2">
                  <button onClick={() => setActiveTab('records')} className={`text-[10px] font-black uppercase tracking-widest ${activeTab === 'records' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : 'text-slate-400'}`}>History</button>
                  <button onClick={() => setActiveTab('sync')} className={`text-[10px] font-black uppercase tracking-widest ${activeTab === 'sync' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1' : 'text-slate-400'}`}>Cloud Sync</button>
                </div>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-3 bg-slate-100 rounded-2xl text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {activeTab === 'records' ? (
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar">
                {filteredTransactions.length === 0 ? <p className="text-center text-slate-400 py-20 uppercase text-[10px] font-black tracking-widest">No matching records</p> : 
                  [...filteredTransactions].reverse().map(t => (
                    <div key={t.id} className="p-5 rounded-[2rem] bg-white border border-slate-100 group relative hover:border-indigo-100 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-white text-[9px] font-black uppercase" style={{ backgroundColor: SOURCE_COLORS[t.source] }}>{SOURCE_ICONS[t.source]} {t.source}</div>
                        <span className="text-[9px] text-slate-400 font-bold">{new Date(t.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-slate-800 text-sm">{t.note}</p>
                        <p className={`font-black text-lg ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>{t.type === 'income' ? '+' : '-'}৳{t.amount.toLocaleString()}</p>
                      </div>
                      <button onClick={() => setTransactions(p => p.filter(x => x.id !== t.id))} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-rose-300 hover:text-rose-500 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))
                }
              </div>
            ) : (
              <div className="flex-1 space-y-8 overflow-y-auto pr-2 no-scrollbar">
                <div className="bg-indigo-50 p-6 rounded-[2.5rem] border border-indigo-100">
                  <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-3">Recovery Key</h3>
                  <p className="text-[10px] text-indigo-600 mb-4 font-medium leading-relaxed">এই কোডটি কপি করে আপনার গুগল ড্রাইভ বা নোটপ্যাডে রেখে দিন। এটি ব্যবহার করে যেকোনো সময় ডেটা রিকভার করা যাবে।</p>
                  <textarea readOnly value={generateRecoveryKey()} className="w-full h-24 bg-white/50 border border-indigo-200 rounded-2xl p-3 text-[8px] font-mono break-all focus:outline-none mb-3" />
                  <button onClick={() => { navigator.clipboard.writeText(generateRecoveryKey()); alert("Key copied!"); }} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">Copy Recovery Key</button>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manage Data</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={exportData} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-600 flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Export JSON
                    </button>
                    <button onClick={() => { const k = prompt("Paste your Recovery Key here:"); if(k) importRecoveryKey(k); }} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[9px] font-black uppercase tracking-widest text-indigo-600 flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                      Import Key
                    </button>
                  </div>
                </div>

                <div className="p-6 bg-emerald-50 rounded-[2.5rem] border border-emerald-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">☁️</div>
                    <h3 className="text-xs font-black text-emerald-900 uppercase tracking-widest">Google Drive Auto-Sync</h3>
                  </div>
                  <p className="text-[9px] text-emerald-700 leading-relaxed font-medium">আপনার পার্সোনাল গুগল ড্রাইভে অটো-সিঙ্ক অন করতে চান? এটি করতে আপনার একটি Client ID প্রয়োজন। ভবিষ্যতে আপডেটে এটি সরাসরি যুক্ত করা হবে। আপাতত "Recovery Key" ব্যবহার করে ব্যাকআপ রাখুন।</p>
                </div>
              </div>
            )}
            
            <div className="mt-8 pt-8 border-t border-slate-100">
               <button onClick={() => { if(confirm('Destroy all data?')) { setTransactions([]); localStorage.removeItem(STORAGE_KEY); } }} className="w-full py-4 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 rounded-2xl transition-all">Destroy Local Data</button>
            </div>
          </div>
        </div>
      )}
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } @keyframes slide-left { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } .animate-slide-left { animation: slide-left 0.4s cubic-bezier(0.16, 1, 0.3, 1); }`}</style>
    </div>
  );
};

export default App;
