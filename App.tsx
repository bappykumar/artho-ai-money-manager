
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, SpendingInsight, Category, AccountSource, SyncState } from './types';
import { extractTransaction, generateInsights } from './services/geminiService';
import { SOURCE_COLORS, SOURCE_ICONS } from './constants';
import Dashboard from './components/Dashboard';
import AIChatInput from './components/AIChatInput';

const STORAGE_KEY = 'artho_finance_v3_data';
const CLIENT_ID_KEY = 'artho_google_client_id';
const DEFAULT_PIN = '0000';

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

  const [clientId, setClientId] = useState(localStorage.getItem(CLIENT_ID_KEY) || '');
  const [syncStatus, setSyncStatus] = useState<SyncState>({
    isConnected: false,
    isSyncing: false,
    lastSync: localStorage.getItem('last_sync_time') || null,
    error: null
  });

  const tokenClient = useRef<any>(null);

  useEffect(() => {
    const initGoogle = () => {
      if (clientId && (window as any).google) {
        try {
          tokenClient.current = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: (resp: any) => {
              if (resp.access_token) {
                handleSync(resp.access_token);
              }
            },
          });
          triggerSync();
        } catch (e) {
          console.error("GSI Init Error", e);
        }
      }
    };
    
    const timer = setTimeout(initGoogle, 1500);
    return () => clearTimeout(timer);
  }, [clientId]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setTransactions(JSON.parse(saved));
      } catch (e) {
        setTransactions([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    if (transactions.length > 0) refreshInsights();
  }, [transactions]);

  const refreshInsights = async () => {
    const newInsights = await generateInsights(transactions);
    setInsights(newInsights);
  };

  const handleSync = async (token: string) => {
    setSyncStatus(p => ({ ...p, isSyncing: true, isConnected: true }));
    try {
      const fileName = 'artho_vault_data.json';
      const listResp = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const listData = await listResp.json();
      const file = listData.files?.[0];
      let finalData = [...transactions];

      if (file) {
        const downloadResp = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const cloudData = await downloadResp.json();
        if (Array.isArray(cloudData)) {
          const existingIds = new Set(transactions.map(t => t.id));
          const newItems = cloudData.filter(ct => !existingIds.has(ct.id));
          finalData = [...transactions, ...newItems];
          setTransactions(finalData);
        }
        const metadata = { name: fileName, mimeType: 'application/json' };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(finalData)], { type: 'application/json' }));
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=multipart`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
          body: form
        });
      } else {
        const metadata = { name: fileName, mimeType: 'application/json' };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([JSON.stringify(finalData)], { type: 'application/json' }));
        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form
        });
      }
      const now = new Date().toLocaleTimeString();
      setSyncStatus(p => ({ ...p, lastSync: now, isSyncing: false, error: null }));
      localStorage.setItem('last_sync_time', now);
    } catch (err: any) {
      setSyncStatus(p => ({ ...p, error: "Sync Failed", isSyncing: false }));
    }
  };

  const triggerSync = () => {
    if (tokenClient.current) {
      tokenClient.current.requestAccessToken({ prompt: '' });
    }
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
        if (clientId) setTimeout(triggerSync, 500);
      }
    } finally {
      setIsLoading(false);
    }
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
        <div className="w-20 h-20 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-4xl font-black mb-10 shadow-3xl shadow-indigo-500/40 transform -rotate-3">A</div>
        <h1 className="text-3xl font-black mb-2 tracking-tight">Artho Cloud Vault</h1>
        <p className="text-slate-500 text-xs mb-12 font-bold uppercase tracking-[0.2em]">Enter PIN to Decrypt</p>
        <div className="w-full max-w-[280px] space-y-12">
          <div className="flex justify-center gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${pinInput.length > i ? 'bg-indigo-500 border-indigo-500 scale-125' : 'bg-transparent border-slate-700'} ${pinError ? 'border-rose-500 bg-rose-500 animate-shake' : ''}`} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((val) => (
              <button key={val} type="button" onClick={() => {
                if (val === 'C') setPinInput('');
                else if (val === 'OK') { if(pinInput === DEFAULT_PIN) setIsUnlocked(true); else { setPinError(true); setTimeout(()=>setPinError(false), 500); } }
                else if (pinInput.length < 4) {
                  const next = pinInput + val;
                  setPinInput(next);
                  if (next === DEFAULT_PIN) setTimeout(() => { setIsUnlocked(true); setPinInput(''); }, 200);
                  else if (next.length === 4) { setPinError(true); setTimeout(()=>setPinError(false), 500); }
                }
              }} className="w-16 h-16 rounded-3xl flex items-center justify-center text-2xl font-black bg-slate-800 hover:bg-slate-700 text-white shadow-xl active:scale-90 transition-all">
                {val}
              </button>
            ))}
          </div>
        </div>
        <style>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } } .animate-shake { animation: shake 0.2s ease-in-out; }`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4">
      <div className="w-full max-w-4xl">
        <header className="flex items-center justify-between py-8 px-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white font-black text-3xl shadow-2xl shadow-indigo-200">A</div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Artho</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-full border border-slate-100 shadow-sm">
                   <div className={`w-2 h-2 rounded-full ${syncStatus.isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'} ${syncStatus.isSyncing ? 'animate-pulse' : ''}`}></div>
                   <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                     {syncStatus.isSyncing ? 'Syncing...' : syncStatus.isConnected ? `Cloud Connected` : 'Local Only'}
                   </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2.5">
            <button onClick={() => { setShowHistory(true); setActiveTab('sync'); }} className={`w-12 h-12 rounded-[1.25rem] bg-white border border-slate-200 shadow-sm flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${syncStatus.isConnected ? 'text-indigo-600' : 'text-slate-400'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
            </button>
            <button onClick={() => { setShowHistory(true); setActiveTab('records'); }} className="w-12 h-12 rounded-[1.25rem] bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-all hover:scale-105 active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            <button onClick={() => { setIsUnlocked(false); setPinInput(''); }} className="w-12 h-12 rounded-[1.25rem] bg-slate-900 text-white shadow-xl flex items-center justify-center hover:bg-black transition-all hover:scale-105 active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-8 animate-slide-left flex flex-col rounded-l-[3.5rem] border-l border-white/20 overflow-hidden">
            <div className="flex items-center justify-between mb-10 shrink-0">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Cloud Vault</h2>
                <div className="flex gap-6 mt-4">
                  <button onClick={() => setActiveTab('records')} className={`text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'records' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1.5' : 'text-slate-400'}`}>Transactions</button>
                  <button onClick={() => setActiveTab('sync')} className={`text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'sync' ? 'text-indigo-600 border-b-2 border-indigo-600 pb-1.5' : 'text-slate-400'}`}>Sync Settings</button>
                </div>
              </div>
              <button onClick={() => setShowHistory(false)} className="w-12 h-12 bg-slate-100 rounded-2xl text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
              {activeTab === 'records' ? (
                <div className="space-y-4">
                  {filteredTransactions.length === 0 ? <p className="text-center text-slate-400 py-20 font-bold uppercase text-[10px] tracking-widest">No history found</p> : 
                    [...filteredTransactions].reverse().map(t => (
                      <div key={t.id} className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 group relative hover:border-indigo-200 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2 px-3 py-1 rounded-full text-white text-[10px] font-black uppercase" style={{ backgroundColor: SOURCE_COLORS[t.source] }}>{SOURCE_ICONS[t.source]} {t.source}</div>
                          <span className="text-[10px] text-slate-400 font-black">{new Date(t.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="font-bold text-slate-800 text-sm">{t.note}</p>
                          <p className={`font-black text-xl ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>{t.type === 'income' ? '+' : '-'}৳{t.amount.toLocaleString()}</p>
                        </div>
                        <button onClick={() => { if(confirm('Delete this record?')) setTransactions(p => p.filter(x => x.id !== t.id)); }} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-2 text-rose-300 hover:text-rose-500 transition-all">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))
                  }
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-100 relative overflow-hidden">
                    <h3 className="text-sm font-black uppercase tracking-widest mb-4">Google Cloud Status</h3>
                    <p className="text-[11px] text-indigo-100 mb-8 font-medium leading-relaxed opacity-90 italic">আপনার ডেটা এখন ক্লাউডে সুরক্ষিত থাকবে।</p>
                    
                    {clientId ? (
                      <div className="space-y-4">
                        <div className="bg-emerald-400/20 p-5 rounded-2xl border border-emerald-400/30 flex items-center gap-4">
                           <div className="w-10 h-10 bg-emerald-400 rounded-xl flex items-center justify-center text-emerald-900 text-xl">✅</div>
                           <div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Sync Activated</p>
                             <p className="text-[8px] font-bold text-emerald-200/60 mt-0.5">Cloud Vault is operational</p>
                           </div>
                        </div>
                        <div className="bg-white/10 p-4 rounded-xl border border-white/20 flex flex-col gap-1">
                          <span className="text-[8px] font-black uppercase opacity-60">Active Client ID</span>
                          <span className="text-[10px] font-mono break-all line-clamp-1">{clientId}</span>
                        </div>
                        <button 
                          onClick={triggerSync}
                          disabled={syncStatus.isSyncing}
                          className="w-full py-5 bg-white text-indigo-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                          {syncStatus.isSyncing ? 'Synchronizing...' : 'Sync with Cloud Now'}
                        </button>
                        <div className="flex justify-center">
                           <button onClick={() => { if(confirm('Delete ID?')) { setClientId(''); localStorage.removeItem(CLIENT_ID_KEY); setSyncStatus(p => ({ ...p, isConnected: false })); } }} className="text-[10px] font-bold text-indigo-200 hover:text-white transition-all underline">Remove & Update ID</button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="bg-indigo-700/50 p-5 rounded-2xl border border-white/10">
                          <p className="text-[10px] font-black uppercase tracking-widest mb-3">Paste Client ID here:</p>
                          <input 
                            type="text" 
                            placeholder="...apps.googleusercontent.com" 
                            className="w-full p-4 rounded-xl border-none text-[11px] font-mono bg-white text-indigo-900 outline-none focus:ring-4 focus:ring-white/20 shadow-inner"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = (e.target as HTMLInputElement).value.trim();
                                if (val) { setClientId(val); localStorage.setItem(CLIENT_ID_KEY, val); }
                              }
                            }}
                          />
                          <p className="text-[8px] mt-3 opacity-60 text-center font-bold uppercase tracking-widest">Press Enter to save</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {!clientId && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Setup Guide</h4>
                      <div className="space-y-3">
                        {[
                          { step: '!', text: '⚠️ জিমেইলে অবশ্যই 2-Step Verification অন থাকতে হবে।', color: 'bg-rose-50 text-rose-600 border-rose-100' },
                          { step: '১', text: 'আপনার কপি করা Client ID-টি উপরের বক্সে বসান।', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
                          { step: '২', text: 'কিবোর্ড থেকে এন্টার (Enter) চাপুন।', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
                          { step: '৩', text: 'একটি পপ-আপ আসলে আপনার জিমেইল সিলেক্ট করে অনুমতি দিন।', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' }
                        ].map((s, idx) => (
                          <div key={idx} className={`flex gap-4 p-4 rounded-2xl border transition-all hover:bg-white ${s.color}`}>
                            <div className="w-8 h-8 rounded-xl bg-white/50 flex items-center justify-center text-[11px] font-black shrink-0 border border-current opacity-70">{s.step}</div>
                            <p className="text-[11px] font-semibold leading-tight flex items-center">{s.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {clientId && (
                     <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 text-center">
                        <div className="text-4xl mb-4">✨</div>
                        <h4 className="text-sm font-black text-slate-900 mb-2 uppercase tracking-widest">অভিনন্দন!</h4>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">আপনার সেটআপ সম্পন্ন হয়েছে। এখন নির্ভয়ে আপনার খরচ ট্র্যাক করুন।</p>
                     </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="shrink-0 pt-8 border-t border-slate-100 bg-white">
               <button onClick={() => { if(confirm('এটি আপনার ফোনের সব ডেটা মুছে ফেলবে। আপনি কি নিশ্চিত?')) { setTransactions([]); localStorage.removeItem(STORAGE_KEY); } }} className="w-full py-5 text-rose-500 text-[11px] font-black uppercase tracking-widest hover:bg-rose-50 rounded-2xl transition-all">Destroy Local Records</button>
            </div>
          </div>
        </div>
      )}
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } @keyframes slide-left { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } .animate-slide-left { animation: slide-left 0.5s cubic-bezier(0.16, 1, 0.3, 1); }`}</style>
    </div>
  );
};

export default App;
