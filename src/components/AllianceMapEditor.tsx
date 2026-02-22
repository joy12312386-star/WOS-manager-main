import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Download, Share2, Save, Eraser, Palette, X, Copy, Edit2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useToast } from './ui/Toast';

interface Alliance {
  id: string;
  name: string;
  color: string;
}

interface MapData {
  alliances: Alliance[];
  gridData: Record<string, string>;
  gridOwners: Record<string, string>;
  timestamp?: string;
}

interface Player {
  gameId: string;
  nickname?: string;
  allianceName?: string;
}

interface AllianceMapEditorProps {
  onSave?: (data: MapData) => Promise<void>;
  onLoad?: () => Promise<MapData | null>;
  initialData?: MapData | null;
  title?: string;
  onTitleChange?: (title: string) => void;
  onDuplicate?: () => void;
  players?: Player[];
}

const GRID_SIZE = 14;
const CELL_SIZE = 38;

const DEFAULT_ALLIANCES: Alliance[] = [
  { id: '1', name: '聯盟 1', color: '#ff6b6b' },
  { id: '2', name: '聯盟 2', color: '#4ecdc4' },
  { id: '3', name: '聯盟 3', color: '#45b7d1' },
  { id: '4', name: '聯盟 4', color: '#f9ca24' },
  { id: '5', name: '聯盟 5', color: '#6c5ce7' }
];

// 判斷是否為禁區格子 (中央 6x6 區域)
const isBlockedCell = (row: number, col: number): boolean => {
  return row >= 4 && row <= 9 && col >= 4 && col <= 9;
};

// 判斷是否為方向格子 (灰色區域的四個角落)
const isDirectionCell = (row: number, col: number): string | null => {
  if (row === 4 && col === 4) return 'N';
  if (row === 4 && col === 9) return 'E';
  if (row === 9 && col === 4) return 'W';
  if (row === 9 && col === 9) return 'S';
  return null;
};

