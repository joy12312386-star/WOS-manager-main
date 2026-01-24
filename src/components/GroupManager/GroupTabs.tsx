import React from 'react';
import { Edit3, X, GripVertical, Plus } from 'lucide-react';
import { PlayerGroup } from '../../types';

interface GroupTabsProps {
  groups: PlayerGroup[];
  activeGroupId: string;
  onSwitchGroup: (id: string) => void;
  onRenameGroup: (id: string, name: string) => void;
  onDeleteGroup: (id: string) => void;
  onAddGroup: () => void;
  onReorderGroups: (fromIndex: number, toIndex: number) => void;
}

export const GroupTabs: React.FC<GroupTabsProps> = ({
  groups,
  activeGroupId,
  onSwitchGroup,
  onRenameGroup,
  onDeleteGroup,
  onAddGroup,
  onReorderGroups,
}) => {
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/type', 'group-tab');
    e.dataTransfer.setData('text/index', index.toString());
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    const type = e.dataTransfer.getData('text/type');
    if (type !== 'group-tab') return;
    
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/index'));
    if (fromIndex !== toIndex) {
      onReorderGroups(fromIndex, toIndex);
    }
  };

  return (
    <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide px-1">
      {groups.map((group, index) => (
        <div
          key={group.id}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, index)}
          onClick={() => onSwitchGroup(group.id)}
          onDoubleClick={(e) => { e.stopPropagation(); onRenameGroup(group.id, group.name); }}
          className={`
            group relative flex items-center gap-2 px-3 py-2.5 rounded-t-lg rounded-b-md cursor-pointer transition-all whitespace-nowrap border border-b-0 select-none
            ${activeGroupId === group.id
              ? 'bg-teal-700/80 text-white shadow-[0_4px_12px_rgba(0,109,119,0.3)] border-teal-500/50 translate-y-[1px]'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 border-white/5 hover:text-white'}
          `}
        >
          <GripVertical size={12} className="opacity-30 group-hover:opacity-100 cursor-grab active:cursor-grabbing" />
          <span className="font-medium text-sm">{group.name}</span>

          <div className="flex items-center ml-2 gap-1 pl-2 border-l border-white/10">
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRenameGroup(group.id, group.name);
              }}
              className="text-white/40 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              title="Rename Group"
            >
              <Edit3 size={14} className="pointer-events-none" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeleteGroup(group.id);
              }}
              className="text-white/40 hover:text-coral-500 p-1.5 rounded-md hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-coral-500/50"
              title="Delete Group"
            >
              <X size={14} className="pointer-events-none" />
            </button>
          </div>
        </div>
      ))}
      
      <button 
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onAddGroup();
        }}
        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-teal-600/20 hover:bg-teal-600 text-teal-200 hover:text-white transition-all border border-teal-500/30 hover:border-teal-400 shrink-0 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
      >
        <Plus size={16} />
        <span className="text-sm font-medium">New Group</span>
      </button>
    </div>
  );
};