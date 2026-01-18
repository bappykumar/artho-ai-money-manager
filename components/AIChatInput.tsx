
import React, { useState } from 'react';
import { Transaction } from '../types';

interface AIChatInputProps {
  onProcess: (input: string) => Promise<void>;
  isLoading: boolean;
  transactions: Transaction[];
}

const AIChatInput: React.FC<AIChatInputProps> = ({ onProcess, isLoading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const finalInput = input;
    setInput('');
    await onProcess(finalInput);
  };

  return (
    <div className="fixed bottom-12 left-0 right-0 z-[150] px-10 animate-slide-up">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="relative group">
          <div className="absolute inset-0 bg-indigo-500/10 blur-[40px] rounded-full group-focus-within:bg-indigo-500/20 transition-all duration-700" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What did you spend today? (e.g. 500tk for lunch from BKASH)"
            disabled={isLoading}
            className="w-full bg-white/90 backdrop-blur-2xl border border-slate-100 text-slate-900 text-lg font-semibold rounded-[3rem] py-7 pl-12 pr-28 focus:outline-none focus:ring-[15px] focus:ring-indigo-600/5 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.15)] transition-all placeholder:text-slate-400 placeholder:font-medium relative z-10"
          />

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-4 top-4 bottom-4 aspect-square bg-indigo-600 text-white rounded-full shadow-[0_15px_30px_-5px_rgba(79,70,229,0.4)] hover:bg-indigo-700 disabled:bg-slate-200 transition-all flex items-center justify-center active:scale-90 z-20"
          >
            {isLoading ? (
              <div className="h-6 w-6 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l7-7m0 0l-7-7m7 7H5" />
              </svg>
            )}
          </button>
        </form>
        <div className="mt-4 flex justify-center gap-6">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-60">Natural Language Engine</span>
            <span className="text-[9px] text-slate-200">•</span>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-60">Bilingual Support (বাংলা/EN)</span>
        </div>
      </div>
    </div>
  );
};

export default AIChatInput;
