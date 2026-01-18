
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
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-6 pb-12 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent backdrop-blur-md">
      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="relative flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="আজকে কোথায় খরচ হলো?"
              disabled={isLoading}
              className="w-full bg-white border-2 text-slate-800 text-base font-medium rounded-[2.5rem] py-5 px-8 focus:outline-none focus:ring-8 focus:ring-indigo-500/5 shadow-2xl transition-all border-slate-100 focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-indigo-600 text-white p-5 rounded-[2rem] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-30 transition-all flex-shrink-0 active:scale-95 group"
          >
            {isLoading ? (
              <div className="h-6 w-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChatInput;
