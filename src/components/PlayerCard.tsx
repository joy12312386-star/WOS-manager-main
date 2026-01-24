import React, { useState, useRef } from 'react';
import { Player } from '../../types';
import { PlusCircle, X } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  onRemove?: (fid: string) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, onRemove }) => {
  const [iconError, setIconError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const dragGhostRef = useRef<HTMLDivElement | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('application/json', JSON.stringify(player));
    e.dataTransfer.effectAllowed = 'copy';
    // Visual drag feedback handled by CSS class 'active:cursor-grabbing'
    // but we can add temporary style class to the source if needed
    e.currentTarget.classList.add('opacity-50', 'rotate-2');
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50', 'rotate-2');
  };

  // Quick add function for mobile devices
  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering drag events

    // Dispatch a custom event to notify GroupManager
    const addEvent = new CustomEvent('quick-add-player', {
      detail: { player },
      bubbles: true
    });
    document.dispatchEvent(addEvent);
  };

  // Remove function
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering drag events
    if (onRemove) {
      onRemove(player.fid);
    }
  };

  // Touch event handlers for mobile support (disabled on small screens, use button instead)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // On mobile/tablet, disable drag and use button only
    if (window.innerWidth < 1024) return;

    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    setIsDragging(true);

    // Create a drag ghost element
    const ghost = e.currentTarget.cloneNode(true) as HTMLDivElement;
    ghost.style.position = 'fixed';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '9999';
    ghost.style.opacity = '0.8';
    ghost.style.transform = 'rotate(2deg) scale(0.95)';
    ghost.style.left = `${touch.clientX - 50}px`;
    ghost.style.top = `${touch.clientY - 50}px`;
    ghost.style.width = `${e.currentTarget.offsetWidth}px`;
    document.body.appendChild(ghost);
    dragGhostRef.current = ghost;

    // Add visual feedback to original card
    e.currentTarget.classList.add('opacity-50');
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || window.innerWidth < 1024) return;

    const touch = e.touches[0];
    if (dragGhostRef.current) {
      dragGhostRef.current.style.left = `${touch.clientX - 50}px`;
      dragGhostRef.current.style.top = `${touch.clientY - 50}px`;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || window.innerWidth < 1024) return;

    const touch = e.changedTouches[0];

    // Remove drag ghost
    if (dragGhostRef.current) {
      dragGhostRef.current.remove();
      dragGhostRef.current = null;
    }

    // Remove visual feedback from original card
    e.currentTarget.classList.remove('opacity-50');
    setIsDragging(false);

    // Find the element under the touch point
    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);

    // Dispatch a custom event to notify drop zones
    if (elementUnderTouch) {
      const dropEvent = new CustomEvent('player-drop', {
        detail: {
          player,
          target: elementUnderTouch,
          position: { x: touch.clientX, y: touch.clientY }
        },
        bubbles: true
      });
      elementUnderTouch.dispatchEvent(dropEvent);
    }
  };

  // Parse stove_lv_content to get the fire crystal level
  // stove_lv_content is a URL like: https://gof-formal-avatar.akamaized.net/img/icon/stove_lv_10.png
  const getFurnaceDisplay = (stoveLevel: number, stoveLvContent: string) => {
    // Ensure stoveLvContent is a string
    if (!stoveLvContent || typeof stoveLvContent !== 'string') {
      return { type: 'text', value: stoveLevel };
    }

    // Extract fire crystal level from URL
    // Match pattern: stove_lv_X.png where X is the fire crystal level (1-10)
    const urlMatch = stoveLvContent.match(/stove_lv_(\d+)\.png/i);

    if (urlMatch) {
      // This is a fire crystal level (1-10)
      const fireLevel = parseInt(urlMatch[1], 10);
      // Only use image for fire crystal levels (1-10)
      if (fireLevel >= 1 && fireLevel <= 10) {
        return {
          type: 'image',
          fireLevel,
          url: `/assets/furnace/stove_lv_${fireLevel}.png`
        };
      }
    }

    // This is furnace level 1-30, display as text
    return { type: 'text', value: stoveLevel };
  };

  const furnaceDisplay = getFurnaceDisplay(player.stove_lv, player.stove_lv_content);

  return (
    <div
      draggable={window.innerWidth >= 1024}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="
        group relative flex items-center gap-3 lg:gap-4 p-3 lg:p-4 mb-2 lg:mb-3 rounded-xl
        backdrop-blur-md bg-white/10 border border-white/15 shadow-lg
        hover:-translate-y-0.5 hover:shadow-teal-900/30 hover:bg-white/15 hover:border-teal-600/40
        transition-all duration-300 lg:cursor-grab lg:active:cursor-grabbing
      "
    >
      {/* Avatar Section */}
      <img
        src={player.avatar_image}
        alt={player.nickname}
        className="
          w-[50px] h-[50px] lg:w-[60px] lg:h-[60px] rounded-full object-cover
          border-2 border-teal-600/30 shadow-md bg-black/20 shrink-0
          group-hover:border-teal-500/50 transition-colors
        "
        onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${player.nickname}&background=random`;
        }}
      />

      {/* Info Section */}
      <div className="flex-1 flex flex-col justify-center min-w-0 gap-1">
        {/* Nickname */}
        <h3 
          className="text-[1.125rem] font-semibold text-[#f7fafc] truncate leading-tight" 
          title={player.nickname}
        >
          {player.nickname}
        </h3>

        {/* Furnace Level & Recharge Info */}
        <div className="flex items-center gap-2 text-sm text-slate-200">
          <span className="opacity-80 text-xs uppercase tracking-wide">Furnace:</span>
          {furnaceDisplay.type === 'text' ? (
            <span className="font-bold text-teal-400 text-sm bg-teal-900/30 px-2 py-0.5 rounded border border-teal-700/50">
              Lv.{furnaceDisplay.value}
            </span>
          ) : !iconError ? (
            <img
              src={furnaceDisplay.url}
              alt={`火晶 ${furnaceDisplay.fireLevel}`}
              className="h-7 w-auto drop-shadow-sm filter contrast-125"
              onError={() => setIconError(true)}
            />
          ) : (
            <span className="font-bold text-orange-400 text-xs bg-orange-900/30 px-1.5 py-0.5 rounded border border-orange-700/50">
              火晶 {furnaceDisplay.fireLevel}
            </span>
          )}
          {player.total_recharge_amount !== undefined && (
            <span className="ml-auto text-xs opacity-75">
              充值: <span className="font-semibold text-yellow-400">${player.total_recharge_amount}</span>
            </span>
          )}
        </div>
      </div>
      
      {/* Remove Button (Mobile-friendly) */}
      <button
        onClick={handleRemove}
        className="
          absolute left-2 top-2
          p-1.5 rounded-full bg-red-600/80 hover:bg-red-500 active:bg-red-700
          text-white shadow-lg hover:shadow-red-600/50
          lg:opacity-0 lg:group-hover:opacity-100
          transition-all duration-200 hover:scale-110 active:scale-95
          z-10
        "
        title="Remove player"
      >
        <X size={16} />
      </button>

      {/* Quick Add Button (Mobile-friendly) */}
      <button
        onClick={handleQuickAdd}
        className="
          absolute right-3 top-1/2 -translate-y-1/2
          p-2 rounded-full bg-teal-600 hover:bg-teal-500 active:bg-teal-700
          text-white shadow-lg hover:shadow-teal-600/50
          lg:opacity-0 lg:group-hover:opacity-100
          transition-all duration-200 hover:scale-110 active:scale-95
          z-10
        "
        title="Add to current group"
      >
        <PlusCircle size={20} />
      </button>

      {/* Drag Handle Hint (Desktop only) */}
      <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none hidden lg:block">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="12" r="1" />
            <circle cx="9" cy="5" r="1" />
            <circle cx="9" cy="19" r="1" />
            <circle cx="15" cy="12" r="1" />
            <circle cx="15" cy="5" r="1" />
            <circle cx="15" cy="19" r="1" />
        </svg>
      </div>
    </div>
  );
};