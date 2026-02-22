import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { LanguageSwitcher } from './LanguageSwitcher';

// 時段類型
type SlotType = 'research' | 'training' | 'building';

// 生成48個30分鐘時段
const generateTimeSlots = () => {
  const slots = [];
  for (let i = 0; i < 48; i++) {
    const hour = Math.floor(i / 2);
    const minute = (i % 2) * 30;
    slots.push({ hour, minute, index: i });
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

// API URL 輔助函數
const getApiUrl = (endpoint: string): string => {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return `http://localhost:3001/api${endpoint}`;
  }
  return `/api-proxy.php?path=${endpoint.substring(1)}`;
};

interface OfficerSlot {
  players: Array<{
    id: string;
    gameId: string;
    playerName: string;
    alliance: string;
    avatarImage?: string;
  }>;
}

export const PublicOfficerView: React.FC = () => {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  
  // 從 URL 參數讀取
  const urlDate = searchParams.get('date') || '';
  const urlType = (searchParams.get('type') as SlotType) || '';
  const urlShowEmpty = searchParams.get('showEmpty') === 'true';
  
  // 是否為分享連結模式（有指定 type 參數）
  const isShareMode = !!urlType;
  
  const [eventDates, setEventDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(urlDate);
  const [selectedType, setSelectedType] = useState<SlotType>(urlType as SlotType || 'research');
  const [officers, setOfficers] = useState<Record<string, OfficerSlot[]>>({});
  const [loading, setLoading] = useState(true);
  const [showOnlyEmpty, setShowOnlyEmpty] = useState(urlShowEmpty);
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareModal, setShareModal] = useState<{ show: boolean; url: string; title: string; text: string } | null>(null);

  // 載入場次日期
  useEffect(() => {
    const loadDates = async () => {
      try {
        const response = await fetch(getApiUrl('/officers/public-dates'));
        if (response.ok) {
          const data = await response.json();
          setEventDates(data.dates || []);
          if (urlDate && data.dates?.includes(urlDate)) {
            setSelectedDate(urlDate);
          } else if (data.dates && data.dates.length > 0) {
            setSelectedDate(data.dates[0]);
          }
        }
      } catch (error) {
        console.error('Error loading dates:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDates();
  }, [urlDate]);

  // 載入官職配置
  useEffect(() => {
    if (!selectedDate) return;
    
    const loadOfficers = async () => {
      setLoading(true);
      try {
        const response = await fetch(getApiUrl(`/officers/public/${selectedDate}`));
        if (response.ok) {
          const data = await response.json();
          console.log('Officer data loaded:', data);
          setOfficers(data || {});
        }
      } catch (error) {
        console.error('Error loading officers:', error);
      } finally {
        setLoading(false);
      }
    };
    loadOfficers();
  }, [selectedDate]);

  // 獲取當前類型的時段陣列
  const getSlots = (): OfficerSlot[] => {
    const key = `${selectedType}_slots`;
    return (officers as any)[key] || [];
  };

  const slots = getSlots();

  // 類型標籤
  const getTypeLabel = (type: SlotType) => {
    switch (type) {
      case 'research': return '研究';
      case 'training': return '訓練';
      case 'building': return '建設';
    }
  };

  // 類型日期
  const getTypeDay = (type: SlotType) => {
    switch (type) {
      case 'research': return 'Day2 週二';
      case 'training': return 'Day4 週四';
      case 'building': return 'Day5 週五';
    }
  };

  // 計算時段資訊
  const getSlotsInfo = () => {
    return TIME_SLOTS.map((ts, idx) => {
      const slot = slots[idx];
      const hasPlayer = slot?.players?.length > 0;
      const twStartHour = (ts.hour + 8) % 24;
      const twStartMin = ts.minute;
      const twEndMin = (ts.minute + 30) % 60;
      const twEndHour = (twStartHour + (ts.minute + 30 >= 60 ? 1 : 0)) % 24;
      const utcEndHour = (ts.hour + (ts.minute + 30 >= 60 ? 1 : 0)) % 24;
      const utcEndMin = (ts.minute + 30) % 60;
      
      return {
        idx,
        isEmpty: !hasPlayer,
        utcTime: `${String(ts.hour).padStart(2, '0')}:${String(ts.minute).padStart(2, '0')}~${String(utcEndHour).padStart(2, '0')}:${String(utcEndMin).padStart(2, '0')}`,
        twTime: `${String(twStartHour).padStart(2, '0')}:${String(twStartMin).padStart(2, '0')}~${String(twEndHour).padStart(2, '0')}:${String(twEndMin).padStart(2, '0')}`,
        player: hasPlayer ? slot.players[0] : null,
        ts,
      };
    });
  };

  const allSlotsInfo = getSlotsInfo();
  const emptySlots = allSlotsInfo.filter(s => s.isEmpty);
  const filteredSlots = showOnlyEmpty ? emptySlots : allSlotsInfo;
  const totalSlots = allSlotsInfo.length;
  const emptyCount = emptySlots.length;
  const assignedCount = totalSlots - emptyCount;

  // 複製空閒時段
  const copyEmptySlots = async () => {
    const typeName = getTypeLabel(selectedType);
    const dayName = getTypeDay(selectedType);
    const lines = emptySlots.map(s => `UTC ${s.utcTime} (台灣時間：${s.twTime})`);
    const text = `【${typeName}】${dayName} 空閒時段\n場次：${selectedDate}\n\n${lines.join('\n')}`;
    try {
      await navigator.clipboard.writeText(lines.length > 0 ? text : '目前沒有空閒時段');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  // 複製全部時段
  const copyAllSlots = async () => {
    const typeName = getTypeLabel(selectedType);
    const dayName = getTypeDay(selectedType);
    const lines = allSlotsInfo.map(s => {
      const status = s.isEmpty ? '🟢 空閒' : '✅ 已排';
      const playerInfo = s.player ? ` - ${s.player.playerName}` : '';
      return `UTC ${s.utcTime} (台灣時間：${s.twTime}) ${status}${playerInfo}`;
    });
    const text = `【${typeName}】${dayName} 全部時段\n場次：${selectedDate}\n\n${lines.join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  // 生成分享連結
  const getShareUrl = (onlyEmpty: boolean) => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      date: selectedDate,
      type: selectedType,
      showEmpty: onlyEmpty.toString(),
    });
    return `${baseUrl}/officers?${params.toString()}`;
  };

  // 分享功能 - 顯示彈窗
  const shareSlots = (onlyEmpty: boolean) => {
    const typeName = getTypeLabel(selectedType);
    const dayName = getTypeDay(selectedType);
    const title = onlyEmpty ? `${typeName} 空閒時段` : `${typeName} 全部時段`;
    const shareUrl = getShareUrl(onlyEmpty);
    
    const slotsToShare = onlyEmpty ? emptySlots : allSlotsInfo;
    const lines = slotsToShare.map(s => {
      if (onlyEmpty) {
        return `UTC ${s.utcTime} (台灣時間：${s.twTime})`;
      } else {
        const status = s.isEmpty ? '🟢 空閒' : '✅ 已排';
        const playerInfo = s.player ? ` - ${s.player.playerName}` : '';
        return `UTC ${s.utcTime} (台灣時間：${s.twTime}) ${status}${playerInfo}`;
      }
    });
    
    const text = `【${title}】${dayName}\n場次：${selectedDate}\n\n${lines.join('\n')}`;

    setShareModal({
      show: true,
      url: shareUrl,
      title,
      text,
    });
  };

  // 複製分享連結
  const copyShareUrl = async () => {
    if (shareModal) {
      try {
        await navigator.clipboard.writeText(shareModal.url);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (error) {
        console.error('Copy failed:', error);
      }
    }
  };

  // 複製完整內容（不含連結）
  const copyShareContent = async () => {
    if (shareModal) {
      try {
        await navigator.clipboard.writeText(shareModal.text);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (error) {
        console.error('Copy failed:', error);
      }
    }
  };

  if (loading && eventDates.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className="max-w-4xl mx-auto">
        {/* 標題 - 分享模式顯示類型名稱 */}
        <div className="text-center mb-6">
          {isShareMode ? (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                📋 {getTypeLabel(selectedType)} - {getTypeDay(selectedType)}
              </h1>
              <p className="text-gray-400 text-sm">場次：{selectedDate}</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">📋 官職排序查詢</h1>
              <p className="text-gray-400 text-sm">公開查看官職排序安排（不需登入）</p>
            </>
          )}
        </div>

        {/* 場次選擇 - 非分享模式才顯示 */}
        {!isShareMode && (
          <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
            <label className="text-gray-300 text-sm mb-2 block">選擇場次日期</label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-700 text-white border border-slate-600 rounded-lg px-4 py-2"
            >
              {eventDates.map(date => (
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          </div>
        )}

        {/* 類型切換 - 非分享模式才顯示 */}
        {!isShareMode && (
          <div className="flex gap-2 mb-4">
            {(['research', 'training', 'building'] as const).map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold transition text-sm ${
                  selectedType === type
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {getTypeLabel(type)} ({getTypeDay(type)})
              </button>
            ))}
          </div>
        )}

        {/* 統計與功能按鈕 */}
        <div className="mb-4 p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
          {/* 統計資訊 */}
          <div className="flex items-center gap-3 mb-3 text-sm">
            <span className="text-slate-400">
              已排：<span className="text-teal-400 font-semibold">{assignedCount}</span>
            </span>
            <span className="text-slate-400">
              空閒：<span className="text-amber-400 font-semibold">{emptyCount}</span>
            </span>
            <span className="text-slate-400">
              共 <span className="text-white font-semibold">{totalSlots}</span> 個時段
            </span>
          </div>

          {/* 功能按鈕 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowOnlyEmpty(!showOnlyEmpty)}
              className={`px-3 py-1.5 text-sm font-semibold rounded transition flex items-center gap-1 ${
                showOnlyEmpty
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
              }`}
            >
              <span>{showOnlyEmpty ? '🟢' : '🔍'}</span>
              <span>{showOnlyEmpty ? '顯示全部' : '僅空閒時段'}</span>
            </button>
            <button
              onClick={copyEmptySlots}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded transition flex items-center gap-1"
            >
              <span>📋</span>
              <span>複製空閒</span>
            </button>
            <button
              onClick={copyAllSlots}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded transition flex items-center gap-1"
            >
              <span>📋</span>
              <span>複製全部</span>
            </button>
            <button
              onClick={() => shareSlots(true)}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded transition flex items-center gap-1"
            >
              <span>📤</span>
              <span>分享空閒</span>
            </button>
            <button
              onClick={() => shareSlots(false)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded transition flex items-center gap-1"
            >
              <span>📤</span>
              <span>分享全部</span>
            </button>
          </div>

          {/* 複製成功提示 */}
          {copySuccess && (
            <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
              <span>✅</span>
              <span>已複製到剪貼簿</span>
            </div>
          )}
        </div>

        {/* 時段列表 */}
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-400 py-8">載入中...</div>
          ) : filteredSlots.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              {showOnlyEmpty ? '目前沒有空閒時段' : '尚無排程資料'}
            </div>
          ) : (
            filteredSlots.map((slotInfo) => {
              const ts = slotInfo.ts;
              const hasPlayer = !slotInfo.isEmpty;
              const player = slotInfo.player;
              
              // 計算台灣時間
              const twStartHour = (ts.hour + 8) % 24;
              const twStartMin = ts.minute;
              const twEndMin = (ts.minute + 30) % 60;
              const twEndHour = (twStartHour + (ts.minute + 30 >= 60 ? 1 : 0)) % 24;
              
              return (
                <div
                  key={slotInfo.idx}
                  className={`min-h-12 sm:min-h-14 rounded-lg border p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 transition-all ${
                    hasPlayer
                      ? 'bg-teal-900/40 border-teal-600'
                      : 'bg-slate-700/50 border-slate-600'
                  }`}
                >
                  {/* 時間顯示 */}
                  <div className="text-[10px] sm:text-xs font-semibold text-slate-300 sm:w-44 flex-shrink-0">
                    {hasPlayer && <span className="mr-1">✅</span>}
                    {!hasPlayer && <span className="mr-1">🟢</span>}
                    <span className="text-slate-400">
                      UTC {String(ts.hour).padStart(2, '0')}:{String(ts.minute).padStart(2, '0')}~
                      {String((ts.hour + (ts.minute + 30 >= 60 ? 1 : 0)) % 24).padStart(2, '0')}:{String((ts.minute + 30) % 60).padStart(2, '0')}
                    </span>
                    <span className="hidden sm:inline"><br /></span>
                    <span className="sm:hidden"> | </span>
                    <span className="text-slate-300">
                      TW {String(twStartHour).padStart(2, '0')}:{String(twStartMin).padStart(2, '0')}~
                      {String(twEndHour).padStart(2, '0')}:{String(twEndMin).padStart(2, '0')}
                    </span>
                  </div>

                  {/* 玩家資訊 */}
                  <div className="flex-1">
                    {hasPlayer && player ? (
                      <div className="flex items-center gap-2 sm:gap-3">
                        {/* 頭像 */}
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-teal-500 bg-slate-600 flex-shrink-0">
                          {player.avatarImage ? (
                            <img src={player.avatarImage} alt={player.playerName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm sm:text-lg">👤</div>
                          )}
                        </div>
                        {/* 名字和聯盟 */}
                        <div className="flex-1 min-w-0">
                          <span className="text-white font-semibold truncate text-sm sm:text-base">
                            {player.playerName}
                            {player.alliance && <span className="text-slate-400 font-normal"> [{player.alliance}]</span>}
                          </span>
                        </div>
                        {/* ID 放右邊 */}
                        <div className="text-[10px] sm:text-xs text-slate-400 flex-shrink-0 text-right">
                          ID: {player.gameId || player.id}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-xs sm:text-sm">尚未指派</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 返回按鈕 */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            ← 返回首頁
          </a>
        </div>

        {/* 分享連結彈窗 */}
        {shareModal?.show && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[60]">
            <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-600 p-5 max-w-lg w-full">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🔗</span>
                  <span>{shareModal.title}</span>
                </h4>
                <button
                  onClick={() => setShareModal(null)}
                  className="p-1 text-slate-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              {/* 分享連結 */}
              <div className="mb-4">
                <label className="text-slate-400 text-sm mb-2 block">分享連結（不需登入即可查看）</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareModal.url}
                    className="flex-1 bg-slate-700 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={copyShareUrl}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-lg transition text-sm flex items-center gap-1"
                  >
                    <span>📋</span>
                    <span>複製連結</span>
                  </button>
                </div>
              </div>

              {/* 複製完整內容 */}
              <div className="mb-4">
                <button
                  onClick={copyShareContent}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition text-sm flex items-center justify-center gap-2"
                >
                  <span>📝</span>
                  <span>複製完整內容（含時段列表）</span>
                </button>
              </div>

              {/* 時段預覽 */}
              <div className="bg-slate-900/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                <pre className="text-slate-300 text-xs whitespace-pre-wrap">{shareModal.text}</pre>
              </div>

              {/* 複製成功提示 */}
              {copySuccess && (
                <div className="mt-3 text-center text-green-400 text-sm flex items-center justify-center gap-1">
                  <span>✅</span>
                  <span>已複製到剪貼簿</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicOfficerView;
