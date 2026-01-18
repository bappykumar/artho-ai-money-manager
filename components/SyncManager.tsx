
import React from 'react';
import { SyncState } from '../types';

interface SyncManagerProps {
  syncState: SyncState;
  onConnect: () => void;
  onSyncNow: () => void;
  onDisconnect: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const SyncManager: React.FC<SyncManagerProps> = ({ 
  syncState, onConnect, onSyncNow, onDisconnect, isOpen, onClose 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="bg-white w-full max-w-md relative rounded-[3rem] p-10 shadow-2xl overflow-hidden animate-scale-in">
        <div className="absolute top-0 left-0 right-0 h-2 bg-indigo-600/10 overflow-hidden">
            {syncState.isSyncing && <div className="h-full bg-indigo-600 animate-progress" />}
        </div>
        
        <div className="flex flex-col items-center text-center space-y-6">
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-inner ${syncState.isConnected ? 'bg-indigo-50' : 'bg-slate-50'}`}>
                {syncState.isConnected ? '☁️' : '📁'}
            </div>
            
            <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900">Cloud Sync</h2>
                <p className="text-sm text-slate-400 font-medium px-4">
                    {syncState.isConnected 
                        ? 'Your data is securely backed up to your personal Google Drive.' 
                        : 'Connect your Google account to enable cross-device synchronization.'}
                </p>
            </div>

            {syncState.error && (
              <div className="w-full bg-rose-50 p-4 rounded-2xl border border-rose-100 mt-4">
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Sync Error</p>
                <p className="text-[12px] text-rose-600 font-bold leading-tight">{syncState.error}</p>
              </div>
            )}

            <div className="w-full space-y-3 pt-4">
                {syncState.isConnected ? (
                    <>
                        <button 
                            onClick={onSyncNow}
                            disabled={syncState.isSyncing}
                            className="w-full py-5 bg-indigo-600 text-white rounded-[1.8rem] font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {syncState.isSyncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                        <button 
                            onClick={onDisconnect}
                            className="w-full py-5 text-rose-500 font-black text-[11px] uppercase tracking-widest hover:bg-rose-50 rounded-[1.8rem] transition-all"
                        >
                            Disconnect Account
                        </button>
                    </>
                ) : (
                    <button 
                        onClick={onConnect}
                        className="w-full py-5 bg-slate-900 text-white rounded-[1.8rem] font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-6 h-6 object-contain invert" alt="google" />
                        Connect Google Drive
                    </button>
                )}
            </div>

            {syncState.lastSync && (
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pt-4">
                    Last synced: {new Date(syncState.lastSync).toLocaleString()}
                </p>
            )}
        </div>
      </div>
      <style>{`
        @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes progress { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
        .animate-progress { animation: progress 1.5s infinite linear; }
      `}</style>
    </div>
  );
};

export default SyncManager;
