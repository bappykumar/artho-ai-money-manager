
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Transaction, Category, Account, SpendingInsight } from '../types';
import { CATEGORY_COLORS, CATEGORIES } from '../constants';

interface DashboardProps {
  transactions: Transaction[];
  insights: SpendingInsight[];
  visibleItems: Record<string, boolean>;
  onToggleItem: (key: string) => void;
  filterCategory: Category | 'All';
  setFilterCategory: (c: Category | 'All') => void;
  filterSource: string | 'All';
  setFilterSource: (s: string | 'All') => void;
  filterTime: 'All' | 'Today' | 'Week' | 'Month';
  setFilterTime: (t: 'All' | 'Today' | 'Week' | 'Month') => void;
  accounts: Account[];
}

const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  insights,
  visibleItems, 
  onToggleItem,
  filterCategory, setFilterCategory,
  filterSource, setFilterSource,
  filterTime, setFilterTime,
  accounts
}) => {
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchCategory = filterCategory === 'All' || t.category === filterCategory;
      const matchSource = filterSource === 'All' || t.source === filterSource;
      
      let matchTime = true;
      const date = new Date(t.date);
      const now = new Date();
      if (filterTime === 'Today') {
        matchTime = date.toDateString() === now.toDateString();
      } else if (filterTime === 'Week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchTime = date >= weekAgo;
      } else if (filterTime === 'Month') {
        matchTime = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }
      
      return matchCategory && matchSource && matchTime;
    });
  }, [transactions, filterCategory, filterSource, filterTime]);

  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    accounts.forEach(a => balances[a.name] = 0);
    transactions.forEach(t => {
      const amt = t.type === 'income' ? t.amount : -t.amount;
      balances[t.source] = (balances[t.source] || 0) + amt;
    });
    return balances;
  }, [transactions, accounts]);

  const stats = useMemo(() => {
    let inbound = 0;
    let outbound = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'income') inbound += t.amount;
      else outbound += t.amount;
    });
    return { inbound, outbound, total: inbound - outbound };
  }, [filteredTransactions]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
      data[t.category] = (data[t.category] || 0) + t.amount;
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const formatMasked = (val: number, key: string) => visibleItems[key] ? `৳${val.toLocaleString()}` : '৳••••';

  const timeOptions: ('All' | 'Today' | 'Week' | 'Month')[] = ['All', 'Today', 'Week', 'Month'];

  return (
    <div className="space-y-12 animate-fade-in pb-10">
      
      {/* Portfolio Card */}
      <div className="bg-[#121826] rounded-[3rem] p-10 text-white shadow-xl relative overflow-hidden animate-scale-up">
        <div className="flex justify-between items-start mb-6">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Liquid Portfolio</h3>
            <button 
                onClick={() => onToggleItem('total')}
                className="text-[9px] font-black text-slate-500 border border-slate-700/50 bg-slate-800/30 px-3 py-1.5 rounded-full uppercase tracking-[0.2em] hover:bg-slate-700 transition-colors"
            >
                {visibleItems['total'] ? 'Hide' : 'Hidden'}
            </button>
        </div>
        
        <div className="mb-10">
            <h1 className="text-7xl font-black tracking-tighter cursor-pointer selection:bg-indigo-500/30" onClick={() => onToggleItem('total')}>
                {visibleItems['total'] ? `৳${stats.total.toLocaleString()}` : '৳••••'}
            </h1>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/30 p-6 rounded-[2rem] border border-slate-700/30">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Inbound</p>
                <p className="text-2xl font-black text-emerald-400">৳{stats.inbound.toLocaleString()}</p>
            </div>
            <div className="bg-slate-800/30 p-6 rounded-[2rem] border border-slate-700/30">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Outbound</p>
                <p className="text-2xl font-black text-rose-400">৳{stats.outbound.toLocaleString()}</p>
            </div>
        </div>
      </div>

      {/* Account Vaults */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-2">Account Vaults</h3>
        <div className="grid grid-cols-4 gap-5">
            {accounts.map((acc, i) => (
                <div 
                    key={acc.id} 
                    onClick={() => onToggleItem(acc.name)}
                    style={{ animationDelay: `${i * 100}ms` }}
                    className="bg-white py-8 px-4 rounded-[2rem] border border-slate-100 shadow-sm text-center group cursor-pointer active:scale-95 transition-all hover:shadow-md animate-slide-up-fade"
                >
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-indigo-50 text-2xl transition-colors shadow-inner">
                        {acc.icon}
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-70 truncate px-2">{acc.name}</p>
                    <p className="text-base font-black text-slate-900">{formatMasked(accountBalances[acc.name] || 0, acc.name)}</p>
                </div>
            ))}
        </div>
      </div>

      {/* Advisor Brief - Horizontal Layout */}
      {insights.length > 0 && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 animate-slide-up-fade" style={{ animationDelay: '200ms' }}>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                     </div>
                     <div>
                        <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-wide">Advisor Brief</h3>
                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em]">AI Strategic Pulse</p>
                     </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Optimizing Wealth</span>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-12 bg-slate-100 hidden md:block" />
                 {insights.map((insight, idx) => {
                    const isSavings = insight.title.includes('সঞ্চয়');
                    return (
                        <div key={idx} className="flex gap-4 items-start p-2">
                             <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-xl bg-slate-50 rounded-xl">
                                {isSavings ? '✨' : '💡'}
                             </div>
                             <div>
                                 <h4 className={`text-[11px] font-bold mb-1 ${isSavings ? 'text-indigo-500' : 'text-amber-600'}`}>
                                     {insight.title}
                                 </h4>
                                 <p className="text-[13px] text-slate-700 font-medium leading-relaxed italic">"{insight.message}"</p>
                             </div>
                        </div>
                    );
                 })}
            </div>
        </div>
      )}

      {/* Filters - 3 Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="space-y-2">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Category</label>
               <div className="relative">
                   <select 
                       value={filterCategory} 
                       onChange={(e) => setFilterCategory(e.target.value as Category | 'All')}
                       className="w-full appearance-none bg-white border border-slate-200 rounded-2xl py-3.5 px-5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm"
                   >
                       <option value="All">All Categories</option>
                       {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                   </select>
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                   </div>
               </div>
           </div>

           <div className="space-y-2">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Source</label>
               <div className="relative">
                   <select 
                       value={filterSource} 
                       onChange={(e) => setFilterSource(e.target.value)}
                       className="w-full appearance-none bg-white border border-slate-200 rounded-2xl py-3.5 px-5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm"
                   >
                       <option value="All">All Sources</option>
                       {accounts.map(acc => <option key={acc.id} value={acc.name}>{acc.name}</option>)}
                   </select>
                   <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                   </div>
               </div>
           </div>

           <div className="space-y-2">
               <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Time Period</label>
               <div className="flex bg-white rounded-2xl p-1 border border-slate-200 shadow-sm h-[46px] items-center">
                   {timeOptions.map(opt => (
                       <button 
                           key={opt}
                           onClick={() => setFilterTime(opt)}
                           className={`flex-1 h-full rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${filterTime === opt ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                       >
                           {opt === 'All' ? 'All' : opt}
                       </button>
                   ))}
               </div>
           </div>
      </div>

      {/* Analytics Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Allocation */}
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm min-h-[400px] flex flex-col animate-slide-up-fade">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Allocation</h3>
            <div className="flex-1 relative flex items-center justify-center">
                {categoryData.length > 0 ? (
                    <div className="relative w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={categoryData} 
                                    cx="50%" cy="50%" innerRadius={80} outerRadius={105} 
                                    paddingAngle={5} dataKey="value" stroke="none" cornerRadius={6}
                                >
                                    {categoryData.map((e, i) => <Cell key={i} fill={CATEGORY_COLORS[e.name]} />)}
                                </Pie>
                                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '12px'}} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                            <p className="text-2xl font-black text-slate-800">৳{stats.outbound.toLocaleString()}</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                         <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">📉</div>
                         <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Empty Ledger</p>
                    </div>
                )}
            </div>
            
            {/* Simple Legend */}
            <div className="flex flex-wrap justify-center gap-3 mt-6">
                {categoryData.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[item.name] }}></div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item.name}</span>
                    </div>
                ))}
                {categoryData.length > 3 && (
                    <div className="flex items-center gap-1.5">
                         <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Others</span>
                    </div>
                )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm min-h-[400px] animate-slide-up-fade" style={{ animationDelay: '200ms' }}>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Recent Activity</h3>
            <div className="space-y-6 max-h-[300px] overflow-y-auto scrollbar-hide pr-2">
                {filteredTransactions.length > 0 ? filteredTransactions.slice().reverse().slice(0, 15).map((t, i) => (
                    <div 
                      key={t.id} 
                      style={{ animationDelay: `${i * 50}ms` }}
                      className="flex items-center justify-between group animate-slide-up-fade"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${t.type === 'income' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                {t.type === 'income' ? '💰' : (
                                    // Use a category icon helper here if needed, defaulting to generic
                                    t.category === 'Food' ? '🍔' : 
                                    t.category === 'Transport' ? '🚕' : 
                                    t.category === 'Shopping' ? '🛍️' : '📄'
                                )}
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-slate-800 line-clamp-1">{t.note}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t.source}</p>
                            </div>
                        </div>
                        <p className={`text-[13px] font-black ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {t.type === 'income' ? '+' : '-'}৳{t.amount.toLocaleString()}
                        </p>
                    </div>
                )) : (
                   <div className="h-40 flex items-center justify-center text-[10px] font-black text-slate-300 uppercase tracking-widest">No activity found</div>
                )}
            </div>
          </div>
      </div>

      <style>{`
        @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-scale-up { animation: scaleUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        @keyframes slideUpFade { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up-fade { animation: slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
        
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Dashboard;
