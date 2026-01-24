import React, { useRef, useState } from 'react';
import { GripVertical, Pencil, X, Trash2 } from 'lucide-react';
import { PlayerGroup, GroupPlayer } from '../../types';

interface GroupTableProps {
  group: PlayerGroup;
  onRenameColumn: (colId: string, name: string) => void;
  onDeleteColumn: (colId: string) => void;
  onReorderColumn: (fromIndex: number, toIndex: number) => void;
  onRemovePlayer: (fid: string) => void;
  onUpdatePlayer: (fid: string, colId: string, value: string) => void;
  onReorderRow: (fromIndex: number, toIndex: number) => void;
}

export const GroupTable: React.FC<GroupTableProps> = ({
  group,
  onRenameColumn,
  onDeleteColumn,
  onReorderColumn,
  onRemovePlayer,
  onUpdatePlayer,
  onReorderRow,
}) => {
  const [dragType, setDragType] = useState<'column' | 'row' | null>(null);
  const dragIndex = useRef<number>(-1);
  const dragGhostRef = useRef<HTMLElement | null>(null);

  // --- Drag & Drop Handlers for Columns ---
  const handleColDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/type', 'column');
    e.dataTransfer.setData('text/index', index.toString());
  };

  const handleColDrop = (e: React.DragEvent, toIndex: number) => {
    if (e.dataTransfer.getData('text/type') !== 'column') return;
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/index'));
    if (fromIndex !== toIndex) onReorderColumn(fromIndex, toIndex);
  };

  // --- Drag & Drop Handlers for Rows ---
  const handleRowDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/type', 'row');
    e.dataTransfer.setData('text/index', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleRowDrop = (e: React.DragEvent, toIndex: number) => {
    const type = e.dataTransfer.getData('text/type');
    if (type !== 'row') return; // Ignore file drops or column drops
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/index'));
    if (fromIndex !== toIndex) onReorderRow(fromIndex, toIndex);
  };

  // --- Touch Handlers for Columns ---
  const handleColTouchStart = (e: React.TouchEvent, index: number) => {
    const touch = e.touches[0];
    setDragType('column');
    dragIndex.current = index;

    const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
    ghost.style.position = 'fixed';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '9999';
    ghost.style.opacity = '0.8';
    ghost.style.left = `${touch.clientX - 100}px`;
    ghost.style.top = `${touch.clientY - 20}px`;
    document.body.appendChild(ghost);
    dragGhostRef.current = ghost;

    e.currentTarget.classList.add('opacity-50');
  };

  const handleColTouchMove = (e: React.TouchEvent) => {
    if (dragType !== 'column') return;
    const touch = e.touches[0];
    if (dragGhostRef.current) {
      dragGhostRef.current.style.left = `${touch.clientX - 100}px`;
      dragGhostRef.current.style.top = `${touch.clientY - 20}px`;
    }
  };

  const handleColTouchEnd = (e: React.TouchEvent, myIndex: number) => {
    if (dragType !== 'column') return;

    const touch = e.changedTouches[0];
    if (dragGhostRef.current) {
      dragGhostRef.current.remove();
      dragGhostRef.current = null;
    }
    e.currentTarget.classList.remove('opacity-50');

    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    if (elementUnderTouch) {
      const targetTh = elementUnderTouch.closest('th[data-col-index]');
      if (targetTh) {
        const toIndex = parseInt(targetTh.getAttribute('data-col-index') || '-1');
        if (toIndex >= 0 && toIndex !== dragIndex.current) {
          onReorderColumn(dragIndex.current, toIndex);
        }
      }
    }

    setDragType(null);
    dragIndex.current = -1;
  };

  // --- Touch Handlers for Rows ---
  const handleRowTouchStart = (e: React.TouchEvent, index: number) => {
    const touch = e.touches[0];
    setDragType('row');
    dragIndex.current = index;

    const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
    ghost.style.position = 'fixed';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '9999';
    ghost.style.opacity = '0.8';
    ghost.style.left = `${touch.clientX - 100}px`;
    ghost.style.top = `${touch.clientY - 20}px`;
    ghost.style.width = `${(e.currentTarget as HTMLElement).offsetWidth}px`;
    document.body.appendChild(ghost);
    dragGhostRef.current = ghost;

    (e.currentTarget as HTMLElement).classList.add('opacity-50');
  };

  const handleRowTouchMove = (e: React.TouchEvent) => {
    if (dragType !== 'row') return;
    const touch = e.touches[0];
    if (dragGhostRef.current) {
      dragGhostRef.current.style.left = `${touch.clientX - 100}px`;
      dragGhostRef.current.style.top = `${touch.clientY - 20}px`;
    }
  };

  const handleRowTouchEnd = (e: React.TouchEvent, myIndex: number) => {
    if (dragType !== 'row') return;

    const touch = e.changedTouches[0];
    if (dragGhostRef.current) {
      dragGhostRef.current.remove();
      dragGhostRef.current = null;
    }
    (e.currentTarget as HTMLElement).classList.remove('opacity-50');

    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
    if (elementUnderTouch) {
      const targetTr = elementUnderTouch.closest('tr[data-row-index]');
      if (targetTr) {
        const toIndex = parseInt(targetTr.getAttribute('data-row-index') || '-1');
        if (toIndex >= 0 && toIndex !== dragIndex.current) {
          onReorderRow(dragIndex.current, toIndex);
        }
      }
    }

    setDragType(null);
    dragIndex.current = -1;
  };

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-left text-sm text-white border-collapse">
        <thead className="sticky top-0 z-10 backdrop-blur-md">
          <tr className="bg-teal-900/60 border-b border-teal-500/20">
            {/* Sort Handle Header */}
            <th className="p-3 w-10 text-center text-teal-200/50"></th>
            <th className="p-3 w-10 text-center text-teal-200/50">#</th>
            <th className="p-3 font-semibold min-w-[240px] text-teal-100">Player</th>
            
            {/* Draggable Columns */}
            {group.columns.map((col, index) => (
              <th
                key={col.id}
                data-col-index={index}
                className="p-3 font-semibold min-w-[180px] group relative text-teal-100"
                draggable
                onDragStart={(e) => handleColDragStart(e, index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleColDrop(e, index)}
                onTouchStart={(e) => handleColTouchStart(e, index)}
                onTouchMove={handleColTouchMove}
                onTouchEnd={(e) => handleColTouchEnd(e, index)}
              >
                <div className="flex items-center justify-between gap-3 bg-teal-950/30 px-3 py-1.5 rounded-md border border-teal-500/10 hover:border-teal-500/30 transition-colors cursor-grab active:cursor-grabbing">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <GripVertical size={12} className="opacity-30" />
                    <span className="truncate" title={col.name}>{col.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => onRenameColumn(col.id, col.name)}
                      className="text-teal-400/50 hover:text-teal-200 p-1 rounded hover:bg-teal-900/50"
                    >
                      <Pencil size={12} />
                    </button>
                    <button 
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => onDeleteColumn(col.id)}
                      className="text-teal-400/50 hover:text-coral-400 p-1 rounded hover:bg-teal-900/50"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              </th>
            ))}
            <th className="p-3 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {group.players.map((player, idx) => (
            <tr
              key={player.fid}
              data-row-index={idx}
              className="hover:bg-white/5 group transition-colors"
              draggable
              onDragStart={(e) => handleRowDragStart(e, idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleRowDrop(e, idx)}
              onTouchStart={(e) => handleRowTouchStart(e, idx)}
              onTouchMove={handleRowTouchMove}
              onTouchEnd={(e) => handleRowTouchEnd(e, idx)}
            >
              <td className="p-3 text-center">
                 <div className="cursor-grab active:cursor-grabbing p-1 opacity-20 group-hover:opacity-100 hover:text-teal-400">
                    <GripVertical size={16} />
                 </div>
              </td>
              <td className="p-3 text-white/30 text-xs text-center">{idx + 1}</td>
              <td className="p-3">
                <div className="flex items-center gap-3 select-none pointer-events-none">
                  <div>
                    <img 
                        src={player.avatar_image} 
                        className="w-9 h-9 rounded-full border border-teal-500/30 bg-black/20" 
                        alt="" 
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${player.nickname}&background=random`;
                        }}
                    />
                  </div>
                  <div className="flex flex-col">
                      <span className="font-medium text-gray-100">{player.nickname}</span>
                      <span className="text-[10px] text-gray-500 font-mono">ID: {player.fid}</span>
                  </div>
                </div>
              </td>
              {group.columns.map(col => (
                <td key={col.id} className="p-2">
                  <input
                    type="text"
                    className="w-full bg-black/10 hover:bg-black/30 focus:bg-black/40 border border-transparent focus:border-teal-500/50 px-3 py-2 rounded text-gray-200 focus:text-white outline-none transition-all placeholder-white/5 text-sm"
                    value={player.customData[col.id] || ''}
                    onChange={(e) => onUpdatePlayer(player.fid, col.id, e.target.value)}
                    placeholder="..."
                  />
                </td>
              ))}
              <td className="p-3 text-right">
                  <button 
                    type="button"
                    onClick={() => onRemovePlayer(player.fid)}
                    className="text-white/20 hover:text-coral-400 transition-colors p-2 rounded-full hover:bg-white/5"
                    title="Remove from group"
                  >
                      <Trash2 size={16} />
                  </button>
              </td>
            </tr>
          ))}
          {group.players.length === 0 && (
              <tr>
                  <td colSpan={4 + group.columns.length} className="p-16 text-center text-white/20">
                      <div className="flex flex-col items-center gap-3 border-2 border-dashed border-white/5 rounded-xl p-8 max-w-md mx-auto bg-white/[0.02]">
                        <GripVertical size={32} className="opacity-50" />
                        <span className="text-lg font-medium text-white/40">This group is empty</span>
                        <span className="text-sm">Drag players from the left panel to add them here.</span>
                      </div>
                  </td>
              </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};