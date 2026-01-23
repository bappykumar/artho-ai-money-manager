
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Transaction, Category, SyncState, Account, SpendingInsight } from './types';
import { extractTransactions, generateInsights } from './services/geminiService';
import { driveService, DriveSyncData } from './services/googleDriveService';
import Dashboard from './components/Dashboard';
import AIChatInput from './components/AIChatInput';
import SyncManager from './components/SyncManager';
import Toast, { ToastMessage } from './components/Toast';

const STORAGE_KEY = 'artho_finance_v4_data';
const ACCOUNTS_KEY = 'artho_accounts_v4';
const SYNC_KEY = 'artho_sync_state';
const MUTATION_KEY = 'artho_last_mutation';
const UNLOCKED_KEY = 'artho_session_unlocked';
const DEFAULT_PIN = '0000';

const DEFAULT_ACCOUNTS: Account[] = [
  { id: '1', name: 'BRAC BANK', icon: '🏦', color: '#005DAA' },
  { id: '2', name: 'DBBL', icon: '💳', color: '#004A2F' },
  { id: '3', name: 'BKASH', icon: '📱', color: '#D12053' },
  { id: '4', name: 'CASH', icon: '💵', color: '#059669' },
];

const getDay = (daysAgo: number) => new Date(Date.now() - 86400000 * daysAgo).toISOString();

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: 'd1', amount: 75000, category: 'Income', date: getDay(15), type: 'income', source: 'BRAC BANK', note: 'Monthly Salary Received', rawInput: 'Salary 75000' },
  { id: 'd2', amount: 15000, category: 'Bills', date: getDay(14), type: 'expense', source: 'BRAC BANK', note: 'House Rent Payment', rawInput: 'Rent 15000' },
  { id: 'd3', amount: 500, category: 'Transport', date: getDay(13), type: 'expense', source: 'CASH', note: 'Rickshaw fare for office', rawInput: 'Rickshaw 500' },
  { id: 'd4', amount: 2500, category: 'Food', date: getDay(12), type: 'expense', source: 'BKASH', note: 'Dinner at Sultans Dine', rawInput: 'Sultans dine 2500' },
  { id: 'd5', amount: 1200, category: 'Bills', date: getDay(11), type: 'expense', source: 'BKASH', note: 'Internet Bill (AmberIT)', rawInput: 'Internet 1200' },
  { id: 'd6', amount: 3500, category: 'Shopping', date: getDay(10), type: 'expense', source: 'DBBL', note: 'New Shirt from Yellow', rawInput: 'Yellow shirt 3500' },
  { id: 'd7', amount: 450, category: 'Food', date: getDay(9), type: 'expense', source: 'CASH', note: 'Evening Snacks & Tea', rawInput: 'Snacks 450' },
  { id: 'd8', amount: 5000, category: 'Others', date: getDay(8), type: 'expense', source: 'BKASH', note: 'Sent money to parents', rawInput: 'Parents 5000' },
  { id: 'd9', amount: 800, category: 'Transport', date: getDay(7), type: 'expense', source: 'DBBL', note: 'Uber ride to Banani', rawInput: 'Uber 800' },
  { id: 'd10', amount: 1500, category: 'Food', date: getDay(6), type: 'expense', source: 'CASH', note: 'Weekly Grocery Bazaar', rawInput: 'Bazaar 1500' },
  { id: 'd11', amount: 200, category: 'Bills', date: getDay(5), type: 'expense', source: 'BKASH', note: 'Mobile Recharge (Grameenphone)', rawInput: 'GP recharge 200' },
  { id: 'd12', amount: 12000, category: 'Income', date: getDay(4), type: 'income', source: 'BKASH', note: 'Freelance Project Payment', rawInput: 'Freelance 12000' },
  { id: 'd13', amount: 3200, category: 'Health', date: getDay(3), type: 'expense', source: 'DBBL', note: 'Pharmacy Medicines', rawInput: 'Medicine 3200' },
  { id: 'd14', amount: 650, category: 'Entertainment', date: getDay(2), type: 'expense', source: 'CASH', note: 'Cineplex Movie Ticket', rawInput: 'Movie 650' },
  { id: 'd15', amount: 120, category: 'Food', date: getDay(1), type: 'expense', source: 'CASH', note: 'Coffee at street side', rawInput: 'Coffee 120' },
  { id: 'd16', amount: 4500, category: 'Shopping', date: getDay(0), type: 'expense', source: 'BKASH', note: 'Groceries from Shwapno', rawInput: 'Shwapno 4500' },
];

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem(ACCOUNTS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_ACCOUNTS;
  });
  
  const [insights, setInsights] = useState<SpendingInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSync, setShowSync] = useState(false);
  
  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem(UNLOCKED_KEY) === 'true');
  const [pinInput, setPinInput] = useState('');
  
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  const [visibleItems, setVisibleItems] = useState<Record<string, boolean>>({});
  const [syncState, setSyncState] = useState<SyncState>(() => {
    const saved = localStorage.getItem(SYNC_KEY);
    return saved ? JSON.parse(saved) : { isConnected: false, isSyncing: false, lastSync: null, error: null };
  });

  const [localLastMutation, setLocalLastMutation] = useState<string>(() => localStorage.getItem(MUTATION_KEY) || new Date().toISOString());
  const [conflictData, setConflictData] = useState<DriveSyncData | null>(null);

  const [filterCategory, setFilterCategory] = useState<Category | 'All'>('All');
  const [filterSource, setFilterSource] = useState<string | 'All'>('All');
  const [filterTime, setFilterTime] = useState<'All' | 'Today' | 'Week' | 'Month'>('All');

  const initializedCloud = useRef(false);

  const addToast = useCallback((message: string, type: 'error' | 'success' | 'warning' | 'info' = 'info') => {
    setToasts(prev => [...prev, { id: crypto.randomUUID(), message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateDataWithMutation = useCallback((newTxs: Transaction[], newAccounts?: Account[]) => {
    const now = new Date().toISOString();
    setTransactions(newTxs);
    if (newAccounts) {
      setAccounts(newAccounts);
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(newAccounts));
    }
    setLocalLastMutation(now);
    localStorage.setItem(MUTATION_KEY, now);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTxs));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && JSON.parse(saved).length > 0) {
      setTransactions(JSON.parse(saved));
    } else {
      setTransactions(DEMO_TRANSACTIONS);
    }
  }, []);

  const pushToCloud = useCallback(async (dataToPush: DriveSyncData) => {
    try {
      await driveService.uploadData(dataToPush);
      setSyncState(prev => ({ ...prev, lastSync: new Date().toISOString(), isSyncing: false, error: null }));
    } catch (err: any) {
       const errMsg = err?.result?.error?.message || 'Failed to upload to Google Drive.';
       addToast(errMsg, 'error');
       throw err;
    }
  }, [addToast]);

  const handleManualSync = useCallback(async () => {
    setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));
    try {
      const cloudData = await driveService.downloadData();
      
      if (!cloudData) {
        await pushToCloud({ transactions, accounts, lastUpdated: localLastMutation });
        addToast('Initial cloud backup created!', 'success');
        return;
      }

      const cloudTime = new Date(cloudData.lastUpdated).getTime();
      const localTime = new Date(localLastMutation).getTime();

      if (cloudTime > localTime) {
        updateDataWithMutation(cloudData.transactions, cloudData.accounts);
        addToast('Data synced from Google Drive.', 'success');
        setSyncState(prev => ({ ...prev, lastSync: new Date().toISOString(), isSyncing: false, error: null }));
      } else if (localTime > cloudTime) {
        setConflictData(cloudData);
        setSyncState(prev => ({ ...prev, isSyncing: false }));
      } else {
        addToast('Data is already up to date.', 'success');
        setSyncState(prev => ({ ...prev, isSyncing: false }));
      }
    } catch (e: any) {
      const errMsg = e?.result?.error?.message || 'Unable to reach Google Drive. Check your connection.';
      setSyncState(prev => ({ ...prev, isSyncing: false, error: errMsg }));
      addToast(errMsg, 'error');
    }
  }, [transactions, accounts, localLastMutation, updateDataWithMutation, pushToCloud, addToast]);

  useEffect(() => {
    const restoreSession = async () => {
      if (initializedCloud.current) return;
      const savedToken = driveService.getSavedToken();
      if (savedToken && syncState.isConnected) {
        try {
          await driveService.initGapi();
          driveService.setAccessToken(savedToken);
          initializedCloud.current = true;
          handleManualSync();
        } catch (err) {
          console.error("Cloud session restoration failed", err);
          setSyncState(prev => ({ ...prev, isConnected: false }));
          addToast("Cloud session expired. Please reconnect.", "warning");
        }
      }
    };
    restoreSession();
  }, [syncState.isConnected, handleManualSync, addToast]);

  useEffect(() => {
    localStorage.setItem(SYNC_KEY, JSON.stringify(syncState));
  }, [syncState]);

  useEffect(() => {
    if (transactions.length > 0) {
      generateInsights(transactions).then(setInsights);
    }
  }, [transactions]);

  const resolveConflict = async (useLocal: boolean) => {
    if (!conflictData) return;
    setSyncState(prev => ({ ...prev, isSyncing: true }));
    
    try {
      if (useLocal) {
        await pushToCloud({ transactions, accounts, lastUpdated: localLastMutation });
        addToast('Local version uploaded to cloud.', 'success');
      } else {
        updateDataWithMutation(conflictData.transactions, conflictData.accounts);
        addToast('Cloud version restored locally.', 'success');
        setSyncState(prev => ({ ...prev, lastSync: new Date().toISOString(), isSyncing: false }));
      }
    } catch (err) {
    } finally {
      setConflictData(null);
    }
  };

  const handleGoogleConnect = useCallback(() => {
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: '674314050201-kps5j9q69v7ofn0o271pno0b0k4q4sh8.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: async (response: any) => {
          if (response.access_token) {
            await driveService.initGapi();
            driveService.setAccessToken(response.access_token, response.expires_in || 3600);
            setSyncState(prev => ({ ...prev, isConnected: true }));
            handleManualSync();
            addToast('Google Drive connected!', 'success');
          } else if (response.error) {
            addToast(`Authentication failed: ${response.error}`, 'error');
          }
        },
        error_callback: (err: any) => {
          addToast(`Auth Error: ${err.message}`, 'error');
        }
      });
      client.requestAccessToken();
    } catch (e: any) {
      addToast('Failed to initialize Google Auth.', 'error');
    }
  }, [handleManualSync, addToast]);

  const handleDisconnect = useCallback(() => {
    driveService.clearToken();
    setSyncState({ isConnected: false, isSyncing: false, lastSync: null, error: null });
    addToast('Google Drive disconnected.', 'info');
  }, [addToast]);

  const handlePinPress = (val: string) => {
    if (val === 'C') setPinInput('');
    else if (pinInput.length < 4) {
      const newPin = pinInput + val;
      setPinInput(newPin);
      if (newPin.length === 4) {
        if (newPin === DEFAULT_PIN) {
          setIsUnlocked(true);
          sessionStorage.setItem(UNLOCKED_KEY, 'true');
        } else {
          setTimeout(() => setPinInput(''), 500);
        }
      }
    }
  };

  const lockApp = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem(UNLOCKED_KEY);
    setPinInput('');
  };

  const handleProcessInput = async (input: string) => {
    setIsLoading(true);
    try {
      const results = await extractTransactions(input, accounts.map(a => a.name));
      if (results?.length > 0) {
        const newEntries: Transaction[] = results.map(r => ({
          id: crypto.randomUUID(),
          amount: r.amount,
          category: r.category as any,
          date: new Date().toISOString(),
          type: r.type,
          source: r.source,
          note: r.note,
          rawInput: input
        }));
        updateDataWithMutation([...transactions, ...newEntries]);
        addToast(`${newEntries.length} transaction(s) recorded.`, 'success');
      } else {
        addToast("Sorry, I couldn't understand that transaction.", "warning");
      }
    } catch (e) {
      addToast("Error processing your request.", "error");
    } finally { setIsLoading(false); }
  };

  if (!isUnlocked) {
    return (
      <div className="fixed inset-0 bg-[#0f172a] flex flex-col items-center justify-center text-white">
        <div className="mb-12 text-center animate-pulse">
          <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-5xl font-black mb-6 mx-auto shadow-2xl">A</div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Artho Vault</h1>
        </div>
        <div className="flex gap-4 mb-14">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`w-4 h-4 rounded-full ${pinInput.length > i ? 'bg-indigo-500 scale-125' : 'bg-slate-800'}`} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '✕'].map((val) => (
            <button key={val} onClick={() => val === '✕' ? setPinInput(pinInput.slice(0, -1)) : handlePinPress(val.toString())} className="h-20 w-20 rounded-full flex items-center justify-center text-3xl font-bold bg-slate-800/30 active:scale-90">{val}</button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-56 font-['Inter']">
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[500] flex flex-col gap-3 w-full max-w-sm px-4 pointer-events-none">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-10">
        <header className="py-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg hover:rotate-6 transition-transform">A</div>
            <div>
                <h1 className="text-2xl font-black tracking-tighter text-slate-900 leading-none">Artho</h1>
                <div className="flex items-center gap-2 mt-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${syncState.isConnected ? 'bg-emerald-400' : 'bg-slate-300'}`}></div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {syncState.isConnected ? 'Sync Active' : 'Sync Offline'}
                    </p>
                </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setShowSync(true)} className="w-10 h-10 bg-white rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm active:scale-90 relative" title="Cloud Sync">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                {syncState.isConnected && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />}
             </button>
             <button onClick={() => setShowHistory(true)} className="w-10 h-10 bg-white rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm active:scale-90" title="History">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </button>
             <button onClick={lockApp} className="w-10 h-10 bg-[#121826] rounded-full border border-[#121826] flex items-center justify-center text-white hover:bg-slate-800 transition-all shadow-sm active:scale-90" title="Lock App">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
             </button>
          </div>
        </header>

        <Dashboard 
          transactions={transactions} 
          insights={insights} 
          visibleItems={visibleItems}
          onToggleItem={(k) => setVisibleItems(p => ({ ...p, [k]: !p[k] }))}
          filterCategory={filterCategory} setFilterCategory={setFilterCategory}
          filterSource={filterSource} setFilterSource={setFilterSource}
          filterTime={filterTime} setFilterTime={setFilterTime}
          accounts={accounts}
        />
      </div>

      <AIChatInput onProcess={handleProcessInput} isLoading={isLoading} transactions={transactions} />

      <SyncManager 
        isOpen={showSync} 
        onClose={() => setShowSync(false)}
        syncState={syncState}
        onConnect={handleGoogleConnect}
        onSyncNow={handleManualSync}
        onDisconnect={handleDisconnect}
      />

      {conflictData && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" />
          <div className="bg-white w-full max-w-lg relative rounded-[3.5rem] p-12 shadow-2xl animate-scale-in text-center">
             <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-8">⚠️</div>
             <h2 className="text-2xl font-black text-slate-900 mb-4">Sync Conflict</h2>
             <p className="text-slate-400 font-medium mb-10 leading-relaxed px-4 text-sm">
               We found a newer version of your data on Google Drive, but you also have unsynced local changes. Which one should we keep?
             </p>
             <div className="space-y-4">
                <button 
                  onClick={() => resolveConflict(true)}
                  className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 flex flex-col items-center gap-1"
                >
                  Keep Local Version
                  <span className="text-[8px] opacity-60 normal-case font-medium">Overwrites cloud data</span>
                </button>
                <button 
                  onClick={() => resolveConflict(false)}
                  className="w-full py-6 bg-slate-100 text-slate-900 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 flex flex-col items-center gap-1"
                >
                  Use Cloud Version
                  <span className="text-[8px] opacity-60 normal-case font-medium">Overwrites local data</span>
                </button>
             </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="w-full max-w-lg bg-white h-full relative shadow-2xl flex flex-col p-10 animate-slide-in">
            <h2 className="text-2xl font-black mb-10 text-slate-900">Transaction History</h2>
            <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
                {transactions.slice().reverse().map(t => (
                    <div key={t.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex justify-between items-center group transition-transform hover:scale-[1.02]">
                        <div className="flex items-center gap-4">
                            <div className={`w-1 h-10 rounded-full ${t.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <div>
                                <p className="font-bold text-slate-800 text-sm text-wrap break-words">{t.note}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t.source} • {new Date(t.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <p className={`font-black text-base flex-shrink-0 ${t.type === 'income' ? 'text-emerald-500' : 'text-slate-900'}`}>{t.type === 'income' ? '+' : '-'}৳{t.amount.toLocaleString()}</p>
                    </div>
                ))}
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in { animation: slideIn 0.3s ease-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes toastSlideIn { from { transform: translateY(-100%) translateX(0); opacity: 0; } to { transform: translateY(0) translateX(0); opacity: 1; } }
        .animate-toast-slide-in { animation: toastSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
      `}</style>
    </div>
  );
};

export default App;