export const AllianceMapEditor: React.FC<AllianceMapEditorProps> = ({ onSave, initialData, title, onTitleChange, onDuplicate, players = [] }) => {
  const { addToast } = useToast();
  const [alliances, setAlliances] = useState<Alliance[]>(initialData?.alliances || DEFAULT_ALLIANCES);
  const [gridData, setGridData] = useState<Record<string, string>>(initialData?.gridData || {});
  const [gridOwners, setGridOwners] = useState<Record<string, string>>(initialData?.gridOwners || {});
  const [currentAlliance, setCurrentAlliance] = useState<string | null>(null);
  const [playerSearch, setPlayerSearch] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title || '');
  const [currentMode, setCurrentMode] = useState<'alliance' | 'eraser'>('alliance');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [newAllianceName, setNewAllianceName] = useState('');
  const [showOwnerDialog, setShowOwnerDialog] = useState<{ row: number; col: number } | null>(null);
  const [ownerInput, setOwnerInput] = useState('');
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // 載入初始資料
  useEffect(() => {
    if (initialData) {
      isInitialMount.current = true;
      setAlliances(initialData.alliances || DEFAULT_ALLIANCES);
      setGridData(initialData.gridData || {});
      setGridOwners(initialData.gridOwners || {});
      // 延遲重置 isInitialMount，讓初始資料設定完成
      setTimeout(() => {
        isInitialMount.current = false;
      }, 100);
    }
  }, [initialData]);

  // 實時保存 - 當資料變化時自動保存
  useEffect(() => {
    // 跳過初始載入
    if (isInitialMount.current) return;
    if (!onSave) return;

    // 清除之前的定時器
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // 防抖：500ms 後自動保存
    autoSaveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const data = {
          alliances,
          gridData,
          gridOwners,
          timestamp: new Date().toISOString()
        };
        await onSave(data);
        // 不顯示 toast，避免頻繁提示
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setSaving(false);
      }
    }, 500);

    // 清理函數
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [alliances, gridData, gridOwners, onSave]);

  // 計算統計
  const stats = useCallback(() => {
    const result: Record<string, number> = {};
    alliances.forEach(a => { result[a.id] = 0; });
    Object.values(gridData).forEach(allianceId => {
      if (result[allianceId] !== undefined) result[allianceId]++;
    });
    return result;
  }, [alliances, gridData]);

  // 計算可用格子總數
  const totalAvailableCells = useCallback(() => {
    let count = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!isDirectionCell(r, c) && !isBlockedCell(r, c)) {
          count++;
        }
      }
    }
    return count;
  }, []);

  // 開始拖曳
  const startDrag = (row: number, col: number) => {
    if (currentMode === 'alliance' && !currentAlliance) {
      addToast('請先選擇一個聯盟', 'error');
      return;
    }
    setIsDragging(true);
    setSelectedCells(new Set([`${row}-${col}`]));
  };

  // 添加到選擇
  const addToSelection = (row: number, col: number) => {
    if (!isDragging) return;
    const key = `${row}-${col}`;
    setSelectedCells(prev => new Set([...prev, key]));
  };

  // 結束拖曳
  const endDrag = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const newGridData = { ...gridData };
    selectedCells.forEach(key => {
      const [row, col] = key.split('-').map(Number);
      if (!isDirectionCell(row, col) && !isBlockedCell(row, col)) {
        if (currentMode === 'alliance' && currentAlliance) {
          newGridData[key] = currentAlliance;
        } else if (currentMode === 'eraser') {
          delete newGridData[key];
        }
      }
    });
    setGridData(newGridData);
    setSelectedCells(new Set());
  }, [isDragging, selectedCells, currentMode, currentAlliance, gridData]);

  // 從觸控位置獲取格子座標
  const getCellFromTouch = useCallback((touch: Touch): { row: number; col: number } | null => {
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return null;
    const cellData = (element as HTMLElement).dataset?.cell;
    if (!cellData) return null;
    const [row, col] = cellData.split('-').map(Number);
    return { row, col };
  }, []);

  // 全局滑鼠/觸控事件
  useEffect(() => {
    const handleMouseUp = () => endDrag();
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault(); // 防止滾動
      const touch = e.touches[0];
      const cell = getCellFromTouch(touch);
      if (cell) {
        addToSelection(cell.row, cell.col);
      }
    };
    
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [endDrag, isDragging, getCellFromTouch]);

  // 新增聯盟
  const addAlliance = () => {
    if (!newAllianceName.trim()) {
      addToast('請輸入聯盟名稱', 'error');
      return;
    }
    const newId = String(Date.now());
    const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    setAlliances([...alliances, { id: newId, name: newAllianceName.trim(), color: randomColor }]);
    setNewAllianceName('');
    addToast(`已新增聯盟：${newAllianceName.trim()}`, 'success');
  };

  // 刪除聯盟
  const deleteAlliance = (allianceId: string) => {
    if (alliances.length <= 1) {
      addToast('至少需要保留一個聯盟', 'error');
      return;
    }
    const alliance = alliances.find(a => a.id === allianceId);
    if (!alliance) return;
    if (!window.confirm(`確定要刪除聯盟「${alliance.name}」嗎？此操作將清除地圖上所有該聯盟的格子。`)) return;

    const newGridData = { ...gridData };
    Object.keys(newGridData).forEach(key => {
      if (newGridData[key] === allianceId) delete newGridData[key];
    });
    setGridData(newGridData);
    if (currentAlliance === allianceId) setCurrentAlliance(null);
    setAlliances(alliances.filter(a => a.id !== allianceId));
    addToast(`已刪除聯盟：${alliance.name}`, 'success');
  };

  // 更新聯盟顏色
  const updateAllianceColor = (allianceId: string, color: string) => {
    setAlliances(alliances.map(a => a.id === allianceId ? { ...a, color } : a));
  };

  // 更新聯盟名稱
  const updateAllianceName = (allianceId: string, name: string) => {
    setAlliances(alliances.map(a => a.id === allianceId ? { ...a, name } : a));
  };

  // 清空地圖
  const clearGrid = () => {
    if (!window.confirm('確定要清空整個地圖嗎？')) return;
    setGridData({});
    setGridOwners({});
    addToast('地圖已清空', 'success');
  };

  // 設定格子擁有者
  const setOwner = (directName?: string) => {
    if (!showOwnerDialog) return;
    const { row, col } = showOwnerDialog;
    const key = `${row}-${col}`;
    const name = (directName || ownerInput).trim();
    
    if (name) {
      setGridOwners(prev => ({ ...prev, [key]: name }));
      addToast(`已設定擁有者：${name}`, 'success');
    } else {
      setGridOwners(prev => {
        const newOwners = { ...prev };
        delete newOwners[key];
        return newOwners;
      });
    }
    setShowOwnerDialog(null);
    setOwnerInput('');
    setPlayerSearch('');
  };

  // 獲取已被選過的擁有者名單
  const usedOwners = new Set(Object.values(gridOwners));

  // 移除擁有者
  const removeOwner = () => {
    if (!showOwnerDialog) return;
    const { row, col } = showOwnerDialog;
    const key = `${row}-${col}`;
    const newOwners = { ...gridOwners };
    delete newOwners[key];
    setGridOwners(newOwners);
    setShowOwnerDialog(null);
    setOwnerInput('');
    addToast('已清除擁有者', 'success');
  };

  // 下載地圖圖片
  const downloadMap = async () => {
    if (!mapRef.current) return;
    try {
      addToast('正在生成地圖圖片...', 'info');
      const canvas = await html2canvas(mapRef.current, {
        backgroundColor: '#cbd5e1',
        scale: 2
      });
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.download = `alliance_map_${timestamp}.png`;
      link.href = canvas.toDataURL();
      link.click();
      addToast('地圖已下載', 'success');
    } catch (error) {
      addToast('下載失敗', 'error');
    }
  };

  // 分享連結
  const shareMap = () => {
    const shareData = { alliances, gridData, gridOwners, timestamp: new Date().toISOString() };
    const jsonString = JSON.stringify(shareData);
    const encoded = btoa(unescape(encodeURIComponent(jsonString)));
    const shareURL = `${window.location.origin}/admin.html?map=${encoded}`;
    
    navigator.clipboard.writeText(shareURL).then(() => {
      addToast('分享連結已複製', 'success');
    }).catch(() => {
      addToast('複製失敗，請手動複製', 'error');
    });
  };

  // 取得聯盟顏色
  const getAllianceColor = (allianceId: string): string => {
    const alliance = alliances.find(a => a.id === allianceId);
    return alliance?.color || '#e2e8f0';
  };

  // 渲染單個格子
  const renderCell = (row: number, col: number) => {
    const key = `${row}-${col}`;
    const direction = isDirectionCell(row, col);
    const blocked = isBlockedCell(row, col);
    const allianceId = gridData[key];
    const owner = gridOwners[key];
    const isSelecting = selectedCells.has(key);

    const baseStyle: React.CSSProperties = {
      width: CELL_SIZE,
      height: CELL_SIZE,
      position: 'absolute',
      left: col * (CELL_SIZE + 2),
      top: row * (CELL_SIZE + 2),
    };

    // 方向格子
    if (direction) {
      return (
        <div
          key={key}
          style={baseStyle}
          className="flex items-center justify-center bg-slate-600 border-2 border-slate-500 rounded-sm"
        >
          <span className="text-white font-bold text-sm" style={{ transform: 'rotate(-45deg)' }}>{direction}</span>
        </div>
      );
    }

    // 禁區格子
    if (blocked) {
      return (
        <div
          key={key}
          style={baseStyle}
          className="flex items-center justify-center bg-slate-800 border-2 border-slate-700 rounded-sm"
        >
          <span className="text-slate-500 text-xs">✕</span>
        </div>
      );
    }

    // 普通格子
    const bgColor = allianceId ? getAllianceColor(allianceId) : '#e2e8f0';
    
    return (
      <div
        key={key}
        style={{ 
          ...baseStyle,
          backgroundColor: bgColor,
          borderColor: allianceId ? '#475569' : '#94a3b8'
        }}
        className={`flex items-center justify-center border-2 rounded-sm cursor-pointer transition-all duration-100 hover:scale-105 hover:z-10 ${
          isSelecting ? 'ring-2 ring-yellow-400 ring-offset-1' : ''
        }`}
        onMouseDown={(e) => {
          e.preventDefault();
          startDrag(row, col);
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          startDrag(row, col);
        }}
        onMouseEnter={(e) => {
          if (isDragging) {
            addToSelection(row, col);
          } else if (owner) {
            setTooltip({ text: owner, x: e.clientX, y: e.clientY });
          }
        }}
        onMouseLeave={() => setTooltip(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowOwnerDialog({ row, col });
          setOwnerInput(owner || '');
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          setShowOwnerDialog({ row, col });
          setOwnerInput(owner || '');
        }}
        data-cell={key}
      >
        <span className={`text-[10px] text-center leading-tight font-bold ${
          owner ? 'text-black drop-shadow-[0_0_2px_rgba(255,255,255,0.9)]' : ''
        }`} style={{ transform: 'rotate(-45deg)' }}>
          {owner || ''}
        </span>
      </div>
    );
  };

  // 計算地圖容器尺寸
  const gridTotalSize = GRID_SIZE * (CELL_SIZE + 2);
  // 旋轉45度後的對角線長度
  const rotatedSize = Math.ceil(gridTotalSize * Math.sqrt(2));

  const currentStats = stats();
  const total = Object.values(currentStats).reduce((a, b) => a + b, 0);
  const available = totalAvailableCells();

  return (
    <div className="space-y-4">
      {/* 標題和說明 */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          {editingTitle ? (
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={() => {
                if (tempTitle.trim() && onTitleChange) {
                  onTitleChange(tempTitle.trim());
                }
                setEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (tempTitle.trim() && onTitleChange) {
                    onTitleChange(tempTitle.trim());
                  }
                  setEditingTitle(false);
                } else if (e.key === 'Escape') {
                  setTempTitle(title || '');
                  setEditingTitle(false);
                }
              }}
              autoFocus
              className="text-2xl font-bold text-white bg-slate-700 border border-slate-500 rounded px-3 py-1 text-center"
            />
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white">◆ {title || '聯盟地圖'}</h2>
              {onTitleChange && (
                <button
                  onClick={() => {
                    setTempTitle(title || '');
                    setEditingTitle(true);
                  }}
                  className="p-1 text-slate-400 hover:text-white transition"
                  title="修改標題"
                >
                  <Edit2 size={16} />
                </button>
              )}
              {onDuplicate && (
                <button
                  onClick={onDuplicate}
                  className="p-1 text-slate-400 hover:text-blue-400 transition"
                  title="複製地圖"
                >
                  <Copy size={16} />
                </button>
              )}
            </>
          )}
        </div>
        <p className="text-slate-400 text-sm">拖曳選擇格子 | 右鍵/雙擊設定擁有者 | 支援觸控</p>
      </div>

      <div className="flex gap-6">
        {/* 左側：地圖區域 */}
        <div className="flex-shrink-0">
          <div 
            ref={mapRef}
            style={{
              width: rotatedSize,
              height: rotatedSize,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#cbd5e1',
              borderRadius: '16px',
            }}
          >
            {/* 旋轉45度的網格容器 */}
            <div 
              style={{ 
                width: gridTotalSize,
                height: gridTotalSize,
                position: 'relative',
                transform: 'rotate(45deg)',
              }}
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
                const row = Math.floor(idx / GRID_SIZE);
                const col = idx % GRID_SIZE;
                return renderCell(row, col);
              })}
            </div>
          </div>

          {/* 動作按鈕 */}
          <div className="flex flex-wrap gap-3 justify-center mt-4">
            <button onClick={clearGrid} className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition text-sm">
              <Trash2 size={16} /> 清空
            </button>
            <button onClick={downloadMap} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition text-sm">
              <Download size={16} /> 下載
            </button>
            <button onClick={shareMap} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition text-sm">
              <Share2 size={16} /> 分享
            </button>
          </div>
        </div>

        {/* 右側：聯盟管理和統計 */}
        <div className="w-72 flex-shrink-0 space-y-4">
          {/* 模式切換 */}
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentMode('alliance')}
                className={`flex-1 py-2 px-3 rounded-lg font-semibold transition ${
                  currentMode === 'alliance'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Palette size={16} className="inline mr-1" /> 聯盟分配
              </button>
              <button
                onClick={() => setCurrentMode('eraser')}
                className={`flex-1 py-2 px-3 rounded-lg font-semibold transition ${
                  currentMode === 'eraser'
                    ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Eraser size={16} className="inline mr-1" /> 橡皮擦
              </button>
            </div>
          </div>

          {/* 聯盟列表 */}
          <div className="bg-slate-800/50 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3">聯盟管理</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {alliances.map(alliance => (
                <div key={alliance.id} className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-2">
                  <input
                    type="color"
                    value={alliance.color}
                    onChange={(e) => updateAllianceColor(alliance.id, e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-0 flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={alliance.name}
                    onChange={(e) => updateAllianceName(alliance.id, e.target.value)}
                    className="w-24 bg-slate-600 border-0 rounded px-2 py-1 text-white text-sm flex-shrink-0"
                  />
                  <button
                    onClick={() => setCurrentAlliance(alliance.id)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition flex-shrink-0 ${
                      currentAlliance === alliance.id
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {currentAlliance === alliance.id ? '✓' : '選擇'}
                  </button>
                  <button
                    onClick={() => deleteAlliance(alliance.id)}
                    className="p-1 text-red-400 hover:text-red-300 transition flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* 新增聯盟 */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-600">
              <input
                type="text"
                value={newAllianceName}
                onChange={(e) => setNewAllianceName(e.target.value)}
                placeholder="新聯盟名稱"
                className="flex-1 bg-slate-600 border-0 rounded px-3 py-2 text-white text-sm"
                onKeyPress={(e) => e.key === 'Enter' && addAlliance()}
              />
              <button
                onClick={addAlliance}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded font-semibold hover:opacity-90 transition"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* 統計 */}
          <div className="bg-slate-800/50 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3">📊 聯盟統計</h3>
            <div className="space-y-2">
              {alliances.map(alliance => (
                <div key={alliance.id} className="flex items-center justify-between bg-slate-700/30 rounded px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded" style={{ backgroundColor: alliance.color }} />
                    <span className="text-white text-sm">{alliance.name}</span>
                  </div>
                  <span className="text-white font-semibold">{currentStats[alliance.id] || 0} 格</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-600">
                <span className="text-white font-semibold">總計</span>
                <span className="text-white font-semibold">{total}/{available} ({available > 0 ? ((total / available) * 100).toFixed(1) : 0}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed bg-black/90 text-white px-3 py-2 rounded-lg text-sm font-semibold pointer-events-none z-50"
          style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}
        >
          {tooltip.text}
        </div>
      )}

      {/* 擁有者對話框 */}
      {showOwnerDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-96 shadow-2xl max-h-[80vh] flex flex-col">
            <h3 className="text-xl font-semibold text-white mb-4">🏠 設定格子擁有者</h3>
            <p className="text-slate-400 text-sm mb-4">格子位置: ({showOwnerDialog.row}, {showOwnerDialog.col})</p>
            
            {/* 手動輸入 */}
            <input
              type="text"
              value={ownerInput}
              onChange={(e) => { setOwnerInput(e.target.value); setPlayerSearch(e.target.value); }}
              placeholder="輸入或搜尋玩家名稱..."
              className="w-full bg-slate-700 border-2 border-blue-500 rounded-lg px-4 py-2 text-white mb-2"
              maxLength={20}
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && setOwner()}
            />
            
            {/* 玩家列表 */}
            {players.length > 0 && (
              <div className="flex-1 overflow-y-auto mb-4 max-h-48">
                <p className="text-slate-400 text-xs mb-2">從玩家名單選擇：</p>
                <div className="space-y-1">
                  {(() => {
                    const filteredPlayers = players
                      .filter(p => {
                        // 過濾掉已被選過的玩家
                        const playerName = p.nickname || p.gameId;
                        if (usedOwners.has(playerName)) return false;
                        
                        // 搜尋過濾
                        if (!playerSearch) return true;
                        const searchLower = playerSearch.toLowerCase();
                        const nickname = p.nickname || '';
                        const gameId = p.gameId || '';
                        return nickname.toLowerCase().includes(searchLower) || 
                               gameId.toLowerCase().includes(searchLower);
                      })
                      .slice(0, 20);
                    
                    // 如果有搜尋但沒結果，顯示新增選項
                    if (playerSearch.trim() && filteredPlayers.length === 0) {
                      return (
                        <button
                          onClick={() => setOwner(playerSearch.trim())}
                          className="w-full text-left px-3 py-2 bg-green-700 hover:bg-green-600 rounded text-sm text-white transition flex items-center gap-2"
                        >
                          <Plus size={14} />
                          <span>新增「{playerSearch.trim()}」</span>
                        </button>
                      );
                    }
                    
                    return filteredPlayers.map(player => (
                      <button
                        key={player.gameId}
                        onClick={() => {
                          setOwner(player.nickname || player.gameId);
                        }}
                        className="w-full text-left px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white transition flex items-center justify-between"
                      >
                        <span>{player.nickname || player.gameId}</span>
                        {player.allianceName && (
                          <span className="text-xs text-slate-400">[{player.allianceName}]</span>
                        )}
                      </button>
                    ));
                  })()}
                </div>
              </div>
            )}
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowOwnerDialog(null); setOwnerInput(''); setPlayerSearch(''); }}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition"
              >
                取消
              </button>
              {gridOwners[`${showOwnerDialog.row}-${showOwnerDialog.col}`] && (
                <button
                  onClick={removeOwner}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                >
                  清除
                </button>
              )}
              <button
                onClick={setOwner}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllianceMapEditor;
