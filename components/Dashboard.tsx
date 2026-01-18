
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
      <div className="bg-[#121826] rounded-[3.5rem] p-12 text-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] relative overflow-hidden animate-scale-up">
        <div className="absolute top-8 right-12">
            <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-4 py-1.5 rounded-full uppercase tracking-[0.2em] border border-indigo-500/20 backdrop-blur-xl">Portfolio Summary</span>
        </div>
        <div className="space-y-3">
            <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.3em] opacity-80">Net Balance</p>
            <h1 
              className="text-8xl font-black tracking-tighter cursor-pointer transition-all hover:scale-[1.01] select-none active:scale-95" 
              onClick={() => onToggleItem('total')}
            >
                {visibleItems['total'] ? `৳${stats.total.toLocaleString()}` : '৳•••••'}
            </h1>
        </div>
        <div className="grid grid-cols-2 gap-8 mt-16">
            <div className="bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inbound Cashflow</p>
                </div>
                <p className="text-3xl font-black text-emerald-400">৳{stats.inbound.toLocaleString()}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Outbound Burn</p>
                </div>
                <p className="text-3xl font-black text-rose-400">৳{stats.outbound.toLocaleString()}</p>
            </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Filter Ledger</h3>
        </div>
        <div className="flex flex-wrap gap-3">
            {/* Category Filters */}
            <button 
                onClick={() => setFilterCategory('All')}
                className={`px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${filterCategory === 'All' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
            >
                All Categories
            </button>
            {CATEGORIES.map(cat => (
                <button 
                    key={cat}
                    onClick={() => setFilterCategory(cat as Category)}
                    className={`px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${filterCategory === cat ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
                >
                    {cat}
                </button>
            ))}
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
            {/* Time Filters */}
            {timeOptions.map(opt => (
                <button 
                    key={opt}
                    onClick={() => setFilterTime(opt)}
                    className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filterTime === opt ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                    {opt}
                </button>
            ))}
            <div className="w-px h-8 bg-slate-200 mx-2" />
            {/* Account Filters */}
            <button 
                onClick={() => setFilterSource('All')}
                className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filterSource === 'All' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
                All Accounts
            </button>
            {accounts.map(acc => (
                <button 
                    key={acc.id}
                    onClick={() => setFilterSource(acc.name)}
                    className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filterSource === acc.name ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                    {acc.name}
                </button>
            ))}
        </div>
      </div>

      {/* Account Vaults */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Account Vaults</h3>
        </div>
        <div className="grid grid-cols-4 gap-6">
            {accounts.map((acc, i) => (
                <div 
                    key={acc.id} 
                    onClick={() => onToggleItem(acc.name)}
                    style={{ animationDelay: `${i * 100}ms` }}
                    className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center group cursor-pointer active:scale-95 transition-all animate-slide-up-fade"
                >
                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:bg-indigo-50 text-3xl transition-colors">
                        {acc.icon}
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-60">{acc.name}</p>
                    <p className="text-lg font-black text-slate-900">{formatMasked(accountBalances[acc.name] || 0, acc.name)}</p>
                </div>
            ))}
        </div>
      </div>

      {/* Advisor Insights */}
      {insights.length > 0 && (
        <div className="grid grid-cols-2 gap-6">
            {insights.map((insight, idx) => {
                const isSavings = insight.title.includes('সঞ্চয়');
                return (
                  <div 
                    key={idx} 
                    style={{ animationDelay: `${idx * 150}ms` }}
                    className="bg-[#F2FBF6] px-8 py-7 rounded-[3rem] border border-[#E0F2E9] flex items-center gap-6 transition-all hover:shadow-md animate-slide-up-fade"
                  >
                      <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center">
                          {isSavings ? (
                            <img src="https://img.icons8.com/fluency/80/sparkling.png" className="w-full h-full object-contain" alt="sparkle" />
                          ) : (
                            <img src="https://img.icons8.com/fluency/80/brain.png" className="w-full h-full object-contain" alt="brain" />
                          )}
                      </div>
                      <div className="space-y-0.5">
                          <h4 className="font-bold text-[#8A9BA8] text-[12px] uppercase tracking-wide">{insight.title}</h4>
                          <p className="text-slate-800 text-[14px] font-bold leading-[1.5] max-w-xs">{insight.message}</p>
                      </div>
                  </div>
                );
            })}
        </div>
      )}

      {/* Analytics Section */}
      <div className="grid grid-cols-2 gap-10">
          <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm min-h-[440px] flex flex-col animate-slide-up-fade">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-12">Asset Allocation</h3>
            <div className="flex-1 relative">
                {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={categoryData} 
                                cx="50%" cy="50%" innerRadius={75} outerRadius={110} 
                                paddingAngle={8} dataKey="value" stroke="none"
                            >
                                {categoryData.map((e, i) => <Cell key={i} fill={CATEGORY_COLORS[e.name]} />)}
                            </Pie>
                            <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 15px 45px rgba(0,0,0,0.1)'}} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-300 text-[11px] font-black uppercase tracking-widest bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100">Empty Ledger</div>
                )}
            </div>
          </div>

          <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm min-h-[440px] animate-slide-up-fade" style={{ animationDelay: '200ms' }}>
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-12">Live Activity Stream</h3>
            <div className="space-y-7 max-h-[290px] overflow-y-auto scrollbar-hide pr-2">
                {filteredTransactions.length > 0 ? filteredTransactions.slice().reverse().slice(0, 15).map((t, i) => (
                    <div 
                      key={t.id} 
                      style={{ animationDelay: `${i * 50}ms` }}
                      className="flex items-center justify-between group animate-slide-up-fade"
                    >
                        <div className="flex items-center gap-5">
                            <div className={`w-1.5 h-11 rounded-full ${t.type === 'income' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                            <div>
                                <p className="text-[14px] font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">{t.note}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">{t.source} • {new Date(t.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <p className={`text-[15px] font-black ${t.type === 'income' ? 'text-emerald-500' : 'text-slate-900'}`}>
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
