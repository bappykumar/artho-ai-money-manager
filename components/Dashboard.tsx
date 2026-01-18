
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Transaction, SpendingInsight, AccountSource, Category } from '../types';
import { CATEGORY_COLORS, SOURCE_COLORS, SOURCE_ICONS, ICONS, CATEGORIES } from '../constants';

interface DashboardProps {
  transactions: Transaction[];
  insights: SpendingInsight[];
  visibleItems: Record<string, boolean>;
  onToggleItem: (key: string) => void;
  // Filter props
  filterCategory: Category | 'All';
  setFilterCategory: (c: Category | 'All') => void;
  filterSource: AccountSource | 'All';
  setFilterSource: (s: AccountSource | 'All') => void;
  filterTime: 'All' | 'Today' | 'Week' | 'Month';
  setFilterTime: (t: 'All' | 'Today' | 'Week' | 'Month') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  insights, 
  visibleItems, 
  onToggleItem,
  filterCategory,
  setFilterCategory,
  filterSource,
  setFilterSource,
  filterTime,
  setFilterTime
}) => {
  const accountBalances = useMemo(() => {
    const balances: Record<AccountSource, number> = {
      'BRAC BANK': 0,
      'DBBL': 0,
      'BKASH': 0,
      'CASH': 0
    };
    transactions.forEach(t => {
      const amt = t.type === 'income' ? t.amount : -t.amount;
      balances[t.source] = (balances[t.source] || 0) + amt;
    });
    return balances;
  }, [transactions]);

  const totalBalance = useMemo(() => {
    // FIX: Explicitly typing reduce parameters to resolve 'unknown' operator error
    return Object.values(accountBalances).reduce((a: number, b: number) => a + b, 0);
  }, [accountBalances]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      data[t.category] = (data[t.category] || 0) + t.amount;
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const recentHistory = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  }, [transactions]);

  const formatMasked = (val: number, key: string) => {
    if (!visibleItems[key]) return '৳****';
    return `৳${val.toLocaleString()}`;
  };

  const totalIncomeVal = transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
  const totalExpenseVal = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);

  return (
    <div className="space-y-6 pb-64 px-2 max-w-4xl mx-auto">
      {/* Main Balance Card */}
      <div 
        onClick={() => onToggleItem('total')}
        className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden cursor-pointer group active:scale-[0.98] transition-all duration-300 border border-white/5"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full -mr-24 -mt-24"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] opacity-80">Liquid Portfolio</p>
            <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border transition-all ${visibleItems['total'] ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10' : 'border-slate-800 text-slate-500 bg-slate-800/50'}`}>
               {visibleItems['total'] ? 'Public' : 'Hidden'}
            </div>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tighter transition-all tabular-nums leading-none mb-8">
            {formatMasked(totalBalance, 'total')}
          </h1>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-500/5 p-4 rounded-[1.5rem] border border-emerald-500/10 backdrop-blur-sm">
              <p className="text-slate-500 text-[8px] uppercase font-black tracking-widest mb-1">Inbound</p>
              <p className="text-lg font-black text-emerald-400 tabular-nums">৳{totalIncomeVal.toLocaleString()}</p>
            </div>
            <div className="bg-rose-500/5 p-4 rounded-[1.5rem] border border-rose-500/10 backdrop-blur-sm">
              <p className="text-slate-500 text-[8px] uppercase font-black tracking-widest mb-1">Outbound</p>
              <p className="text-lg font-black text-rose-400 tabular-nums">৳{totalExpenseVal.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Vaults - GRID DESIGNED TO FILL SPACE - NOW ABOVE ADVISOR BRIEF */}
      <div className="space-y-3">
        <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] px-2">Account Vaults</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-1">
          {(Object.entries(accountBalances) as [AccountSource, number][]).map(([source, balance]) => (
            <div 
              key={source}
              onClick={() => onToggleItem(source)}
              className="bg-white p-5 rounded-[1.75rem] border border-slate-200 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 hover:border-indigo-200 cursor-pointer active:scale-95 group flex flex-col items-center text-center"
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 border border-slate-50 transition-transform group-hover:scale-110"
                style={{ backgroundColor: SOURCE_COLORS[source] + '08' }}
              >
                <span className="text-xl" role="img" aria-label={source}>{SOURCE_ICONS[source]}</span>
              </div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{source}</p>
              <p className="text-sm font-black text-slate-800 tabular-nums">{formatMasked(balance, source)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Artho Advisor - MINIMAL DESIGN */}
      {insights.length >= 2 && (
        <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-base shadow-sm border border-indigo-100 group-hover:scale-110 transition-transform">🧠</div>
              <div>
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none">Advisor Brief</h2>
                <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest mt-1 opacity-70">AI Strategic Pulse</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
               <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Optimizing Wealth</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {insights.slice(0, 2).map((insight, idx) => (
              <div key={idx} className="relative pl-4 border-l border-slate-100 group/item hover:border-indigo-200 transition-all">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs">{insight.type === 'warning' ? '⚠️' : insight.type === 'positive' ? '✨' : '💡'}</span>
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover/item:text-indigo-600 transition-colors">{insight.title}</h3>
                </div>
                <p className="text-[11px] font-semibold text-slate-600 leading-relaxed italic">
                  "{insight.message}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTERS SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-1 pt-2">
        <div className="flex flex-col gap-1">
          <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Category</label>
          <div className="relative">
            <select 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="w-full bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-wider rounded-xl px-4 py-2.5 outline-none cursor-pointer shadow-sm appearance-none hover:bg-slate-50 transition-all text-slate-700"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Source</label>
          <div className="relative">
            <select 
              value={filterSource} 
              onChange={(e) => setFilterSource(e.target.value as any)}
              className="w-full bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-wider rounded-xl px-4 py-2.5 outline-none cursor-pointer shadow-sm appearance-none hover:bg-slate-50 transition-all text-slate-700"
            >
              <option value="All">All Sources</option>
              {Object.keys(SOURCE_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1">Time Period</label>
          <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden p-0.5 shadow-sm h-[38px] items-center">
            {['All', 'Today', 'Week', 'Month'].map(t => (
              <button
                key={t}
                onClick={() => setFilterTime(t as any)}
                className={`flex-1 h-full px-1 text-[8px] font-black uppercase tracking-widest transition-all ${filterTime === t ? 'bg-indigo-600 text-white rounded-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Charts & Records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col">
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Allocation</h3>
          {categoryData.length > 0 ? (
            <div className="flex-1 flex flex-col items-center">
              <div className="h-[180px] w-full relative mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-black text-slate-800">৳{totalExpenseVal.toLocaleString()}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full">
                {categoryData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[entry.name] }}></div>
                    <span className="text-[8px] font-black uppercase text-slate-500">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center opacity-30 py-10">🏜️</div>
          )}
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {recentHistory.map((t) => (
              <div key={t.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-lg border border-slate-100 group-hover:scale-105 transition-all">
                    {ICONS[t.category as keyof typeof ICONS]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 mb-0.5">{t.note}</p>
                    <p className="text-[8px] font-black uppercase tracking-tighter" style={{ color: SOURCE_COLORS[t.source] }}>{t.source}</p>
                  </div>
                </div>
                <p className={`text-sm font-black tabular-nums ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {t.type === 'income' ? '+' : '-'}৳{t.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
