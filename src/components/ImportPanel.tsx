import React, { useState, useEffect } from 'react';
import { Search, Loader2, FileInput, AlertCircle, Copy, Trash2, X } from 'lucide-react';
import { Player, ImportStatus } from '../../types';
import { fetchPlayer, sleep } from '../services/api';
import { StorageService } from '../services/storage';
import { PlayerCard } from './PlayerCard';

interface ImportPanelProps {
  foundPlayers: Player[];
  setFoundPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
}

export const ImportPanel: React.FC<ImportPanelProps> = ({ foundPlayers, setFoundPlayers }) => {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [singleId, setSingleId] = useState('');
  const [batchText, setBatchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState<ImportStatus>({
    total: 0,
    current: 0,
    success: 0,
    failed: 0,
    failedIds: [],
    isImporting: false,
  });

  // Load last session
  useEffect(() => {
    const lastIds = StorageService.loadLastImportIds();
    if (lastIds) setBatchText(lastIds);
    const cached = StorageService.loadCachedPlayers();
    if (cached.length > 0) setFoundPlayers(cached);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save cache when players change
  useEffect(() => {
    StorageService.saveCachedPlayers(foundPlayers);
  }, [foundPlayers]);

  const handleSingleSearch = async () => {
    if (!singleId.trim()) return;
    setStatus({ ...status, isImporting: true });
    try {
      const player = await fetchPlayer(singleId.trim());
      setFoundPlayers(prev => {
        // Remove duplicates
        const filtered = prev.filter(p => p.fid !== player.fid);
        return [player, ...filtered];
      });
      setSingleId('');
    } catch (error) {
      alert(`Error: ${(error as Error).message}`);
    } finally {
      setStatus({ ...status, isImporting: false });
    }
  };

  const handleBatchImport = async () => {
    StorageService.saveLastImportIds(batchText);

    // Split by newline or comma, filter empty
    const ids = batchText.split(/[\n,]/).map(s => s.trim()).filter(s => s);
    if (ids.length === 0) return;

    // Unique IDs only
    const uniqueIds: string[] = Array.from(new Set(ids));

    setStatus({
      total: uniqueIds.length,
      current: 0,
      success: 0,
      failed: 0,
      failedIds: [],
      isImporting: true,
    });

    const newPlayers: Player[] = [];
    const failed: string[] = [];

    for (let i = 0; i < uniqueIds.length; i++) {
      const id = uniqueIds[i];
      try {
        const player = await fetchPlayer(id);
        newPlayers.push(player);
        setStatus(prev => ({ ...prev, current: i + 1, success: prev.success + 1 }));
      } catch (e) {
        console.warn(`Failed to fetch ${id}`, e);
        failed.push(id);
        setStatus(prev => ({
          ...prev,
          current: i + 1,
          failed: prev.failed + 1,
          failedIds: [...prev.failedIds, id]
        }));
      }
      // Rate limit prevention
      if (i < uniqueIds.length - 1) await sleep(250);
    }

    setFoundPlayers(prev => {
        // Merge and remove duplicates based on fid
        const existingIds = new Set(prev.map(p => p.fid));
        const uniqueNew = newPlayers.filter(p => !existingIds.has(p.fid));
        return [...uniqueNew, ...prev];
    });

    setStatus(prev => ({ ...prev, isImporting: false }));

    // Auto-close progress after 2 seconds
    setTimeout(() => {
      setStatus({
        total: 0,
        current: 0,
        success: 0,
        failed: 0,
        failedIds: [],
        isImporting: false,
      });
    }, 2000);
  };

  const handleRemovePlayer = (fid: string) => {
    setFoundPlayers(prev => prev.filter(p => p.fid !== fid));
  };

  // Filter players based on search query
  const filteredPlayers = foundPlayers.filter(player => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return player.nickname?.toLowerCase().includes(query) ||
           String(player.fid).toLowerCase().includes(query);
  });

  return (
    <div className="h-full flex flex-col">
      <div className="glass-panel rounded-t-xl p-3 lg:p-4 border-b-0 shrink-0">
        <div className="flex gap-2 mb-4 bg-black/20 p-1 rounded-lg">
          <button
            onClick={() => setMode('single')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'single' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            Single Search
          </button>
          <button
            onClick={() => setMode('batch')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'batch' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            Batch Import
          </button>
        </div>

        {mode === 'single' ? (
          <div className="flex gap-2 w-full">
            <input
              type="text"
              value={singleId}
              onChange={(e) => setSingleId(e.target.value)}
              placeholder="Enter Player FID"
              className="flex-1 min-w-0 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleSingleSearch()}
            />
            <button
              onClick={handleSingleSearch}
              disabled={status.isImporting}
              className="w-10 h-10 shrink-0 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {status.isImporting ? <Loader2 className="animate-spin size-5" /> : <Search size={20} />}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder="Paste IDs here (comma or newline separated)..."
              className="w-full h-16 lg:h-24 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-xs font-mono resize-none"
            />
            <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">
                    {batchText ? batchText.split(/[\n,]/).filter(s => s.trim()).length : 0} IDs detected
                </span>
                <button
                onClick={handleBatchImport}
                disabled={status.isImporting || !batchText}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                {status.isImporting ? <Loader2 className="animate-spin size-4" /> : <FileInput size={16} />}
                Start Import
                </button>
            </div>
          </div>
        )}

        {/* Status Area */}
        {status.isImporting || status.total > 0 ? (
           <div className="mt-3 lg:mt-4 p-2 lg:p-3 bg-black/20 rounded-lg text-xs">
              <div className="flex-between mb-2 text-gray-300 flex justify-between">
                 <span>Progress: {status.current}/{status.total}</span>
                 <div className="flex items-center gap-2">
                   {status.isImporting && <Loader2 className="animate-spin size-3" />}
                   {!status.isImporting && (
                     <button
                       onClick={() => setStatus({ total: 0, current: 0, success: 0, failed: 0, failedIds: [], isImporting: false })}
                       className="text-white/40 hover:text-white transition-colors"
                       title="Close"
                     >
                       <X size={14} />
                     </button>
                   )}
                 </div>
              </div>
              <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                 <div
                    className="bg-blue-500 h-full transition-all duration-300"
                    style={{ width: `${(status.current / (status.total || 1)) * 100}%` }}
                 />
              </div>

              {!status.isImporting && status.failed > 0 && (
                  <div className="mt-2 flex items-start gap-2 text-red-300">
                      <AlertCircle size={14} className="mt-0.5" />
                      <div className="flex-1">
                          <p>Failed: {status.failed}</p>
                          <div className="flex gap-2 mt-1">
                              <button
                                onClick={() => navigator.clipboard.writeText(status.failedIds.join('\n'))}
                                className="underline hover:text-white flex items-center gap-1"
                              >
                                  <Copy size={10} /> Copy Failed IDs
                              </button>
                          </div>
                      </div>
                  </div>
              )}
           </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col glass-panel border-t-0 rounded-b-xl mt-2 lg:mt-4 min-h-0">
        <div className="p-2 lg:p-3 border-b border-white/10 shrink-0">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-white/80 text-sm lg:text-base">Found Players ({foundPlayers.length})</h3>
            <button
              onClick={() => setFoundPlayers([])}
              className="text-white/40 hover:text-red-400 transition-colors"
              title="Clear All"
            >
              <Trash2 size={16} />
            </button>
          </div>
          {foundPlayers.length > 0 && (
            <>
              <div className="relative mt-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜尋暱稱或 FID..."
                  className="w-full bg-black/20 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              {searchQuery && (
                <div className="mt-1 text-xs text-gray-400">
                  顯示 {filteredPlayers.length} / {foundPlayers.length} 位玩家
                </div>
              )}
            </>
          )}
        </div>
        <div
          className="flex-1 overflow-y-auto p-2 lg:p-3 space-y-2 custom-scrollbar"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(20, 184, 166, 0.5) rgba(0, 0, 0, 0.2)'
          }}
        >
           {foundPlayers.length === 0 && (
               <div className="text-center text-white/30 py-8 text-sm">
                   No players loaded. Search or import to begin.
               </div>
           )}
           {foundPlayers.length > 0 && filteredPlayers.length === 0 && (
               <div className="text-center text-white/30 py-8 text-sm">
                   找不到符合的玩家
               </div>
           )}
           {filteredPlayers.map(player => (
             <PlayerCard key={player.fid} player={player} onRemove={handleRemovePlayer} />
           ))}
        </div>
      </div>
    </div>
  );
};