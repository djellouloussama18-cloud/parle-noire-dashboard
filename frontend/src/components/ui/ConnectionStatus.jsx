import React, { useState, useEffect } from 'react';

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleSyncStart = () => setIsSyncing(true);
    const handleSyncEnd = () => setIsSyncing(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('queue-flushed', handleSyncEnd);
    window.addEventListener('sync-started', handleSyncStart);
    window.addEventListener('products-synced', handleSyncEnd);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('queue-flushed', handleSyncEnd);
      window.removeEventListener('sync-started', handleSyncStart);
      window.removeEventListener('products-synced', handleSyncEnd);
    };
  }, []);

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black animate-pulse">
        <span>🔄 Syncing...</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black">
        <span>🟡 Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black">
      <span>🟢 Connected</span>
    </div>
  );
}
