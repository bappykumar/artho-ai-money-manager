
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
    <div className="fixed bottom-10 left-0 right-0 z-[150] px-6 animate-slide-up">
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="আজকে কোথায় খরচ হলো?"
            disabled={isLoading}
            className="w-full bg-white border-none text-slate-800 text-sm font-semibold rounded-full py-6 pl-8 pr-20 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all placeholder:text-slate-300 placeholder:font-medium"
          />

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-3 top-3 bottom-3 aspect-square bg-indigo-200/50 text-indigo-600 rounded-full hover:bg-indigo-600 hover:text-white disabled:opacity-50 transition-all flex items-center justify-center active:scale-95"
          >
            {isLoading ? (
              <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChatInput;
