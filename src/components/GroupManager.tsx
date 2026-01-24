import React, { useState, useEffect, useCallback } from 'react';
import { PlayerGroup, GroupPlayer } from '../../types';
import { StorageService } from '../services/storage';
import { Plus, Download, GripVertical, Trash2 } from 'lucide-react';
import { useToast } from './ui/Toast';
import { Modal } from './ui/Modal';
import { GroupTabs } from './GroupManager/GroupTabs';
import { GroupTable } from './GroupManager/GroupTable';

export const GroupManager: React.FC = () => {
  const { addToast } = useToast();
  
  // Data State
  const [groups, setGroups] = useState<PlayerGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    type: 'ADD_GROUP' | 'RENAME_GROUP' | 'DELETE_GROUP' | 'ADD_COL' | 'RENAME_COL' | 'DELETE_COL';
    title: string;
    inputValue?: string;
    targetId?: string;
    confirmLabel?: string;
    isDestructive?: boolean;
  } | null>(null);
  
  // Temporary input state for modal
  const [tempInput, setTempInput] = useState('');

  // --- Initialization ---
  useEffect(() => {
    const saved = StorageService.loadGroups();
    if (saved.length > 0) {
      setGroups(saved);
      setActiveGroupId(saved[0].id);
    } else {
        const defaultGroup: PlayerGroup = {
            id: 'default',
            name: 'Main List',
            columns: [{ id: 'col_note', name: 'Note', type: 'text' }],
            players: []
        };
        setGroups([defaultGroup]);
        setActiveGroupId('default');
    }
  }, []);

  useEffect(() => {
    if (groups.length > 0) StorageService.saveGroups(groups);
  }, [groups]);

  const activeGroup = groups.find(g => g.id === activeGroupId);

  // --- Modal Handlers ---
  const openModal = (config: typeof modalConfig) => {
    setModalConfig(config);
    setTempInput(config?.inputValue || '');
    setModalOpen(true);
  };

  const handleModalSubmit = () => {
    if (!modalConfig) return;
    const { type, targetId } = modalConfig;

    switch (type) {
      case 'ADD_GROUP':
        if (!tempInput.trim()) return;
        const newGroup: PlayerGroup = {
          id: Date.now().toString(),
          name: tempInput.trim(),
          columns: [{ id: 'col_' + Date.now(), name: 'Note', type: 'text' }],
          players: []
        };
        setGroups([...groups, newGroup]);
        setActiveGroupId(newGroup.id);
        addToast('Group created', 'success');
        break;

      case 'RENAME_GROUP':
        if (!tempInput.trim() || !targetId) return;
        setGroups(prev => prev.map(g => g.id === targetId ? { ...g, name: tempInput.trim() } : g));
        addToast('Group renamed', 'success');
        break;

      case 'DELETE_GROUP':
        if (!targetId) return;
        const newGroups = groups.filter(g => g.id !== targetId);
        setGroups(newGroups);
        if (activeGroupId === targetId && newGroups.length > 0) {
            setActiveGroupId(newGroups[0].id);
        }
        addToast('Group deleted', 'success');
        break;

      case 'ADD_COL':
        if (!tempInput.trim()) return;
        setGroups(prev => prev.map(g => {
          if (g.id === activeGroupId) {
            return {
              ...g,
              columns: [...g.columns, { id: 'col_' + Date.now(), name: tempInput.trim(), type: 'text' }]
            };
          }
          return g;
        }));
        addToast('Column added', 'success');
        break;

      case 'RENAME_COL':
        if (!tempInput.trim() || !targetId) return;
        setGroups(prev => prev.map(g => {
          if (g.id === activeGroupId) {
            return {
              ...g,
              columns: g.columns.map(c => c.id === targetId ? { ...c, name: tempInput.trim() } : c)
            };
          }
          return g;
        }));
        addToast('Column renamed', 'success');
        break;

      case 'DELETE_COL':
        if (!targetId) return;
        setGroups(prev => prev.map(g => {
          if (g.id === activeGroupId) {
            return {
              ...g,
              columns: g.columns.filter(c => c.id !== targetId)
            };
          }
          return g;
        }));
        addToast('Column deleted', 'info');
        break;
    }
    setModalOpen(false);
  };

  // --- CRUD Actions ---

  const removePlayer = (fid: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id === activeGroupId) {
        return {
          ...g,
          players: g.players.filter(p => p.fid !== fid)
        };
      }
      return g;
    }));
    addToast('Player removed', 'info');
  };

  const updateCustomData = (playerId: string, colId: string, value: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id === activeGroupId) {
        return {
          ...g,
          players: g.players.map(p => {
            if (p.fid === playerId) {
              return { ...p, customData: { ...p.customData, [colId]: value } };
            }
            return p;
          })
        };
      }
      return g;
    }));
  };

  // --- Drag & Drop Logic (Reordering) ---

  const reorderGroups = (fromIdx: number, toIdx: number) => {
    const newGroups = [...groups];
    const [moved] = newGroups.splice(fromIdx, 1);
    newGroups.splice(toIdx, 0, moved);
    setGroups(newGroups);
  };

  const reorderColumns = (fromIdx: number, toIdx: number) => {
    setGroups(prev => prev.map(g => {
      if (g.id === activeGroupId) {
        const newCols = [...g.columns];
        const [moved] = newCols.splice(fromIdx, 1);
        newCols.splice(toIdx, 0, moved);
        return { ...g, columns: newCols };
      }
      return g;
    }));
  };

  const reorderRows = (fromIdx: number, toIdx: number) => {
    setGroups(prev => prev.map(g => {
      if (g.id === activeGroupId) {
        const newPlayers = [...g.players];
        const [moved] = newPlayers.splice(fromIdx, 1);
        newPlayers.splice(toIdx, 0, moved);
        return { ...g, players: newPlayers };
      }
      return g;
    }));
  };

  // --- Drag & Drop Logic (Importing Players) ---
  const handleDragOver = (e: React.DragEvent) => {
    // Check if dragging a file or reordering internal items
    if (e.dataTransfer.types.includes('text/type')) {
       // Internal drag (ignore here, handled in subcomponents)
       return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    // Only handle external player drops (application/json)
    if (e.dataTransfer.types.includes('text/type')) return;

    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data || !activeGroupId) return;

    try {
      const player = JSON.parse(data);
      if (activeGroup?.players.some(p => p.fid === player.fid)) {
        addToast('Player already in this group', 'error');
        return;
      }

      setGroups(prev => prev.map(g => {
        if (g.id === activeGroupId) {
          return {
            ...g,
            players: [...g.players, { ...player, customData: {} }]
          };
        }
        return g;
      }));
      addToast(`${player.nickname} added`, 'success');
    } catch (err) {
      console.error('Drop error', err);
    }
  };

  // Handle player addition from touch events
  const addPlayerToGroup = useCallback((player: any) => {
    if (!activeGroupId) return;

    if (activeGroup?.players.some(p => p.fid === player.fid)) {
      addToast('Player already in this group', 'error');
      return;
    }

    setGroups(prev => prev.map(g => {
      if (g.id === activeGroupId) {
        return {
          ...g,
          players: [...g.players, { ...player, customData: {} }]
        };
      }
      return g;
    }));
    addToast(`${player.nickname} added`, 'success');
  }, [activeGroupId, activeGroup, addToast]);

  // Listen for custom player-drop events from touch interactions
  useEffect(() => {
    const handlePlayerDrop = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.player) {
        addPlayerToGroup(customEvent.detail.player);
      }
    };

    document.addEventListener('player-drop', handlePlayerDrop);
    return () => {
      document.removeEventListener('player-drop', handlePlayerDrop);
    };
  }, [addPlayerToGroup]);

  // Listen for quick-add events from PlayerCard buttons
  useEffect(() => {
    const handleQuickAdd = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.player) {
        addPlayerToGroup(customEvent.detail.player);
      }
    };

    document.addEventListener('quick-add-player', handleQuickAdd);
    return () => {
      document.removeEventListener('quick-add-player', handleQuickAdd);
    };
  }, [addPlayerToGroup]);

  const exportTSV = () => {
    if (!activeGroup) return;

    // Format:
    // Group Name:
    // Player1, Note1
    // Player2,
    // Player3, Note3

    const groupHeader = `${activeGroup.name}:`;
    const rows = activeGroup.players.map(p => {
      // Get note from custom data (assuming first column is Note)
      const note = activeGroup.columns.length > 0
        ? p.customData[activeGroup.columns[0].id] || ''
        : '';

      // Format: "Nickname," or "Nickname, Note"
      return note ? `${p.nickname}, ${note}` : `${p.nickname},`;
    });

    const content = [groupHeader, ...rows].join('\n');
    navigator.clipboard.writeText(content).then(() => {
      addToast('Copied to clipboard', 'success');
    });
  };

  return (
    <div className="h-full flex flex-col font-sans">
      <GroupTabs 
        groups={groups}
        activeGroupId={activeGroupId}
        onSwitchGroup={setActiveGroupId}
        onAddGroup={() => openModal({ type: 'ADD_GROUP', title: 'Create New Group', confirmLabel: 'Create' })}
        onRenameGroup={(id, name) => openModal({ type: 'RENAME_GROUP', title: 'Rename Group', inputValue: name, targetId: id, confirmLabel: 'Save' })}
        onDeleteGroup={(id) => {
            if (groups.length <= 1) return addToast('Cannot delete last group', 'error');
            openModal({ type: 'DELETE_GROUP', title: 'Delete Group?', targetId: id, confirmLabel: 'Delete', isDestructive: true });
        }}
        onReorderGroups={reorderGroups}
      />

      {/* Main Content Area */}
      <div 
        className="flex-1 glass-panel rounded-xl overflow-hidden flex flex-col relative shadow-2xl transition-all"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {!activeGroup ? (
           <div className="flex-1 flex items-center justify-center text-white/30 flex-col gap-4">
             <div className="p-6 rounded-full bg-white/5 border border-white/5">
                <GripVertical size={48} className="opacity-50" />
             </div>
             <p className="text-lg">Select or create a group to start managing players</p>
           </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="px-4 py-3 border-b border-white/10 flex flex-wrap gap-4 justify-between items-center bg-black/20">
              <div className="flex items-center gap-2">
                 <div className="text-sm text-gray-400 mr-2 flex flex-col leading-tight">
                    <span className="text-white font-bold text-lg">{activeGroup.name}</span>
                    <span className="text-xs">{activeGroup.players.length} members</span>
                 </div>
                 <div className="h-8 w-px bg-white/10 mx-2"></div>
                 <button
                    onClick={() => {
                        if (groups.length <= 1) return addToast('Cannot delete last group', 'error');
                        openModal({ type: 'DELETE_GROUP', title: 'Delete Group?', targetId: activeGroup.id, confirmLabel: 'Delete', isDestructive: true });
                    }}
                    className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-coral-500/20 text-xs text-white hover:text-coral-400 flex items-center gap-1.5 border border-white/10 transition-colors"
                 >
                   <Trash2 size={14} /> Delete Group
                 </button>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => openModal({ type: 'ADD_COL', title: 'New Column Name', confirmLabel: 'Add Column' })} 
                  className="px-4 py-2 rounded-lg bg-teal-800/40 hover:bg-teal-700/50 text-xs text-teal-100 flex items-center gap-2 border border-teal-500/30 transition-colors"
                >
                  <Plus size={14} /> Add Column
                </button>
                <button onClick={exportTSV} className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-xs text-white flex items-center gap-2 shadow-lg shadow-teal-900/20 transition-colors">
                  <Download size={14} /> Export Excel
                </button>
              </div>
            </div>

            {/* Render Table Component */}
            <GroupTable 
              group={activeGroup}
              onRenameColumn={(id, name) => openModal({ type: 'RENAME_COL', title: 'Rename Column', inputValue: name, targetId: id, confirmLabel: 'Save' })}
              onDeleteColumn={(id) => openModal({ type: 'DELETE_COL', title: 'Remove Column?', targetId: id, confirmLabel: 'Remove', isDestructive: true })}
              onReorderColumn={reorderColumns}
              onRemovePlayer={removePlayer}
              onUpdatePlayer={updateCustomData}
              onReorderRow={reorderRows}
            />
          </>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalConfig?.title || ''}
        onSubmit={handleModalSubmit}
        submitLabel={modalConfig?.confirmLabel}
        isDestructive={modalConfig?.isDestructive}
      >
        {modalConfig?.type !== 'DELETE_GROUP' && modalConfig?.type !== 'DELETE_COL' ? (
           <div className="space-y-4">
             <input
               autoFocus
               type="text"
               value={tempInput}
               onChange={(e) => setTempInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleModalSubmit()}
               placeholder="Enter name..."
               className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors"
             />
           </div>
        ) : (
           <p className="text-gray-300">
             Are you sure you want to proceed? This action cannot be undone.
           </p>
        )}
      </Modal>
    </div>
  );
};