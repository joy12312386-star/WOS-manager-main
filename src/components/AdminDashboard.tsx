import React, { useState, useEffect } from 'react';
import { Users, FileText, LogOut, Search, Download, Trash2, Edit, Eye, Filter, ChevronDown, Calendar, Plus, Settings, ArrowLeft, UserPlus, X } from 'lucide-react';
import { AuthService, FormService, DebugService, OfficerConfigService, EventService, Event, ActivityType } from '../services/auth';
import { User, FormSubmission, ACTIVITY_TYPES, DEFAULT_DAY_CONFIG } from '../../types';
import { useToast } from './ui/Toast';
import { fetchPlayer } from '../services/api';

// 將 stoveLv 轉換成火晶等級 (1-10) 用於顯示圖片
const getFireCrystalLevel = (stoveLv: number): number | null => {
  if (stoveLv >= 35 && stoveLv <= 39) return 1;
  if (stoveLv >= 40 && stoveLv <= 44) return 2;
  if (stoveLv >= 45 && stoveLv <= 49) return 3;
  if (stoveLv >= 50 && stoveLv <= 54) return 4;
  if (stoveLv >= 55 && stoveLv <= 59) return 5;
  if (stoveLv >= 60 && stoveLv <= 64) return 6;
  if (stoveLv >= 65 && stoveLv <= 69) return 7;
  if (stoveLv >= 70 && stoveLv <= 74) return 8;
  if (stoveLv >= 75 && stoveLv <= 79) return 9;
  if (stoveLv >= 80) return 10;
  return null; // 不是火晶等級，返回 null
};

// 格式化時間為 UTC 和台灣時間
const formatTimeWithTimezones = (dateString: string, compact: boolean = false) => {
  const date = new Date(dateString);
  
  // UTC 時間
  const utcTime = date.toLocaleString('zh-TW', { 
    timeZone: 'UTC',
    month: compact ? 'numeric' : 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
  
  // 台灣時間 (UTC+8)
  const twTime = date.toLocaleString('zh-TW', { 
    timeZone: 'Asia/Taipei',
    month: compact ? 'numeric' : 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
  
  return { utcTime, twTime };
};

interface AdminDashboardProps {
  onLogout: () => void;
  currentUser?: User;
  onBackToPlayer?: () => void;
}

// 超級管理員 ID（只有此用戶可以設定其他人為管理員）
const SUPER_ADMIN_ID = '380768429';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, currentUser, onBackToPlayer }) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'users' | 'submissions' | 'officers' | 'events'>('users');
  const [submissionType, setSubmissionType] = useState<'research' | 'training' | 'building'>('research');
  const [officerType, setOfficerType] = useState<'research' | 'training' | 'building'>('research');
  const [users, setUsers] = useState<User[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAlliance, setFilterAlliance] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [officers, setOfficers] = useState<Record<string, any[]>>({});
  const [utcOffset, setUtcOffset] = useState<string>('00:00');
  const [draggedPlayer, setDraggedPlayer] = useState<{submission: FormSubmission, playerIndex: number} | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<FormSubmission | null>(null);
  const [draggedAssignedPlayer, setDraggedAssignedPlayer] = useState<{player: any, fromSlotIndex: number, playerIndex: number} | null>(null);
  // 場次日期相關
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [eventDates, setEventDates] = useState<string[]>([]);
  const [isLoadingOfficers, setIsLoadingOfficers] = useState(false);
  // 官職管理篩選和排序
  const [officerFilter, setOfficerFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [officerSort, setOfficerSort] = useState<'none' | 'accel' | 'ember' | 'refined'>('none');
  const [officerSearch, setOfficerSearch] = useState('');
  const [highlightedSlotIndex, setHighlightedSlotIndex] = useState<number | null>(null); // 當前選中的時段索引
  // 場次管理相關
  const [events, setEvents] = useState<Event[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  // 報名管理和官職管理選中的場次
  const [selectedEventForManagement, setSelectedEventForManagement] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState({
    eventDate: '',
    title: '',
    registrationStart: '',
    registrationEnd: '',
    description: '',
    dayConfig: { ...DEFAULT_DAY_CONFIG } as Record<string, string>
  });
  // 快速新增玩家相關
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddSlotIndex, setQuickAddSlotIndex] = useState<number | null>(null);
  const [quickAddPlayerId, setQuickAddPlayerId] = useState('');
  const [quickAddAlliance, setQuickAddAlliance] = useState('');
  const [quickAddCustomAlliance, setQuickAddCustomAlliance] = useState('');
  const [quickAddShowCustom, setQuickAddShowCustom] = useState(false);
  const [quickAddPlayerData, setQuickAddPlayerData] = useState<{
    nickname: string;
    stoveLv: number;
    avatarImage: string;
    kid: number;
  } | null>(null);
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [quickAddIsExistingUser, setQuickAddIsExistingUser] = useState(false);
  const [quickAddExistingUserAlliance, setQuickAddExistingUserAlliance] = useState('');
  // 刪除用戶確認
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  
  // 載入場次列表
  const loadEvents = async () => {
    const allEvents = await EventService.getAllEvents();
    setEvents(allEvents);
  };
  
  // 載入場次日期列表
  const loadEventDates = async () => {
    const dates = await OfficerConfigService.getEventDates();
    setEventDates(dates);
  };

  // 載入指定日期的官職配置
  const loadOfficerAssignments = async (date: string) => {
    setIsLoadingOfficers(true);
    try {
      const assignments = await OfficerConfigService.getAssignments(date);
      // 轉換格式
      const newOfficers: Record<string, any[]> = {};
      if (assignments.research_slots) newOfficers.research_slots = assignments.research_slots;
      if (assignments.training_slots) newOfficers.training_slots = assignments.training_slots;
      if (assignments.building_slots) newOfficers.building_slots = assignments.building_slots;
      setOfficers(newOfficers);
      
      // 載入 UTC offset（如果有的話）
      if (assignments.research_utcOffset) {
        setUtcOffset(assignments.research_utcOffset);
      }
    } catch (error) {
      console.error('Error loading officer assignments:', error);
    } finally {
      setIsLoadingOfficers(false);
    }
  };

  // 官職管理儲存到資料庫
  const saveOfficers = async (officersData?: typeof officers, showToast = true) => {
    const dataToSave = officersData || officers;
    const success = await OfficerConfigService.saveAssignments(eventDate, utcOffset, dataToSave);
    if (success) {
      if (showToast) {
        addToast(`官職配置已保存 (${eventDate})`, 'success');
      }
      loadEventDates(); // 重新載入日期列表
    } else {
      addToast('保存失敗，請重試', 'error');
    }
  };

  // 刪除用戶
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setDeletingUser(true);
    try {
      const success = await AuthService.deleteUser(userToDelete.gameId);
      if (success) {
        setUsers(users => users.filter(u => u.gameId !== userToDelete.gameId));
        addToast(`已刪除用戶 ${userToDelete.nickname || userToDelete.gameId}`, 'success');
        setShowDeleteUserModal(false);
        setUserToDelete(null);
      } else {
        addToast('刪除失敗，請重試', 'error');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      addToast('刪除失敗，請重試', 'error');
    } finally {
      setDeletingUser(false);
    }
  };

  // 一鍵清除所有排定
  const handleClearAllAssignments = () => {
    const key = `${officerType}_slots`;
    const newOfficers = { ...officers };
    newOfficers[key] = [];
    setOfficers(newOfficers);
    saveOfficers(newOfficers, false);
    addToast('已清除所有排定', 'success');
  };

  // 切換官職類型並自動分配未分配的玩家
  const handleSwitchOfficerType = (newType: 'research' | 'training' | 'building') => {
    if (newType === officerType) return; // 如果是同一類型，不做任何事
    
    // 清除UI選擇狀態
    setHighlightedSlotIndex(null);
    setSelectedPlayer(null);
    setOfficerType(newType);
    
    // 自動分配該類型的剩餘玩家
    setTimeout(() => {
      handleAutoAssignUnassigned(newType);
    }, 0);
  };

  // 自動分配指定類型的未分配玩家
  const handleAutoAssignUnassigned = async (typeToAssign?: 'research' | 'training' | 'building') => {
    const targetType = typeToAssign || officerType;
    const slotKey = getSlotKeyByType(targetType);
    const key = `${targetType}_slots`;
    
    // 取得已分配的玩家ID
    const assignedPlayerIds = new Set<string>();
    const newOfficers = { ...officers };
    if (!newOfficers[key]) newOfficers[key] = [];
    
    // 收集該類型已分配的玩家ID
    for (const slot of newOfficers[key]) {
      if (slot?.players) {
        for (const player of slot.players) {
          assignedPlayerIds.add(player.id);
        }
      }
    }
    
    // 取得符合條件的玩家（有報名該類型且有資源且未分配）
    const eligiblePlayers = submissions.filter(s => {
      if (assignedPlayerIds.has(s.id)) return false; // 跳過已分配的
      const slot = s.slots?.[slotKey];
      if (!slot?.checked) return false;
      
      if (targetType === 'research') {
        return (slot.researchAccel?.days! > 0 || slot.researchAccel?.hours! > 0 || slot.researchAccel?.minutes! > 0) ||
               (slot.generalAccel?.days! > 0 || slot.generalAccel?.hours! > 0 || slot.generalAccel?.minutes! > 0) ||
               (slot.fireSparkleCount! > 0);
      }
      return true;
    });
    
    if (eligiblePlayers.length === 0) return; // 沒有未分配的玩家
    
    // 依照資源排序
    const sortedPlayers = [...eligiblePlayers].sort((a, b) => {
      return getTotalAccelMinutes(b, slotKey) - getTotalAccelMinutes(a, slotKey);
    });

    // 產生時段資訊
    const timeSlots = generateTimeSlots();

    let assignedCount = 0;
    const newAssignedIds = new Set<string>();

    // 對每個未分配的玩家，嘗試分配到他們的志願時段
    for (const player of sortedPlayers) {
      if (newAssignedIds.has(player.id)) continue;
      
      const playerSlot = player.slots?.[slotKey];
      if (!playerSlot?.timeSlots) continue;

      // 按志願順序嘗試分配
      let assigned = false;
      for (const preferredSlot of playerSlot.timeSlots) {
        if (!preferredSlot.start || !preferredSlot.end || assigned) continue;
        
        const [startHour, startMin] = preferredSlot.start.split(':').map(Number);
        const [endHour, endMin] = preferredSlot.end.split(':').map(Number);

        // 尋找匹配的時段
        for (let idx = 0; idx < timeSlots.length && !assigned; idx++) {
          const ts = timeSlots[idx];
          const slotTime = ts.hour * 60 + ts.minute;
          const startTime = startHour * 60 + (startMin || 0);
          let endTime = endHour * 60 + (endMin || 0);
          if (endTime <= startTime) endTime += 24 * 60;

          // 檢查時段是否在玩家希望的時間範圍內
          const inRange = (slotTime >= startTime && slotTime < endTime) ||
                          (slotTime + 24 * 60 >= startTime && slotTime + 24 * 60 < endTime);

          if (inRange) {
            // 檢查該時段是否已有人
            if (!newOfficers[key][idx]?.players?.length) {
              const playerData = {
                id: player.id,
                gameId: player.gameId,
                playerName: player.playerName,
                avatarImage: player.user?.avatarImage || null,
                stoveLv: player.user?.stoveLv || 0,
                alliance: player.alliance,
              };
              
              if (!newOfficers[key][idx]) {
                newOfficers[key][idx] = { players: [playerData] };
              } else {
                newOfficers[key][idx].players = [playerData];
              }
              assigned = true;
              assignedCount++;
              newAssignedIds.add(player.id);
            }
          }
        }
      }
    }

    if (assignedCount > 0) {
      setOfficers(newOfficers);
      saveOfficers(newOfficers, false);
      addToast(`已自動分配 ${assignedCount} 位 ${['研究', '訓練', '建築'][['research', 'training', 'building'].indexOf(targetType)]} 玩家`, 'success');
    }
  };

  // 一鍵自動排定
  const handleAutoAssign = async (sortBy: 'accel' | 'fireSparkle' | 'fireGem' | 'refinedFireGem' = 'accel') => {
    const slotKey = getSlotKeyByType(officerType);
    const key = `${officerType}_slots`;
    
    // 保留現有排定，不清空
    const newOfficers = { ...officers };
    if (!newOfficers[key]) {
      newOfficers[key] = [];
    }
    
    // 取得已分配的玩家ID
    const assignedPlayerIds = new Set<string>();
    for (const slot of newOfficers[key]) {
      if (slot?.players) {
        for (const player of slot.players) {
          assignedPlayerIds.add(player.id);
          if (player.gameId) assignedPlayerIds.add(player.gameId); // 也用 gameId 追蹤
        }
      }
    }
    
    // 取得符合條件的玩家（有報名該類型且有資源且未分配）
    const eligiblePlayers = submissions.filter(s => {
      if (assignedPlayerIds.has(s.id) || assignedPlayerIds.has(s.gameId)) return false; // 跳過已分配的
      const slot = s.slots?.[slotKey];
      if (!slot?.checked) return false;
      
      if (officerType === 'research') {
        return (slot.researchAccel?.days! > 0 || slot.researchAccel?.hours! > 0 || slot.researchAccel?.minutes! > 0) ||
               (slot.generalAccel?.days! > 0 || slot.generalAccel?.hours! > 0 || slot.generalAccel?.minutes! > 0) ||
               (slot.fireSparkleCount! > 0);
      } else if (officerType === 'training') {
        return (slot.researchAccel?.days! > 0 || slot.researchAccel?.hours! > 0 || slot.researchAccel?.minutes! > 0) ||
               (slot.generalAccel?.days! > 0 || slot.generalAccel?.hours! > 0 || slot.generalAccel?.minutes! > 0);
      } else if (officerType === 'building') {
        return (slot.generalAccel?.days! > 0 || slot.generalAccel?.hours! > 0 || slot.generalAccel?.minutes! > 0) ||
               (slot.fireGemCount! > 0) || (slot.refinedFireGemCount! > 0);
      }
      return true;
    });

    // 依照資源排序（由高到低）
    const sortedPlayers = [...eligiblePlayers].sort((a, b) => {
      if (sortBy === 'accel') {
        return getTotalAccelMinutes(b, slotKey) - getTotalAccelMinutes(a, slotKey);
      } else if (sortBy === 'fireSparkle') {
        return getFireSparkleCount(b, slotKey) - getFireSparkleCount(a, slotKey);
      } else if (sortBy === 'fireGem') {
        return (b.slots[slotKey]?.fireGemCount || 0) - (a.slots[slotKey]?.fireGemCount || 0);
      } else if (sortBy === 'refinedFireGem') {
        return (b.slots[slotKey]?.refinedFireGemCount || 0) - (a.slots[slotKey]?.refinedFireGemCount || 0);
      }
      return 0;
    });

    // 產生時段資訊
    const timeSlots = generateTimeSlots();

    let assignedCount = 0;
    const newAssignedIds = new Set<string>(); // 追蹤本次新分配的玩家

    // 對每個未分配的玩家，嘗試分配到他們的志願時段
    for (const player of sortedPlayers) {
      // 跳過本次已分配的玩家
      if (newAssignedIds.has(player.id)) continue;
      
      const playerSlot = player.slots?.[slotKey];
      if (!playerSlot?.timeSlots) continue;

      // 按志願順序嘗試分配
      let assigned = false;
      for (const preferredSlot of playerSlot.timeSlots) {
        if (!preferredSlot.start || !preferredSlot.end || assigned) continue;
        
        const [startHour, startMin] = preferredSlot.start.split(':').map(Number);
        const [endHour, endMin] = preferredSlot.end.split(':').map(Number);

        // 尋找匹配的時段
        for (let idx = 0; idx < timeSlots.length && !assigned; idx++) {
          const ts = timeSlots[idx];
          const slotTime = ts.hour * 60 + ts.minute;
          const startTime = startHour * 60 + (startMin || 0);
          let endTime = endHour * 60 + (endMin || 0);
          if (endTime <= startTime) endTime += 24 * 60;

          // 檢查時段是否在玩家希望的時間範圍內
          const inRange = (slotTime >= startTime && slotTime < endTime) ||
                          (slotTime + 24 * 60 >= startTime && slotTime + 24 * 60 < endTime);

          if (inRange) {
            // 檢查該時段是否已有人
            if (!newOfficers[key][idx]?.players?.length) {
              const playerData = {
                id: player.id,
                gameId: player.gameId,
                playerName: player.playerName,
                avatarImage: player.user?.avatarImage || null,
                stoveLv: player.user?.stoveLv || 0,
                alliance: player.alliance,
              };
              
              if (!newOfficers[key][idx]) {
                newOfficers[key][idx] = { players: [playerData] };
              } else {
                newOfficers[key][idx].players = [playerData];
              }
              assigned = true;
              assignedCount++;
              newAssignedIds.add(player.id);
            }
          }
        }
      }
    }

    setOfficers(newOfficers);
    saveOfficers(newOfficers, false);
    
    if (assignedCount > 0) {
      addToast(`已自動分配 ${assignedCount} 位玩家（依${sortBy === 'accel' ? '加速' : '火晶微粒'}排序）`, 'success');
    } else if (eligiblePlayers.length === 0) {
      addToast('所有符合條件的玩家都已分配', 'info');
    } else {
      addToast('沒有符合志願時段的空位', 'info');
    }
  };

  // 產生時段
  const generateTimeSlots = () => {
    const slots = [];
    const [hours, minutes] = utcOffset.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    for (let i = 0; i < 48; i++) {
      const totalMinutes = startMinutes + (i * 30);
      const slotHours = Math.floor((totalMinutes % 1440) / 60);
      const slotMins = totalMinutes % 60;
      const dayOffset = Math.floor(totalMinutes / 1440);
      slots.push({
        id: i,
        day: dayOffset,
        hour: slotHours,
        minute: slotMins,
        players: []
      });
    }
    return slots;
  };

  const handleDragStart = (submission: FormSubmission) => {
    setDraggedPlayer({ submission, playerIndex: 0 });
    setSelectedPlayer(null); // 清除點擊選擇
  };

  // 滾動到指定時段
  const scrollToSlot = (slotIndex: number) => {
    const slotElement = document.getElementById(`time-slot-${slotIndex}`);
    if (slotElement) {
      slotElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 添加高亮效果
      slotElement.classList.add('ring-2', 'ring-amber-400');
      setTimeout(() => {
        slotElement.classList.remove('ring-2', 'ring-amber-400');
      }, 2000);
    }
  };

  // 檢查玩家是否已在任何時段中
  const isPlayerInAnySlot = (playerId: string, gameId?: string): { inSlot: boolean; slotIndex?: number } => {
    const key = `${officerType}_slots`;
    const slots = officers[key] || [];
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      // 同時檢查 id 和 gameId，以支持特殊新增的玩家
      if (slot?.players?.find((p: any) => p.id === playerId || (gameId && p.gameId === gameId))) {
        return { inSlot: true, slotIndex: i };
      }
    }
    return { inSlot: false };
  };

  // 檢查時段是否匹配玩家希望的時間，返回志願等級 (1=第一志願, 2=第二志願, 3=第三志願, null=不匹配)
  const getSlotPreferenceLevel = (slotHour: number, slotMinute: number, submission: FormSubmission, slotKey?: 'tuesday' | 'thursday' | 'friday'): number | null => {
    if (!submission?.slots) return null;
    
    // 如果指定了 slotKey，只檢查該天數；否則檢查所有已勾選的天數
    const days = slotKey ? [slotKey] : (['tuesday', 'thursday', 'friday'] as const);
    for (const day of days) {
      const daySlot = submission.slots[day];
      if (daySlot && daySlot.timeSlots) {
        for (let idx = 0; idx < daySlot.timeSlots.length; idx++) {
          const ts = daySlot.timeSlots[idx];
          if (ts.start && ts.end) {
            const [startHour, startMin] = ts.start.split(':').map(Number);
            const [endHour, endMin] = ts.end.split(':').map(Number);
            const slotTime = slotHour * 60 + slotMinute;
            const startTime = startHour * 60 + (startMin || 0);
            let endTime = endHour * 60 + (endMin || 0);
            
            // 處理跨日的情況
            if (endTime <= startTime) {
              endTime += 24 * 60;
            }
            
            // 檢查時段是否在希望範圍內
            if (slotTime >= startTime && slotTime < endTime) {
              return idx + 1; // 返回志願等級 (1, 2, 3)
            }
            // 處理跨日時段
            if (slotTime + 24 * 60 >= startTime && slotTime + 24 * 60 < endTime) {
              return idx + 1;
            }
          }
        }
      }
    }
    return null;
  };

  // 檢查時段是否匹配玩家希望的時間 (向後兼容)
  const isSlotInPlayerPreference = (slotHour: number, slotMinute: number, submission: FormSubmission): boolean => {
    return getSlotPreferenceLevel(slotHour, slotMinute, submission) !== null;
  };

  // 計算總加速時間（研究+通用）轉換為分鐘
  const getTotalAccelMinutes = (submission: FormSubmission, slotKey?: 'tuesday' | 'thursday' | 'friday'): number => {
    const slot = slotKey ? submission.slots?.[slotKey] : Object.values(submission.slots || {}).find(s => s?.checked);
    if (!slot) return 0;
    const research = slot.researchAccel || { days: 0, hours: 0, minutes: 0 };
    const general = slot.generalAccel || { days: 0, hours: 0, minutes: 0 };
    return (research.days * 24 * 60 + research.hours * 60 + research.minutes) +
           (general.days * 24 * 60 + general.hours * 60 + general.minutes);
  };

  // 取得火晶餘燼數量
  const getFireSparkleCount = (submission: FormSubmission, slotKey?: 'tuesday' | 'thursday' | 'friday'): number => {
    const slot = slotKey ? submission.slots?.[slotKey] : Object.values(submission.slots || {}).find(s => s?.checked);
    return slot?.fireSparkleCount || 0;
  };

  // 取得玩家希望的時段列表（用於顯示）
  const getPlayerPreferredSlots = (submission: FormSubmission, slotKey?: 'tuesday' | 'thursday' | 'friday'): string[] => {
    const preferredSlots: string[] = [];
    if (!submission?.slots) return preferredSlots;
    
    // 如果指定了 slotKey，只取該日期的時段
    const days = slotKey ? [slotKey] : (['tuesday', 'thursday', 'friday'] as const);
    for (const day of days) {
      const daySlot = submission.slots[day];
      if (daySlot && daySlot.timeSlots) {
        for (const ts of daySlot.timeSlots) {
          if (ts.start && ts.end) {
            preferredSlots.push(`${ts.start}~${ts.end}`);
          }
        }
      }
    }
    return preferredSlots;
  };

  const handleSelectPlayer = (submission: FormSubmission) => {
    if (selectedPlayer?.id === submission.id) {
      setSelectedPlayer(null); // 再次點擊取消選擇
    } else {
      // 檢查是否已在某個時段中
      const check = isPlayerInAnySlot(submission.id);
      if (check.inSlot) {
        addToast(`${submission.playerName} 已在時段 ${check.slotIndex! + 1} 中，請先移除`, 'error');
        return;
      }
      setSelectedPlayer(submission);
      setHighlightedSlotIndex(null); // 選擇玩家時清除時段高亮
      addToast(`已選擇 ${submission.playerName}，請點擊右邊時段添加`, 'info');
    }
  };

  const handleClickOnSlot = (slotId: number) => {
    const key = `${officerType}_slots`;
    const newOfficers = { ...officers };
    if (!newOfficers[key]) newOfficers[key] = [];
    const slot = newOfficers[key][slotId];
    
    // 如果沒有選中玩家，且時段未佔用，則高亮符合條件的玩家
    if (!selectedPlayer) {
      if (!slot?.players?.length) {
        // 切換高亮：如果已經選中則取消，否則選中
        setHighlightedSlotIndex(prev => prev === slotId ? null : slotId);
      }
      return;
    }
    
    // 檢查時段是否已有人
    if (slot?.players?.length > 0) {
      addToast(`此時段已有人安排，一個時段只能安排一人`, 'error');
      return;
    }
    
    // 檢查是否已在任何時段中
    const check = isPlayerInAnySlot(selectedPlayer.id);
    if (check.inSlot) {
      addToast(`${selectedPlayer.playerName} 已在時段 ${check.slotIndex! + 1} 中，一人只能在一個時段`, 'error');
      setSelectedPlayer(null);
      return;
    }
    
    // 提取需要的資料
    const playerData = {
      id: selectedPlayer.id,
      gameId: selectedPlayer.gameId,
      playerName: selectedPlayer.playerName,
      avatarImage: selectedPlayer.user?.avatarImage || null,
      stoveLv: selectedPlayer.user?.stoveLv || 0,
      alliance: selectedPlayer.alliance,
    };
    
    if (!slot) {
      newOfficers[key][slotId] = { players: [playerData] };
    } else {
      if (!slot.players) slot.players = [];
      slot.players.push(playerData);
    }
    setOfficers(newOfficers);
    addToast(`${selectedPlayer.playerName} 已分配至時段`, 'success');
    setSelectedPlayer(null); // 添加成功後清除選擇
    setHighlightedSlotIndex(null); // 清除時段高亮
    saveOfficers(newOfficers, false); // 自動保存
  };

  const handleDropOnSlot = (slotId: number) => {
    // 處理已分配玩家的拖曳移動
    if (draggedAssignedPlayer) {
      if (draggedAssignedPlayer.fromSlotIndex === slotId) {
        setDraggedAssignedPlayer(null);
        return; // 拖到同一個時段，不做任何事
      }
      const key = `${officerType}_slots`;
      const newOfficers = { ...officers };
      if (!newOfficers[key]) newOfficers[key] = [];
      
      // 檢查目標時段是否已有人
      if (newOfficers[key][slotId]?.players?.length > 0) {
        addToast(`此時段已有人安排，一個時段只能安排一人`, 'error');
        setDraggedAssignedPlayer(null);
        return;
      }
      
      // 從原時段移除
      if (newOfficers[key][draggedAssignedPlayer.fromSlotIndex]?.players) {
        newOfficers[key][draggedAssignedPlayer.fromSlotIndex].players = 
          newOfficers[key][draggedAssignedPlayer.fromSlotIndex].players.filter(
            (_: any, i: number) => i !== draggedAssignedPlayer.playerIndex
          );
      }
      
      // 添加到新時段
      if (!newOfficers[key][slotId]) {
        newOfficers[key][slotId] = { players: [draggedAssignedPlayer.player] };
      } else {
        if (!newOfficers[key][slotId].players) newOfficers[key][slotId].players = [];
        newOfficers[key][slotId].players.push(draggedAssignedPlayer.player);
      }
      
      setOfficers(newOfficers);
      addToast(`${draggedAssignedPlayer.player.playerName} 已移動至新時段`, 'success');
      setDraggedAssignedPlayer(null);
      saveOfficers(newOfficers, false); // 自動保存
      return;
    }
    
    // 處理從左邊名單拖曳的新玩家
    if (!draggedPlayer) return;
    const key = `${officerType}_slots`;
    const newOfficers = { ...officers };
    if (!newOfficers[key]) newOfficers[key] = [];
    const slot = newOfficers[key][slotId];
    
    // 檢查時段是否已有人
    if (slot?.players?.length > 0) {
      addToast(`此時段已有人安排，一個時段只能安排一人`, 'error');
      setDraggedPlayer(null);
      return;
    }
    
    // 檢查是否已在任何時段中
    const check = isPlayerInAnySlot(draggedPlayer.submission.id);
    if (check.inSlot) {
      addToast(`${draggedPlayer.submission.playerName} 已在時段 ${check.slotIndex! + 1} 中，一人只能在一個時段`, 'error');
      setDraggedPlayer(null);
      return;
    }
    
    // 提取需要的資料
    const playerData = {
      id: draggedPlayer.submission.id,
      gameId: draggedPlayer.submission.gameId,
      playerName: draggedPlayer.submission.playerName,
      avatarImage: draggedPlayer.submission.user?.avatarImage || null,
      stoveLv: draggedPlayer.submission.user?.stoveLv || 0,
      alliance: draggedPlayer.submission.alliance,
    };
    
    if (!slot) {
      newOfficers[key][slotId] = { players: [playerData] };
    } else {
      if (!slot.players) slot.players = [];
      slot.players.push(playerData);
    }
    setOfficers(newOfficers);
    setDraggedPlayer(null);
    addToast(`${draggedPlayer.submission.playerName} 已分配至時段`, 'success');
    saveOfficers(newOfficers, false); // 自動保存
  };

  // Load data on mount
  useEffect(() => {
    loadData();
    loadEventDates();
  }, []);

  // 當場次日期變更時載入對應配置
  useEffect(() => {
    if (eventDate) {
      loadOfficerAssignments(eventDate);
    }
  }, [eventDate]);

  const loadData = async () => {
    const allUsers = await DebugService.getAllUsers();
    const allSubmissions = await DebugService.getAllSubmissions();
    setUsers(allUsers);
    setSubmissions(allSubmissions);
    await loadEvents(); // 載入場次列表
  };

  // 創建或更新場次
  const handleCreateEvent = async () => {
    if (!newEvent.eventDate || !newEvent.registrationStart || !newEvent.registrationEnd) {
      addToast('請填寫場次日期、報名開始和結束時間', 'error');
      return;
    }
    
    if (editingEvent) {
      // 更新場次（使用原始的 eventDate 作為 URL 參數）
      const result = await EventService.updateEvent(editingEvent.eventDate, {
        title: newEvent.title,
        registrationStart: newEvent.registrationStart,
        registrationEnd: newEvent.registrationEnd,
        description: newEvent.description,
        dayConfig: newEvent.dayConfig
      });
      if (result.success) {
        addToast('場次更新成功', 'success');
        setShowEventModal(false);
        setEditingEvent(null);
        setNewEvent({ 
          eventDate: '', 
          title: '', 
          registrationStart: '', 
          registrationEnd: '', 
          description: '',
          dayConfig: { ...DEFAULT_DAY_CONFIG }
        });
        loadEvents();
      } else {
        addToast(result.error || '更新失敗', 'error');
      }
    } else {
      // 創建場次
      const result = await EventService.createEvent({
        eventDate: newEvent.eventDate,
        title: newEvent.title,
        registrationStart: newEvent.registrationStart,
        registrationEnd: newEvent.registrationEnd,
        description: newEvent.description,
        dayConfig: newEvent.dayConfig
      });
      if (result.success) {
        addToast('場次創建成功', 'success');
        setShowEventModal(false);
        setNewEvent({ 
          eventDate: '', 
          title: '', 
          registrationStart: '', 
          registrationEnd: '', 
          description: '',
          dayConfig: { ...DEFAULT_DAY_CONFIG }
        });
        loadEvents();
      } else {
        addToast(result.error || '創建失敗', 'error');
      }
    }
  };

  // 更新場次狀態
  const handleUpdateEventStatus = async (eventDate: string, status: 'open' | 'closed' | 'disabled') => {
    const success = await EventService.updateEventStatus(eventDate, status);
    if (success) {
      addToast('狀態更新成功', 'success');
      loadEvents();
    } else {
      addToast('更新失敗', 'error');
    }
  };

  // 刪除場次
  const handleDeleteEvent = async (eventDate: string) => {
    if (!confirm('確定要刪除此場次嗎？')) return;
    
    const success = await EventService.deleteEvent(eventDate);
    if (success) {
      addToast('場次已刪除', 'success');
      loadEvents();
    } else {
      addToast('刪除失敗', 'error');
    }
  };

  // 根據報名類型獲取對應的 slot key
  const getSlotKeyByType = (type: 'research' | 'training' | 'building'): 'tuesday' | 'thursday' | 'friday' => {
    switch (type) {
      case 'research': return 'tuesday';
      case 'training': return 'thursday';
      case 'building': return 'friday';
    }
  };

  // Filter submissions by type
  const filterByType = (submission: FormSubmission) => {
    const slotKey = getSlotKeyByType(submissionType);
    const slot = submission.slots[slotKey];
    
    if (!slot?.checked) return false;
    
    if (submissionType === 'research') {
      // 研究增益：科技加速 + 通用加速 + 火晶微粒
      return (
        (slot.researchAccel?.days! > 0 || slot.researchAccel?.hours! > 0 || slot.researchAccel?.minutes! > 0) ||
        (slot.generalAccel?.days! > 0 || slot.generalAccel?.hours! > 0 || slot.generalAccel?.minutes! > 0) ||
        slot.upgradeT11
      );
    } else if (submissionType === 'training') {
      // 訓練士兵增益：火晶餘燼 + 通用加速
      return (
        (slot.fireSparkleCount! > 0) ||
        (slot.generalAccel?.days! > 0 || slot.generalAccel?.hours! > 0 || slot.generalAccel?.minutes! > 0)
      );
    } else if (submissionType === 'building') {
      // 建築增益：火晶 + 精煉火晶 + 通用加速
      return (
        (slot.fireGemCount! > 0 || slot.refinedFireGemCount! > 0) ||
        (slot.generalAccel?.days! > 0 || slot.generalAccel?.hours! > 0 || slot.generalAccel?.minutes! > 0)
      );
    }
    return false;
  };

  // Filter submissions based on search, alliance filter, type filter, and selected event
  const filteredSubmissions = submissions.filter(submission => {
    const matchSearch = 
      submission.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.gameId.includes(searchTerm) ||
      submission.fid.includes(searchTerm);
    
    const matchAlliance = !filterAlliance || submission.alliance === filterAlliance;
    const matchType = filterByType(submission);
    
    // 如果在報名管理或官職管理中選擇了場次，只顯示該場次的報名
    const matchEvent = !selectedEventForManagement || submission.eventDate === selectedEventForManagement.eventDate;
    
    return matchSearch && matchAlliance && matchType && matchEvent;
  });

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    (user.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (user.gameId?.includes(searchTerm) ?? false) ||
    (user.allianceName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  // Get unique alliances for filter
  const alliances = Array.from(new Set(submissions.map(s => s.alliance).filter(Boolean)));

  const handleDeleteSubmission = async (submissionId: string) => {
    if (confirm('確定要刪除此報名嗎？此操作無法復原。')) {
      await FormService.deleteSubmission(submissionId);
      const allSubmissions = await DebugService.getAllSubmissions();
      setSubmissions(allSubmissions);
      addToast('報名已刪除', 'success');
    }
  };

  // 快速新增玩家 - 查詢玩家資料
  // 驗證自訂聯盟名稱
  const validateAllianceName = (name: string): string => {
    const trimmed = name.trim().toUpperCase();
    // 檢查長度
    if (trimmed.length !== 3) {
      return '聯盟名稱必須是 3 個字符';
    }
    // 檢查只能是英文大小寫和數字
    if (!/^[A-Z0-9]{3}$/.test(trimmed)) {
      return '只能輸入大小寫英文和數字';
    }
    return '';
  };

  const handleQuickAddSearch = async () => {
    if (!quickAddPlayerId.trim()) {
      addToast('請輸入玩家 ID', 'error');
      return;
    }
    
    setQuickAddLoading(true);
    setQuickAddIsExistingUser(false);
    setQuickAddExistingUserAlliance('');
    try {
      const player = await fetchPlayer(quickAddPlayerId.trim());
      setQuickAddPlayerData({
        nickname: player.nickname,
        stoveLv: player.stove_lv,
        avatarImage: player.avatar_image,
        kid: player.kid
      });
      
      // 檢查是否已是會員
      const userExists = await AuthService.userExists(quickAddPlayerId.trim());
      if (userExists) {
        setQuickAddIsExistingUser(true);
        // 獲取現有會員的聯盟
        const existingUsers = await DebugService.getAllUsers();
        const existingUser = existingUsers.find((u: any) => u.gameId === quickAddPlayerId.trim());
        if (existingUser?.allianceName) {
          setQuickAddExistingUserAlliance(existingUser.allianceName);
          setQuickAddAlliance(existingUser.allianceName);
        }
        addToast(`找到會員: ${player.nickname}`, 'success');
      } else {
        addToast(`找到玩家: ${player.nickname}`, 'success');
      }
    } catch (error: any) {
      addToast(error.message || '查詢玩家失敗', 'error');
      setQuickAddPlayerData(null);
      setQuickAddIsExistingUser(false);
    } finally {
      setQuickAddLoading(false);
    }
  };

  // 快速新增玩家 - 確認新增
  const handleQuickAddConfirm = async () => {
    if (!quickAddPlayerData || quickAddSlotIndex === null) {
      addToast('請先查詢玩家資料', 'error');
      return;
    }
    
    // 已是會員時不需要選擇聯盟（使用原有的聯盟）
    if (!quickAddIsExistingUser) {
      // 非會員需要選擇聯盟
      if (!quickAddAlliance) {
        addToast('請選擇聯盟', 'error');
        return;
      }
      
      // 如果是自訂聯盟，驗證格式
      if (quickAddAlliance === 'custom') {
        if (!quickAddCustomAlliance.trim()) {
          addToast('請輸入自訂聯盟名稱', 'error');
          return;
        }
        const validationError = validateAllianceName(quickAddCustomAlliance);
        if (validationError) {
          addToast(validationError, 'error');
          return;
        }
      }
    }

    setQuickAddLoading(true);
    try {
      // 0. 保存當前登入用戶的 token 和資訊
      const currentToken = localStorage.getItem('wos_token');
      const currentUser = localStorage.getItem('wos_user');
      
      // 1. 檢查用戶是否已存在
      const userExists = await AuthService.userExists(quickAddPlayerId.trim());
      
      let userId: string;
      let isExistingUser = false;
      let playerAlliance = quickAddAlliance === 'custom' ? quickAddCustomAlliance.trim().toUpperCase() : quickAddAlliance;
      
      if (!userExists) {
        // 2. 註冊新用戶（預設密碼 123456）
        const newUser = await AuthService.register(
          quickAddPlayerId.trim(),
          '123456',
          playerAlliance,
          {
            nickname: quickAddPlayerData.nickname,
            kid: quickAddPlayerData.kid,
            stoveLv: quickAddPlayerData.stoveLv,
            avatarImage: quickAddPlayerData.avatarImage
          }
        );
        if (!newUser) {
          throw new Error('註冊用戶失敗');
        }
        userId = newUser.id;
        
        // 3. 恢復當前登入用戶的 token 和資訊（避免切換身份）
        if (currentToken) localStorage.setItem('wos_token', currentToken);
        if (currentUser) localStorage.setItem('wos_user', currentUser);
        
        addToast(`已為 ${quickAddPlayerData.nickname} 建立帳號（密碼：123456）`, 'info');
      } else {
        // 用戶已存在，獲取用戶 ID，不更動密碼和資料
        isExistingUser = true;
        const existingUsers = await DebugService.getAllUsers();
        const existingUser = existingUsers.find((u: any) => u.gameId === quickAddPlayerId.trim());
        if (!existingUser) {
          throw new Error('無法找到已存在的用戶');
        }
        userId = existingUser.id;
        playerAlliance = existingUser.allianceName || playerAlliance;
        addToast(`${quickAddPlayerData.nickname} 已是會員，直接新增`, 'info');
      }

      // 4. 檢查是否已經在可用名單中有該日的報名紀錄
      const slotKey = officerType === 'research' ? 'tuesday' : officerType === 'training' ? 'thursday' : 'friday';
      const existingSubmission = submissions.find(
        s => s.gameId === quickAddPlayerId.trim() && s.slots[slotKey]?.checked
      );

      // 5. 將玩家加入時段
      const key = `${officerType}_slots`;
      const newOfficers = { ...officers };
      if (!newOfficers[key]) {
        newOfficers[key] = [];
      }
      if (!newOfficers[key][quickAddSlotIndex]) {
        newOfficers[key][quickAddSlotIndex] = { players: [] };
      }
      
      // 如果已在可用名單中，使用 submission.id 作為 player.id，這樣才能正確識別為已分配
      const playerId = existingSubmission ? existingSubmission.id : `quick_${Date.now()}`;
      
      newOfficers[key][quickAddSlotIndex].players.push({
        id: playerId,
        oderId: userId,
        gameId: quickAddPlayerId.trim(),
        playerName: quickAddPlayerData.nickname,
        avatarImage: quickAddPlayerData.avatarImage,
        stoveLv: quickAddPlayerData.stoveLv,
        alliance: playerAlliance
      });
      
      setOfficers(newOfficers);
      saveOfficers(newOfficers, false); // 自動保存

      if (existingSubmission) {
        // 已在可用名單中，不需要自動報名
        addToast(`${quickAddPlayerData.nickname} 已在可用名單中，直接加入時段`, 'success');
      } else {
        // 不在可用名單中，自動提交表單 - 預設所有資源數量 9999
        const slotHour = quickAddSlotIndex;
        const startTime = String(slotHour).padStart(2, '0') + ':00';
        const endTime = String(slotHour + 1).padStart(2, '0') + ':00';
        
        const autoSlots = {
          [slotKey]: {
            checked: true,
            researchAccel: { days: 9999, hours: 0, minutes: 0 },
            generalAccel: { days: 0, hours: 0, minutes: 0 },
            upgradeT11: false,
            fireSparkleCount: 9999,
            fireGemCount: 9999,
            refinedFireGemCount: 9999,
            timeSlots: [{ start: startTime, end: endTime }]
          }
        };

        try {
          await FormService.adminSubmitForm({
            userId,
            fid: quickAddPlayerId.trim(),
            gameId: quickAddPlayerId.trim(),
            playerName: quickAddPlayerData.nickname,
            alliance: playerAlliance,
            slots: autoSlots
          });
          addToast(`已自動提交 ${quickAddPlayerData.nickname} 的報名表單`, 'success');
          
          // 重新載入提交資料
          const allSubmissions = await DebugService.getAllSubmissions();
          setSubmissions(allSubmissions);
        } catch (submitError: any) {
          // 如果已經報名過，不視為錯誤
          if (submitError.message?.includes('已經報名過')) {
            addToast(`${quickAddPlayerData.nickname} 該日已有報名紀錄`, 'info');
          } else {
            console.error('自動提交表單失敗:', submitError);
            addToast(`加入時段成功，但自動提交表單失敗: ${submitError.message}`, 'error');
          }
        }
      }
      
      // 6. 重新載入用戶列表
      const updatedUsers = await DebugService.getAllUsers();
      setUsers(updatedUsers);
      
      addToast(`已將 ${quickAddPlayerData.nickname} 加入時段`, 'success');
      
      // 重置 modal 狀態
      setShowQuickAddModal(false);
      setQuickAddSlotIndex(null);
      setQuickAddPlayerId('');
      setQuickAddAlliance('');
      setQuickAddPlayerData(null);
      setQuickAddIsExistingUser(false);
      setQuickAddExistingUserAlliance('');
    } catch (error: any) {
      addToast(error.message || '新增失敗', 'error');
    } finally {
      setQuickAddLoading(false);
    }
  };

  const exportToCSV = () => {
    // Build CSV data from submissions
    const headers = ['報名ID', '會員ID', '遊戲ID', '遊戲名稱', '聯盟', '星期二', '星期四', '星期五', '報名時間'];
    const rows = filteredSubmissions.map(s => [
      s.id,
      s.fid,
      s.gameId,
      s.playerName,
      s.alliance,
      s.slots.tuesday?.checked ? `${s.slots.tuesday.timeSlots.map(t => `${t.start}-${t.end}`).join(', ')}` : '-',
      s.slots.thursday?.checked ? `${s.slots.thursday.timeSlots.map(t => `${t.start}-${t.end}`).join(', ')}` : '-',
      s.slots.friday?.checked ? `${s.slots.friday.timeSlots.map(t => `${t.start}-${t.end}`).join(', ')}` : '-',
      new Date(s.submittedAt).toLocaleString('zh-TW')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `svs_submissions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    addToast('已匯出報名資料', 'success');
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <FileText size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">WOS Manager - 後台管理</h1>
          </div>
          <div className="flex items-center gap-3">
            {onBackToPlayer && (
              <button
                onClick={onBackToPlayer}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                <ArrowLeft size={18} />
                返回玩家介面
              </button>
            )}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              <LogOut size={18} />
              登出
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs sm:text-sm">總會員數</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{users.length}</p>
              </div>
              <Users size={28} className="sm:w-8 sm:h-8 text-blue-400 opacity-50" />
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs sm:text-sm">總報名數</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{submissions.length}</p>
              </div>
              <FileText size={28} className="sm:w-8 sm:h-8 text-green-400 opacity-50" />
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs sm:text-sm">聯盟數</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{alliances.length}</p>
              </div>
              <Filter size={28} className="sm:w-8 sm:h-8 text-purple-400 opacity-50" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-semibold border-b-2 transition ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            會員管理
          </button>
          <button
            onClick={() => {
              setActiveTab('submissions');
              setSelectedEventForManagement(null);
            }}
            className={`px-6 py-3 font-semibold border-b-2 transition ${
              activeTab === 'submissions'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            報名管理
          </button>
          <button
            onClick={() => {
              setActiveTab('officers');
              setSelectedEventForManagement(null);
            }}
            className={`px-6 py-3 font-semibold border-b-2 transition ${
              activeTab === 'officers'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            官職管理
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-6 py-3 font-semibold border-b-2 transition ${
              activeTab === 'events'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-1" />
            場次設定
          </button>
        </div>

        {/* Content Sections */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">場次管理</h2>
              <button
                onClick={() => {
                  setEditingEvent(null);
                  setNewEvent({
                    eventDate: '',
                    title: '',
                    registrationStart: '',
                    registrationEnd: '',
                    description: '',
                    dayConfig: { ...DEFAULT_DAY_CONFIG }
                  });
                  setShowEventModal(true);
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                新增場次
              </button>
            </div>

            {/* Events List */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-700 text-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-left">場次日期</th>
                    <th className="px-4 py-3 text-left">標題</th>
                    <th className="px-4 py-3 text-left">報名開始</th>
                    <th className="px-4 py-3 text-left">報名結束</th>
                    <th className="px-4 py-3 text-left">活動配置</th>
                    <th className="px-4 py-3 text-left">狀態</th>
                    <th className="px-4 py-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        尚無場次，請點擊「新增場次」建立
                      </td>
                    </tr>
                  ) : (
                    events.map(event => {
                      const startTimes = formatTimeWithTimezones(event.registrationStart);
                      const endTimes = formatTimeWithTimezones(event.registrationEnd);
                      return (
                      <tr key={event.id} className="text-white hover:bg-slate-700/50">
                        <td className="px-4 py-3 font-semibold">{event.eventDate}</td>
                        <td className="px-4 py-3">{event.title || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex flex-col gap-1">
                            <span className="text-cyan-400">UTC: {startTimes.utcTime}</span>
                            <span className="text-yellow-400">台灣: {startTimes.twTime}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex flex-col gap-1">
                            <span className="text-cyan-400">UTC: {endTimes.utcTime}</span>
                            <span className="text-yellow-400">台灣: {endTimes.twTime}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="text-slate-300">
                            {(() => {
                              try {
                                const dayConfig = typeof event.dayConfig === 'string' 
                                  ? JSON.parse(event.dayConfig) 
                                  : event.dayConfig;
                                
                                if (!dayConfig) return '無';
                                
                                const dayNames: Record<string, string> = {
                                  monday: '週一', tuesday: '週二', wednesday: '週三',
                                  thursday: '週四', friday: '週五', saturday: '週六', sunday: '週日'
                                };
                                const configs: string[] = [];
                                Object.entries(dayConfig).forEach(([day, type]) => {
                                  if (type !== 'none' && type) {
                                    const activityName = ACTIVITY_TYPES[type as ActivityType]?.name.split('增益')[0].trim() || type;
                                    configs.push(`${dayNames[day]}-${activityName}`);
                                  }
                                });
                                return configs.length > 0 ? configs.join(' ') : '無';
                              } catch (e) {
                                return '無';
                              }
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={event.status}
                            onChange={(e) => handleUpdateEventStatus(event.eventDate, e.target.value as 'open' | 'closed' | 'disabled')}
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              event.status === 'open' 
                                ? 'bg-green-600 text-white' 
                                : event.status === 'closed' 
                                  ? 'bg-yellow-600 text-white'
                                  : 'bg-slate-600 text-slate-300'
                            }`}
                          >
                            <option value="open">開放報名</option>
                            <option value="closed">截止報名</option>
                            <option value="disabled">關閉</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-center flex justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingEvent(event);
                              setNewEvent({
                                eventDate: event.eventDate,
                                title: event.title || '',
                                registrationStart: event.registrationStart,
                                registrationEnd: event.registrationEnd,
                                description: event.description || '',
                                dayConfig: event.dayConfig || { ...DEFAULT_DAY_CONFIG }
                              });
                              setShowEventModal(true);
                            }}
                            className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded"
                            title="編輯場次"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.eventDate)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded"
                            title="刪除場次"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )})
                  )}
                </tbody>
              </table>
            </div>

            {/* Event Modal */}
            {showEventModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-2xl max-h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center p-6 border-b border-slate-700">
                    <h3 className="text-lg font-bold text-white">
                      {editingEvent ? '編輯場次' : '新增場次'}
                    </h3>
                    <button
                      onClick={() => {
                        setShowEventModal(false);
                        setEditingEvent(null);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition"
                      title="關閉"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="overflow-y-auto flex-1 p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">場次日期 *</label>
                        <input
                          type="date"
                          value={newEvent.eventDate}
                          onChange={(e) => setNewEvent({ ...newEvent, eventDate: e.target.value })}
                          disabled={!!editingEvent}
                          className={`w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 ${editingEvent ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">標題（可選）</label>
                        <input
                          type="text"
                          value={newEvent.title}
                          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                          placeholder="例如：SVS 第一週"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">報名開始時間 * (您輸入的是本地時間)</label>
                        <input
                          type="datetime-local"
                          value={newEvent.registrationStart}
                          onChange={(e) => setNewEvent({ ...newEvent, registrationStart: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        />
                        {newEvent.registrationStart && (
                          <div className="mt-1 text-xs flex gap-3">
                            <span className="text-cyan-400">UTC: {formatTimeWithTimezones(newEvent.registrationStart).utcTime}</span>
                            <span className="text-yellow-400">台灣: {formatTimeWithTimezones(newEvent.registrationStart).twTime}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">報名結束時間 * (您輸入的是本地時間)</label>
                        <input
                          type="datetime-local"
                          value={newEvent.registrationEnd}
                          onChange={(e) => setNewEvent({ ...newEvent, registrationEnd: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        />
                        {newEvent.registrationEnd && (
                          <div className="mt-1 text-xs flex gap-3">
                            <span className="text-cyan-400">UTC: {formatTimeWithTimezones(newEvent.registrationEnd).utcTime}</span>
                            <span className="text-yellow-400">台灣: {formatTimeWithTimezones(newEvent.registrationEnd).twTime}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">描述（可選）</label>
                        <textarea
                          value={newEvent.description}
                          onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                          placeholder="場次說明..."
                          rows={3}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      {/* 每日活動類型配置 */}
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">每日活動類型配置</label>
                        <p className="text-xs text-slate-500 mb-2">⚠️ 每種增益類型只能設定在一天</p>
                        <div className="grid grid-cols-2 gap-2">
                          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                            const dayNames: Record<string, string> = {
                              monday: '週一', tuesday: '週二', wednesday: '週三',
                              thursday: '週四', friday: '週五', saturday: '週六', sunday: '週日'
                            };
                            
                            // 檢查新增的活動類型是否已在其他天設定
                            const handleActivityChange = (selectedValue: string) => {
                              const newActivityType = selectedValue as ActivityType;
                              
                              // 檢查是否選了「無」
                              if (newActivityType === 'none') {
                                setNewEvent({
                                  ...newEvent,
                                  dayConfig: { ...newEvent.dayConfig, [day]: newActivityType }
                                });
                                return;
                              }
                              
                              // 檢查該活動類型是否已在其他天設定
                              const existingDay = Object.entries(newEvent.dayConfig).find(
                                ([d, type]) => d !== day && type === newActivityType
                              );
                              
                              if (existingDay) {
                                // 警告用戶並清空舊的設定
                                const oldDay = existingDay[0];
                                const dayName = { monday: '週一', tuesday: '週二', wednesday: '週三', thursday: '週四', friday: '週五', saturday: '週六', sunday: '週日' }[oldDay];
                                addToast(`⚠️ 已自動清除${dayName}的設定，因為每種增益只能設在一天`, 'warning');
                                
                                const updatedConfig = { ...newEvent.dayConfig };
                                updatedConfig[oldDay] = 'none';
                                updatedConfig[day] = newActivityType;
                                setNewEvent({ ...newEvent, dayConfig: updatedConfig });
                              } else {
                                setNewEvent({
                                  ...newEvent,
                                  dayConfig: { ...newEvent.dayConfig, [day]: newActivityType }
                                });
                              }
                            };
                            
                            return (
                              <div key={day} className="flex items-center gap-2 bg-slate-700/50 rounded p-2">
                                <span className="text-white text-sm w-10 font-semibold">{dayNames[day]}</span>
                                <select
                                  value={newEvent.dayConfig[day] || 'none'}
                                  onChange={(e) => handleActivityChange(e.target.value)}
                                  className="flex-1 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-xs focus:outline-none focus:border-blue-500"
                                >
                                  <option value="none">{ACTIVITY_TYPES.none.emoji} 無</option>
                                  <option value="research">{ACTIVITY_TYPES.research.emoji} 研究科技</option>
                                  <option value="training">{ACTIVITY_TYPES.training.emoji} 士兵訓練</option>
                                  <option value="building">{ACTIVITY_TYPES.building.emoji} 建築訓練</option>
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 p-6 border-t border-slate-700">
                    <button
                      onClick={() => {
                        setShowEventModal(false);
                        setEditingEvent(null);
                      }}
                      className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleCreateEvent}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                    >
                      {editingEvent ? '更新' : '創建'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Officers Tab */}
        {activeTab === 'officers' && (
          <div className="space-y-6">
            {/* 場次選擇界面 */}
            {!selectedEventForManagement ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">選擇場次 - 官職管理</h2>
                </div>
                
                {/* 場次列表 */}
                <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-700 text-slate-300">
                      <tr>
                        <th className="px-4 py-3 text-left">場次日期</th>
                        <th className="px-4 py-3 text-left">標題</th>
                        <th className="px-4 py-3 text-left">狀態</th>
                        <th className="px-4 py-3 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {events.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                            尚無場次，請先在「場次設定」中建立場次
                          </td>
                        </tr>
                      ) : (
                        events.map(event => (
                          <tr key={event.id} className="text-white hover:bg-slate-700/50">
                            <td className="px-4 py-3 font-semibold">{event.eventDate}</td>
                            <td className="px-4 py-3">{event.title || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                event.status === 'open' 
                                  ? 'bg-green-600 text-white' 
                                  : event.status === 'closed' 
                                    ? 'bg-yellow-600 text-white'
                                    : 'bg-slate-600 text-slate-300'
                              }`}>
                                {event.status === 'open' ? '開放報名' : event.status === 'closed' ? '截止報名' : '關閉'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => {
                                  setSelectedEventForManagement(event);
                                  setEventDate(event.eventDate);
                                  loadOfficerAssignments(event.eventDate);
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
                              >
                                管理官職
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <>
                {/* 返回按鈕和場次資訊 */}
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={() => setSelectedEventForManagement(null)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition flex items-center gap-2"
                  >
                    ← 返回場次列表
                  </button>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-semibold">{selectedEventForManagement.eventDate}</span>
                    {selectedEventForManagement.title && (
                      <span className="text-slate-400">- {selectedEventForManagement.title}</span>
                    )}
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      selectedEventForManagement.status === 'open' 
                        ? 'bg-green-600 text-white' 
                        : selectedEventForManagement.status === 'closed' 
                          ? 'bg-yellow-600 text-white'
                          : 'bg-slate-600 text-slate-300'
                    }`}>
                      {selectedEventForManagement.status === 'open' ? '開放報名' : selectedEventForManagement.status === 'closed' ? '截止報名' : '關閉'}
                    </span>
                  </div>
                </div>

                {/* Type Tabs */}
                <div className="flex gap-2 border-b border-slate-700">
              <button
                onClick={() => handleSwitchOfficerType('research')}
                className={`px-6 py-3 font-semibold border-b-2 transition ${
                  officerType === 'research'
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                🧬 研究
              </button>
              <button
                onClick={() => handleSwitchOfficerType('training')}
                className={`px-6 py-3 font-semibold border-b-2 transition ${
                  officerType === 'training'
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                ⚔️ 士兵
              </button>
              <button
                onClick={() => handleSwitchOfficerType('building')}
                className={`px-6 py-3 font-semibold border-b-2 transition ${
                  officerType === 'building'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                🏗️ 建築
              </button>
            </div>

            {/* 場次日期和 UTC 配置 */}
            <div className="flex flex-wrap gap-4 items-center">
              {/* 場次日期選擇 */}
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-400" />
                <label className="text-white font-semibold">場次日期：</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              
              {/* 歷史場次快速選擇 */}
              {eventDates.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm">歷史場次：</span>
                  <select
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    {eventDates.map(date => (
                      <option key={date} value={date}>{date}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* UTC 開始時間 */}
              <div className="flex items-center gap-2">
                <label className="text-white font-semibold">UTC 開始時間：</label>
                <input
                  type="time"
                  value={utcOffset}
                  onChange={(e) => setUtcOffset(e.target.value)}
                  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              
              {/* 一鍵排定按鈕 */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleAutoAssign('accel')}
                  disabled={isLoadingOfficers}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded-lg transition font-semibold text-sm"
                  title="分配未分配的玩家，按加速資源多寡排序（保留已分配）"
                >
                  ⚡ 依加速排定
                </button>
                {officerType === 'research' && (
                  <button
                    onClick={() => handleAutoAssign('fireSparkle')}
                    disabled={isLoadingOfficers}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-slate-600 text-white rounded-lg transition font-semibold text-sm"
                    title="分配未分配的玩家，按火晶微粒多寡排序（保留已分配）"
                  >
                    ✨ 依火晶微粒排定
                  </button>
                )}
                {officerType === 'building' && (
                  <>
                    <button
                      onClick={() => handleAutoAssign('fireGem')}
                      disabled={isLoadingOfficers}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 text-white rounded-lg transition font-semibold text-sm"
                      title="分配未分配的玩家，按火晶多寡排序（保留已分配）"
                    >
                      💎 依火晶排定
                    </button>
                    <button
                      onClick={() => handleAutoAssign('refinedFireGem')}
                      disabled={isLoadingOfficers}
                      className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:bg-slate-600 text-white rounded-lg transition font-semibold text-sm"
                      title="分配未分配的玩家，按精煉火晶多寡排序（保留已分配）"
                    >
                      💠 依精煉火晶排定
                    </button>
                  </>
                )}
                <button
                  onClick={handleClearAllAssignments}
                  disabled={isLoadingOfficers}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white rounded-lg transition font-semibold text-sm"
                  title="清除此官職類型的所有排定"
                >
                  🗑️ 清除排定
                </button>
              </div>
              
              {/* 保存按鈕 */}
              <button
                onClick={() => saveOfficers()}
                disabled={isLoadingOfficers}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg transition font-semibold"
              >
                {isLoadingOfficers ? '載入中...' : '保存配置'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Left: Player List from Submissions */}
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <h3 className="text-white font-semibold mb-2">可用人員</h3>
                
                {/* 篩選和排序控制項 */}
                <div className="mb-4 space-y-2">
                  {/* 搜索欄 */}
                  <input
                    type="text"
                    placeholder="搜尋 ID 或名字..."
                    value={officerSearch}
                    onChange={(e) => setOfficerSearch(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm placeholder-slate-400 focus:outline-none focus:border-teal-500"
                  />
                  <div className="flex gap-2">
                    <select
                      value={officerFilter}
                      onChange={(e) => setOfficerFilter(e.target.value as 'all' | 'assigned' | 'unassigned')}
                      className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                    >
                      <option value="all">全部</option>
                      <option value="unassigned">尚未分配</option>
                      <option value="assigned">已分配</option>
                    </select>
                    <select
                      value={officerSort}
                      onChange={(e) => setOfficerSort(e.target.value as 'none' | 'accel' | 'ember' | 'refined')}
                      className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                    >
                      <option value="none">預設排序</option>
                      <option value="accel">按加速排序</option>
                      {officerType === 'research' && (
                        <option value="ember">按火晶微粒排序</option>
                      )}
                      {officerType === 'building' && (
                        <>
                          <option value="ember">按火晶排序</option>
                          <option value="refined">按精煉排序</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2 max-h-[550px] overflow-y-auto">
                  {submissions
                    .filter(sub => {
                      // 搜索過濾
                      if (officerSearch.trim()) {
                        const searchLower = officerSearch.toLowerCase().trim();
                        const nameMatch = sub.playerName?.toLowerCase().includes(searchLower);
                        const idMatch = sub.gameId?.toLowerCase().includes(searchLower) || sub.fid?.toLowerCase().includes(searchLower);
                        if (!nameMatch && !idMatch) return false;
                      }
                      
                      // 根據類型取得對應的 slot
                      const slotKey = officerType === 'research' ? 'tuesday' : officerType === 'training' ? 'thursday' : 'friday';
                      const slot = sub.slots[slotKey];
                      // 資源篩選
                      let hasResource = false;
                      if (officerType === 'research') {
                        hasResource = slot !== undefined && (slot.researchAccel?.days! > 0 || slot.generalAccel?.days! > 0 || slot.fireSparkleCount! > 0);
                      } else if (officerType === 'training') {
                        hasResource = slot !== undefined && (
                          slot.researchAccel?.days! > 0 || slot.researchAccel?.hours! > 0 || slot.researchAccel?.minutes! > 0 ||
                          slot.generalAccel?.days! > 0 || slot.generalAccel?.hours! > 0 || slot.generalAccel?.minutes! > 0
                        );
                      } else {
                        hasResource = slot !== undefined && (slot.fireGemCount! > 0 || slot.refinedFireGemCount! > 0 || slot.generalAccel?.days! > 0);
                      }
                      if (!hasResource) return false;
                      
                      // 分配狀態篩選
                      if (officerFilter === 'all') return true;
                      const { inSlot } = isPlayerInAnySlot(sub.id);
                      if (officerFilter === 'assigned') return inSlot;
                      if (officerFilter === 'unassigned') return !inSlot;
                      return true;
                    })
                    .sort((a, b) => {
                      const slotKey = officerType === 'research' ? 'tuesday' : officerType === 'training' ? 'thursday' : 'friday';
                      if (officerSort === 'accel') {
                        return getTotalAccelMinutes(b, slotKey) - getTotalAccelMinutes(a, slotKey);
                      } else if (officerSort === 'ember') {
                        if (officerType === 'building') {
                          return (b.slots[slotKey]?.fireGemCount || 0) - (a.slots[slotKey]?.fireGemCount || 0);
                        }
                        return getFireSparkleCount(b, slotKey) - getFireSparkleCount(a, slotKey);
                      } else if (officerSort === 'refined') {
                        return (b.slots[slotKey]?.refinedFireGemCount || 0) - (a.slots[slotKey]?.refinedFireGemCount || 0);
                      }
                      return 0;
                    })
                    .map(sub => {
                      const fireLevel = getFireCrystalLevel(sub.user?.stoveLv || 0);
                      const { inSlot, slotIndex: assignedSlotIndex } = isPlayerInAnySlot(sub.id, sub.gameId);
                      // 根據類型取得對應的 slot
                      const slotKey = officerType === 'research' ? 'tuesday' : officerType === 'training' ? 'thursday' : 'friday';
                      const slot = sub.slots[slotKey];
                      const researchAccel = slot?.researchAccel;
                      const generalAccel = slot?.generalAccel;
                      const fireSparkle = slot?.fireSparkleCount || 0;
                      const fireGem = slot?.fireGemCount || 0;
                      const refinedFireGem = slot?.refinedFireGemCount || 0;
                      
                      // 格式化加速時間
                      const formatAccel = (accel?: { days: number; hours: number; minutes: number }) => {
                        if (!accel) return '0';
                        const parts = [];
                        if (accel.days > 0) parts.push(`${accel.days}天`);
                        if (accel.hours > 0) parts.push(`${accel.hours}時`);
                        if (accel.minutes > 0) parts.push(`${accel.minutes}分`);
                        return parts.length > 0 ? parts.join('') : '0';
                      };
                      
                      // 檢查是否應該高亮（未分配 + 有選中時段 + 該時段是玩家的志願）
                      const timeSlots = generateTimeSlots();
                      const highlightSlot = highlightedSlotIndex !== null ? timeSlots[highlightedSlotIndex] : null;
                      const isHighlighted = !inSlot && highlightSlot && getSlotPreferenceLevel(highlightSlot.hour, highlightSlot.minute, sub, slotKey) !== null;
                      
                      return (
                      <div
                        key={sub.id}
                        draggable={!inSlot}
                        onDragStart={() => !inSlot && handleDragStart(sub)}
                        className={`p-3 rounded-lg text-sm transition flex items-center gap-3 relative
                          ${inSlot 
                            ? 'bg-slate-800/50 opacity-50 cursor-not-allowed border border-slate-600' 
                            : isHighlighted
                              ? 'bg-green-700 ring-2 ring-green-400 cursor-move animate-pulse'
                              : selectedPlayer?.id === sub.id 
                                ? 'bg-teal-700 ring-2 ring-teal-400 cursor-move' 
                                : 'bg-slate-700 hover:bg-slate-600 cursor-move'
                          }
                          ${inSlot ? 'text-slate-400' : 'text-white'}
                        `}
                      >
                        {/* 高亮標記 */}
                        {isHighlighted && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                            ⭐ 符合時段
                          </div>
                        )}
                        {/* 已分配遮罩 */}
                        {inSlot && (
                          <div className="absolute top-2 right-2 bg-amber-600/80 text-white text-xs px-2 py-0.5 rounded">
                            已分配
                          </div>
                        )}
                        {/* 頭像 */}
                        <div className={`w-12 h-12 rounded-full overflow-hidden border-2 flex-shrink-0 ${inSlot ? 'border-slate-600 bg-slate-700 grayscale' : isHighlighted ? 'border-green-400 bg-green-800' : 'border-slate-500 bg-slate-600'}`}>
                          {sub.user?.avatarImage ? (
                            <img src={sub.user.avatarImage} alt={sub.playerName} className={`w-full h-full object-cover ${inSlot ? 'grayscale' : ''}`} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                          )}
                        </div>
                        {/* 名字、ID、熔爐等級和資源 */}
                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold truncate ${inSlot ? 'text-slate-400' : ''}`}>{sub.playerName}</div>
                          <div className="text-slate-400 text-xs">ID: {sub.gameId || sub.fid}</div>
                          <div className="text-slate-300 text-xs flex items-center gap-1">
                            FURNACE: 
                            {fireLevel ? (
                              <>
                                <img 
                                  src={`/assets/furnace/stove_lv_${fireLevel}.png`} 
                                  alt={`FC ${fireLevel}`}
                                  className={`w-6 h-6 ${inSlot ? 'grayscale' : ''}`}
                                />
                                <span className="text-slate-400">({sub.user?.stoveLv})</span>
                              </>
                            ) : (
                              <span className={`font-semibold ${inSlot ? 'text-slate-400' : 'text-white'}`}>LV {sub.user?.stoveLv || '?'}</span>
                            )}
                          </div>
                          {/* 資源數量 */}
                          <div className="text-xs mt-1 space-y-0.5">
                            {officerType === 'research' && (
                              <>
                                <div className="text-blue-400">📚 研究: {formatAccel(researchAccel)}</div>
                                <div className="text-yellow-400">⚡ 通用: {formatAccel(generalAccel)}</div>
                                {fireSparkle > 0 && (
                                  <div className="text-pink-400">✨ 火晶微粒: {fireSparkle}</div>
                                )}
                              </>
                            )}
                            {officerType === 'training' && (
                              <>
                                <div className="text-green-400">🎖️ 訓練: {formatAccel(researchAccel)}</div>
                                <div className="text-yellow-400">⚡ 通用: {formatAccel(generalAccel)}</div>
                              </>
                            )}
                            {officerType === 'building' && (
                              <>
                                <div className="text-red-400">💎 火晶: {fireGem}</div>
                                <div className="text-purple-400">💠 精煉: {refinedFireGem}</div>
                                <div className="text-yellow-400">⚡ 通用: {formatAccel(generalAccel)}</div>
                              </>
                            )}
                          </div>
                          {/* 希望時段 */}
                          {getPlayerPreferredSlots(sub, slotKey).length > 0 && (
                            <div className={`text-xs mt-1 ${inSlot ? 'text-slate-500' : 'text-green-400'}`}>
                              🕐 希望: {getPlayerPreferredSlots(sub, slotKey).join(', ')}
                            </div>
                          )}
                        </div>
                        {/* 新增按鈕 - 已分配時點擊可跳轉到該時段 */}
                        {!inSlot ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPlayer(sub);
                            }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-lg flex-shrink-0 ${selectedPlayer?.id === sub.id ? 'bg-orange-500 hover:bg-orange-600' : 'bg-teal-600 hover:bg-teal-700'}`}
                          >
                            {selectedPlayer?.id === sub.id ? '✓' : '+'}
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (assignedSlotIndex !== undefined) {
                                scrollToSlot(assignedSlotIndex);
                              }
                            }}
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-600 hover:bg-amber-500 text-white text-lg flex-shrink-0 cursor-pointer transition"
                            title="點擊跳轉到已分配的時段"
                          >
                            📍
                          </button>
                        )}
                      </div>
                    );})}
                </div>
              </div>

              {/* Right: Time Slots List (vertical) */}
              <div className="col-span-2 bg-slate-800 rounded-lg border border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">時段安排</h3>
                  {/* 顏色圖例 */}
                  {selectedPlayer && (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-400">志願顏色:</span>
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded bg-green-600/60 border border-green-400"></span>
                        <span className="text-green-300">🥇 第一</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded bg-blue-600/60 border border-blue-400"></span>
                        <span className="text-blue-300">🥈 第二</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded bg-purple-600/60 border border-purple-400"></span>
                        <span className="text-purple-300">🥉 第三</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto">
                  {generateTimeSlots().map((slot, idx) => {
                    const key = `${officerType}_slots`;
                    const assignedPlayers = officers[key]?.[idx]?.players || [];
                    const isOccupied = assignedPlayers.length > 0; // 是否已有人安排
                    // 台灣時間 (UTC+8)
                    const twStartHour = (slot.hour + 8) % 24;
                    const twStartMin = slot.minute;
                    const twEndHour = ((slot.hour * 60 + slot.minute + 30) / 60) % 24;
                    const twEndMin = (slot.minute + 30) % 60;
                    const twEndHourInt = Math.floor((slot.hour * 60 + slot.minute + 30) / 60) % 24;
                    const twEndMinInt = (slot.minute + 30) % 60;
                    const isDropTarget = (selectedPlayer || draggedPlayer) && !isOccupied;
                    const canMoveHere = draggedAssignedPlayer && !isOccupied;
                    // 根據類型取得對應的 slotKey
                    const currentSlotKey = officerType === 'research' ? 'tuesday' : officerType === 'training' ? 'thursday' : 'friday';
                    // 檢查是否匹配選中玩家的希望時間，並獲取志願等級
                    const preferenceLevel = selectedPlayer && !isOccupied ? getSlotPreferenceLevel(slot.hour, slot.minute, selectedPlayer, currentSlotKey) : null;
                    
                    // 檢查是否為當前選中的時段（用於高亮可用玩家）
                    const isSlotHighlighted = highlightedSlotIndex === idx;
                    
                    // 根據志願等級設定樣式
                    const getPreferenceStyle = () => {
                      if (!preferenceLevel) return null;
                      switch (preferenceLevel) {
                        case 1: return { bg: 'bg-green-600/50 hover:bg-green-500/60 border-green-400 ring-2 ring-green-400/50', text: 'text-green-200', icon: '🥇' };
                        case 2: return { bg: 'bg-blue-600/50 hover:bg-blue-500/60 border-blue-400 ring-2 ring-blue-400/50', text: 'text-blue-200', icon: '🥈' };
                        case 3: return { bg: 'bg-purple-600/50 hover:bg-purple-500/60 border-purple-400 ring-2 ring-purple-400/50', text: 'text-purple-200', icon: '🥉' };
                        default: return { bg: 'bg-yellow-600/50 hover:bg-yellow-500/60 border-yellow-400 ring-2 ring-yellow-400/50', text: 'text-yellow-200', icon: '💡' };
                      }
                    };
                    const prefStyle = getPreferenceStyle();
                    
                    return (
                      <div
                        key={idx}
                        id={`time-slot-${idx}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDropOnSlot(idx)}
                        onClick={() => handleClickOnSlot(idx)}
                        className={`min-h-16 rounded border p-2 transition flex items-center gap-4 ${
                          isOccupied
                            ? 'bg-slate-800 border-slate-600 cursor-not-allowed opacity-80'
                            : isSlotHighlighted
                              ? 'cursor-pointer bg-green-800/60 border-green-400 ring-2 ring-green-500'
                              : prefStyle 
                                ? `cursor-pointer ${prefStyle.bg}` 
                                : (isDropTarget || canMoveHere)
                                  ? 'cursor-pointer bg-teal-900/30 hover:bg-teal-800/50 border-teal-500' 
                                  : 'cursor-pointer bg-slate-700 hover:bg-slate-600 border-slate-600'
                        }`}
                      >
                        <div className={`text-xs font-semibold w-56 ${prefStyle ? prefStyle.text : 'text-slate-300'}`}>
                          {prefStyle && <span className="mr-1">{prefStyle.icon}</span>}
                          {isOccupied && <span className="mr-1">🔒</span>}
                          UTC {String(slot.hour).padStart(2, '0')}:{String(slot.minute).padStart(2, '0')}~
                          {String((slot.hour + ((slot.minute + 30) >= 60 ? 1 : 0)) % 24).padStart(2, '0')}:{String((slot.minute + 30) % 60).padStart(2, '0')}
                          <br />
                          (台灣 {String(twStartHour).padStart(2, '0')}:{String(twStartMin).padStart(2, '0')}~
                          {String(twEndHourInt).padStart(2, '0')}:{String(twEndMinInt).padStart(2, '0')})
                        </div>
                        <div className="flex-1 flex flex-wrap gap-2">
                          {assignedPlayers.map((player, pidx) => {
                            // 從 submissions 中查找完整的玩家資訊來補充缺失的資料
                            const matchingSub = submissions.find(s => s.id === player.id);
                            const avatarImage = player.avatarImage || matchingSub?.user?.avatarImage;
                            const stoveLv = player.stoveLv || matchingSub?.user?.stoveLv || 0;
                            const playerFireLevel = getFireCrystalLevel(stoveLv);
                            const isDragging = draggedAssignedPlayer?.player?.id === player.id;
                            return (
                            <div
                              key={pidx}
                              draggable
                              onDragStart={() => setDraggedAssignedPlayer({ player, fromSlotIndex: idx, playerIndex: pidx })}
                              onDragEnd={() => setDraggedAssignedPlayer(null)}
                              className={`flex items-center gap-2 rounded-lg px-2 py-1 cursor-move ${isDragging ? 'bg-teal-700 ring-2 ring-teal-400' : 'bg-slate-800 hover:bg-slate-700'}`}
                              title={`${player.playerName} - 拖曳可移動時段`}
                            >
                              {/* 刪除按鈕 */}
                              <button 
                                onClick={() => {
                                  const key = `${officerType}_slots`;
                                  const newOfficers = { ...officers };
                                  if (newOfficers[key]?.[idx]?.players) {
                                    newOfficers[key][idx].players = newOfficers[key][idx].players.filter((_: any, i: number) => i !== pidx);
                                    setOfficers(newOfficers);
                                    saveOfficers(newOfficers, false); // 自動保存
                                  }
                                }}
                                className="w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                              >
                                ✕
                              </button>
                              {/* 頭像 */}
                              <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-500 flex-shrink-0 bg-slate-600">
                                {avatarImage ? (
                                  <img src={avatarImage} alt={player.playerName} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-sm">👤</div>
                                )}
                              </div>
                              {/* 名字和 ID */}
                              <div className="flex flex-col min-w-0">
                                <span className="text-white text-xs font-semibold truncate max-w-24">{player.playerName}</span>
                                <span className="text-slate-400 text-[10px]">ID: {player.gameId || player.id}</span>
                              </div>
                              {/* 熔爐等級 */}
                              {playerFireLevel ? (
                                <div className="flex items-center gap-1">
                                  <img 
                                    src={`/assets/furnace/stove_lv_${playerFireLevel}.png`} 
                                    alt={`FC ${playerFireLevel}`}
                                    className="w-5 h-5"
                                  />
                                  <span className="text-slate-400 text-[10px]">({stoveLv})</span>
                                </div>
                              ) : (
                                <span className="text-slate-300 text-xs">LV{stoveLv || '?'}</span>
                              )}
                            </div>
                          );})}
                          {/* 特殊新增按鈕 - 只在時段未佔用時顯示，放在最後面 */}
                          {!isOccupied && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickAddSlotIndex(idx);
                                setShowQuickAddModal(true);
                              }}
                              className="flex items-center gap-1 px-2 py-1 bg-orange-600 hover:bg-orange-700 rounded text-white text-xs transition ml-auto"
                              title="特殊新增：新增不在可用名單中的玩家"
                            >
                              <UserPlus size={14} />
                              <span>特殊新增</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            </>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="搜尋會員（ID、暱稱、聯盟）..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    <th className="px-6 py-3 text-center text-slate-300 font-semibold">會員ID (FID)</th>
                    <th className="px-6 py-3 text-center text-slate-300 font-semibold">名字</th>
                    <th className="px-6 py-3 text-center text-slate-300 font-semibold">聯盟</th>
                    <th className="px-6 py-3 text-center text-slate-300 font-semibold">管理員</th>
                    <th className="px-6 py-3 text-center text-slate-300 font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="border-b border-slate-700">
                      <td className="px-6 py-3 text-white font-mono text-xs text-center">{user.gameId || '-'}</td>
                      <td className="px-6 py-3 text-white text-center">{user.nickname || '-'}</td>
                      <td className="px-6 py-3 text-white text-center">{user.allianceName || '-'}</td>
                      <td className="px-6 py-3 text-center">
                        {user.isAdmin ? <span className="text-green-400 font-bold">✔</span> : <span className="text-slate-500">—</span>}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* 只有超級管理員才能設定管理員權限 */}
                          {currentUser?.gameId === SUPER_ADMIN_ID && user.gameId !== 'admin' && user.gameId !== SUPER_ADMIN_ID && (
                            user.isAdmin ? (
                              <button
                                onClick={async () => {
                                  await AuthService.setAdmin(user.gameId, false);
                                  addToast('已取消管理員', 'info');
                                  setUsers(users => users.map(u => u.gameId === user.gameId ? { ...u, isAdmin: false } : u));
                                }}
                                className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded text-xs"
                              >
                                取消管理員
                              </button>
                            ) : (
                              <button
                                onClick={async () => {
                                  await AuthService.setAdmin(user.gameId, true);
                                  addToast('已設為管理員', 'success');
                                  setUsers(users => users.map(u => u.gameId === user.gameId ? { ...u, isAdmin: true } : u));
                                }}
                                className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs"
                              >
                                設為管理員
                              </button>
                            )
                          )}
                          {/* 刪除用戶按鈕 - 管理員可用，不能刪除超級管理員和自己 */}
                          {user.gameId !== 'admin' && user.gameId !== SUPER_ADMIN_ID && user.gameId !== currentUser?.gameId && (
                            <button
                              onClick={() => {
                                setUserToDelete(user);
                                setShowDeleteUserModal(true);
                              }}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                              title="刪除用戶"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <div className="space-y-6">
            {/* 場次選擇界面 */}
            {!selectedEventForManagement ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white">選擇場次 - 報名管理</h2>
                </div>
                
                {/* 場次列表 */}
                <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-700 text-slate-300">
                      <tr>
                        <th className="px-4 py-3 text-left">場次日期</th>
                        <th className="px-4 py-3 text-left">標題</th>
                        <th className="px-4 py-3 text-left">報名時間</th>
                        <th className="px-4 py-3 text-left">狀態</th>
                        <th className="px-4 py-3 text-center">報名人數</th>
                        <th className="px-4 py-3 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {events.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                            尚無場次，請先在「場次設定」中建立場次
                          </td>
                        </tr>
                      ) : (
                        events.map(event => {
                          // 計算該場次的報名人數
                          const eventSubmissions = submissions.filter(s => s.eventDate === event.eventDate);
                          const startTimes = formatTimeWithTimezones(event.registrationStart, true);
                          const endTimes = formatTimeWithTimezones(event.registrationEnd, true);
                          return (
                            <tr key={event.id} className="text-white hover:bg-slate-700/50">
                              <td className="px-4 py-3 font-semibold">{event.eventDate}</td>
                              <td className="px-4 py-3">{event.title || '-'}</td>
                              <td className="px-4 py-3 text-xs">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-cyan-400">UTC: {startTimes.utcTime} ~ {endTimes.utcTime}</span>
                                  <span className="text-yellow-400">台灣: {startTimes.twTime} ~ {endTimes.twTime}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  event.status === 'open' 
                                    ? 'bg-green-600 text-white' 
                                    : event.status === 'closed' 
                                      ? 'bg-yellow-600 text-white'
                                      : 'bg-slate-600 text-slate-300'
                                }`}>
                                  {event.status === 'open' ? '開放報名' : event.status === 'closed' ? '截止報名' : '關閉'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-blue-400 font-semibold">{eventSubmissions.length}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => {
                                    setSelectedEventForManagement(event);
                                  }}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
                                >
                                  查看報名
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <>
                {/* 返回按鈕和場次資訊 */}
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={() => setSelectedEventForManagement(null)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition flex items-center gap-2"
                  >
                    ← 返回場次列表
                  </button>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-semibold">{selectedEventForManagement.eventDate}</span>
                    {selectedEventForManagement.title && (
                      <span className="text-slate-400">- {selectedEventForManagement.title}</span>
                    )}
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      selectedEventForManagement.status === 'open' 
                        ? 'bg-green-600 text-white' 
                        : selectedEventForManagement.status === 'closed' 
                          ? 'bg-yellow-600 text-white'
                          : 'bg-slate-600 text-slate-300'
                    }`}>
                      {selectedEventForManagement.status === 'open' ? '開放報名' : selectedEventForManagement.status === 'closed' ? '截止報名' : '關閉'}
                    </span>
                  </div>
                </div>

                {/* Type Filter Tabs */}
                <div className="flex gap-2 border-b border-slate-700">
              <button
                onClick={() => setSubmissionType('research')}
                className={`px-6 py-3 font-semibold border-b-2 transition ${
                  submissionType === 'research'
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                🧬 研究增益報名
              </button>
              <button
                onClick={() => setSubmissionType('training')}
                className={`px-6 py-3 font-semibold border-b-2 transition ${
                  submissionType === 'training'
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                ⚔️ 訓練士兵增益報名
              </button>
              <button
                onClick={() => setSubmissionType('building')}
                className={`px-6 py-3 font-semibold border-b-2 transition ${
                  submissionType === 'building'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                🏗️ 建築增益報名
              </button>
            </div>

            <div className="flex gap-4 flex-wrap">
              <input
                type="text"
                placeholder="搜尋報名（ID、名稱、遊戲ID）..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 min-w-64 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <select
                value={filterAlliance}
                onChange={(e) => setFilterAlliance(e.target.value)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">所有聯盟</option>
                {alliances.map(alliance => (
                  <option key={alliance} value={alliance}>{alliance}</option>
                ))}
              </select>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
              >
                <Download size={18} />
                匯出CSV
              </button>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50">
                    <th className="px-6 py-3 text-left text-slate-300 font-semibold">遊戲ID</th>
                    <th className="px-6 py-3 text-left text-slate-300 font-semibold">遊戲名稱</th>
                    <th className="px-6 py-3 text-left text-slate-300 font-semibold">聯盟</th>
                    {submissionType === 'research' && (
                      <>
                        <th className="px-6 py-3 text-left text-slate-300 font-semibold">📊 科技加速</th>
                        <th className="px-6 py-3 text-left text-slate-300 font-semibold">⏰ 通用加速</th>
                        <th className="px-6 py-3 text-left text-slate-300 font-semibold">🔥 火晶餘燼</th>
                      </>
                    )}
                    {submissionType === 'training' && (
                      <>
                        <th className="px-6 py-3 text-left text-slate-300 font-semibold">✨ 訓練士兵加速</th>
                        <th className="px-6 py-3 text-left text-slate-300 font-semibold">⏰ 通用加速</th>
                      </>
                    )}
                    {submissionType === 'building' && (
                      <>
                        <th className="px-6 py-3 text-left text-slate-300 font-semibold">💎 火晶數量</th>
                        <th className="px-6 py-3 text-left text-slate-300 font-semibold">🔮 精煉火晶數量</th>
                        <th className="px-6 py-3 text-left text-slate-300 font-semibold">🏗️ 建築加速</th>
                      </>
                    )}
                    <th className="px-6 py-3 text-left text-slate-300 font-semibold">報名時段</th>
                    <th className="px-6 py-3 text-center text-slate-300 font-semibold">報名時間</th>
                    <th className="px-6 py-3 text-center text-slate-300 font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                        無報名資料
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map(submission => {
                      return (
                        <tr key={submission.id} className="border-b border-slate-700 hover:bg-slate-900/50 transition">
                          <td className="px-6 py-3 text-white font-mono text-xs">{submission.gameId}</td>
                          <td className="px-6 py-3 text-white">{submission.playerName}</td>
                          <td className="px-6 py-3">
                            <span className="px-3 py-1 bg-blue-900/30 text-blue-300 rounded-full text-xs">
                              {submission.alliance}
                            </span>
                          </td>
                          {submissionType === 'research' && (() => {
                            const slot = submission.slots.tuesday;
                            return (
                              <>
                                <td className="px-6 py-3 text-white font-semibold text-xs">
                                  {slot && (slot.researchAccel?.days! > 0 || slot.researchAccel?.hours! > 0 || slot.researchAccel?.minutes! > 0)
                                    ? `${slot.researchAccel.days}天${slot.researchAccel.hours}h${slot.researchAccel.minutes}m`
                                    : '-'
                                  }
                                </td>
                                <td className="px-6 py-3 text-white font-semibold text-xs">
                                  {slot && (slot.generalAccel?.days! > 0 || slot.generalAccel?.hours! > 0 || slot.generalAccel?.minutes! > 0)
                                    ? `${slot.generalAccel.days}天${slot.generalAccel.hours}h${slot.generalAccel.minutes}m`
                                    : '-'
                                  }
                                </td>
                                <td className="px-6 py-3 text-white font-semibold text-xs">
                                  {slot?.upgradeT11 && slot.fireSparkleCount ? slot.fireSparkleCount : '-'}
                                </td>
                              </>
                            );
                          })()}
                          {submissionType === 'training' && (() => {
                            const slot = submission.slots.thursday;
                            return (
                              <>
                                <td className="px-6 py-3 text-white font-semibold text-xs">
                                  {slot && slot.fireSparkleCount! > 0 ? slot.fireSparkleCount : '-'}
                                </td>
                                <td className="px-6 py-3 text-white font-semibold text-xs">
                                  {slot && (slot.generalAccel?.days! > 0 || slot.generalAccel?.hours! > 0 || slot.generalAccel?.minutes! > 0)
                                    ? `${slot.generalAccel.days}天${slot.generalAccel.hours}h${slot.generalAccel.minutes}m`
                                    : '-'
                                  }
                                </td>
                              </>
                            );
                          })()}
                          {submissionType === 'building' && (() => {
                            const slot = submission.slots.friday;
                            return (
                              <>
                                <td className="px-6 py-3 text-white font-semibold text-xs">
                                  {slot && slot.fireGemCount! > 0 ? slot.fireGemCount : '-'}
                                </td>
                                <td className="px-6 py-3 text-white font-semibold text-xs">
                                  {slot && slot.refinedFireGemCount! > 0 ? slot.refinedFireGemCount : '-'}
                                </td>
                                <td className="px-6 py-3 text-white font-semibold text-xs">
                                  {slot && (slot.generalAccel?.days! > 0 || slot.generalAccel?.hours! > 0 || slot.generalAccel?.minutes! > 0)
                                    ? `${slot.generalAccel.days}天${slot.generalAccel.hours}h${slot.generalAccel.minutes}m`
                                    : '-'
                                  }
                                </td>
                              </>
                            );
                          })()}
                          <td className="px-6 py-3 text-slate-300 text-xs">
                            <div className="space-y-1">
                              {(() => {
                                // 根據類型取得對應的 slot
                                const slotKey = submissionType === 'research' ? 'tuesday' : submissionType === 'training' ? 'thursday' : 'friday';
                                const slot = submission.slots[slotKey];
                                if (!slot?.timeSlots?.length) return <span className="text-slate-500">-</span>;
                                
                                return slot.timeSlots.map((ts: any, idx: number) => {
                                  if (!ts.start || !ts.end) return null;
                                  const labels = ['🥇 第一志願', '🥈 第二志願', '🥉 第三志願'];
                                  const colors = ['text-green-300', 'text-blue-300', 'text-purple-300'];
                                  return (
                                    <div key={idx} className={colors[idx] || 'text-slate-300'}>
                                      {labels[idx] || `第${idx + 1}志願`}: {ts.start}-{ts.end}
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-slate-400 text-center text-xs">
                            {new Date(submission.submittedAt).toLocaleDateString('zh-TW')}
                          </td>
                          <td className="px-6 py-3 text-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedSubmission(submission);
                                setShowDetailModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 rounded transition text-xs"
                            >
                              <Eye size={14} />
                              詳情
                            </button>
                            <button
                              onClick={() => handleDeleteSubmission(submission.id)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded transition text-xs"
                            >
                              <Trash2 size={14} />
                              刪除
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            </>
            )}
          </div>
        )}

        {/* Detail Modal */}
      {showDetailModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-6">報名詳情</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase mb-1">遊戲ID</p>
                  <p className="text-white font-semibold">{selectedSubmission.gameId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase mb-1">遊戲名稱</p>
                  <p className="text-white font-semibold">{selectedSubmission.playerName}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-400 uppercase mb-1">聯盟</p>
                  <p className="text-white font-semibold">{selectedSubmission.alliance}</p>
                </div>
              </div>

              <div className="border-t border-slate-600 pt-4">
                <h4 className="text-white font-semibold mb-3">報名時段詳情</h4>
                <div className="space-y-3">
                  {/* 找到已勾選的 slot 並顯示 */}
                  {(() => {
                    const entries = Object.entries(selectedSubmission.slots);
                    const checkedEntry = entries.find(([_, slot]: [string, any]) => slot?.checked);
                    if (!checkedEntry) return <p className="text-slate-500">無報名時段</p>;
                    
                    const [dayKey, slot] = checkedEntry as [string, any];
                    const typeLabels: Record<string, string> = {
                      tuesday: '🔬 研究科技增益',
                      thursday: '🎖️ 士兵訓練增益',
                      friday: '🏗️ 建築訓練增益'
                    };
                    
                    return (
                      <div className="bg-slate-700/50 rounded p-3 border border-slate-600">
                        <p className="text-slate-300 font-semibold mb-3">{typeLabels[dayKey] || dayKey}</p>
                        
                        {/* 志願時間 */}
                        <div className="text-xs text-slate-400 space-y-1 mb-3">
                          <p className="text-white font-semibold mb-1">志願時間：</p>
                          {slot.timeSlots?.map((ts: any, idx: number) => {
                            if (!ts.start || !ts.end) return null;
                            const labels = ['🥇 第一志願', '🥈 第二志願', '🥉 第三志願'];
                            const colors = ['text-green-300', 'text-blue-300', 'text-purple-300'];
                            return (
                              <p key={idx} className={colors[idx] || 'text-slate-300'}>
                                {labels[idx] || `第${idx + 1}志願`}: {ts.start} - {ts.end}
                              </p>
                            );
                          })}
                        </div>
                        
                        {/* 資源數量 */}
                        <div className="text-xs text-slate-400 space-y-1">
                          <p className="text-white font-semibold mb-1">資源：</p>
                          {dayKey === 'tuesday' && (
                            <>
                              <p>科技加速: {slot.researchAccel?.days || 0}天 {slot.researchAccel?.hours || 0}小時 {slot.researchAccel?.minutes || 0}分</p>
                              <p>通用加速: {slot.generalAccel?.days || 0}天 {slot.generalAccel?.hours || 0}小時 {slot.generalAccel?.minutes || 0}分</p>
                              {slot.upgradeT11 && <p className="text-pink-400">✓ T11升級 - 火晶微粒: {slot.fireSparkleCount || 0}</p>}
                            </>
                          )}
                          {dayKey === 'thursday' && (
                            <>
                              <p>火晶餘燼: {slot.fireSparkleCount || 0}</p>
                              <p>通用加速: {slot.generalAccel?.days || 0}天 {slot.generalAccel?.hours || 0}小時 {slot.generalAccel?.minutes || 0}分</p>
                            </>
                          )}
                          {dayKey === 'friday' && (
                            <>
                              <p>火晶: {slot.fireGemCount || 0}</p>
                              <p>精煉火晶: {slot.refinedFireGemCount || 0}</p>
                              <p>通用加速: {slot.generalAccel?.days || 0}天 {slot.generalAccel?.hours || 0}小時 {slot.generalAccel?.minutes || 0}分</p>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="border-t border-slate-600 pt-4 text-xs text-slate-400">
                報名時間: {new Date(selectedSubmission.submittedAt).toLocaleString('zh-TW')}
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t border-slate-600">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
              >
                關閉
              </button>
              <button
                onClick={() => {
                  handleDeleteSubmission(selectedSubmission.id);
                  setShowDetailModal(false);
                }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                刪除報名
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 特殊新增玩家 Modal */}
      {showQuickAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-600 shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <UserPlus size={24} />
                特殊新增玩家
              </h3>
              <button
                onClick={() => {
                  setShowQuickAddModal(false);
                  setQuickAddSlotIndex(null);
                  setQuickAddPlayerId('');
                  setQuickAddAlliance('');
                  setQuickAddCustomAlliance('');
                  setQuickAddShowCustom(false);
                  setQuickAddPlayerData(null);
                  setQuickAddIsExistingUser(false);
                  setQuickAddExistingUserAlliance('');
                }}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* 玩家 ID 輸入 */}
              <div>
                <label className="block text-slate-300 text-sm mb-2">玩家 ID (FID)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickAddPlayerId}
                    onChange={(e) => setQuickAddPlayerId(e.target.value)}
                    placeholder="輸入玩家遊戲 ID"
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                  />
                  <button
                    onClick={handleQuickAddSearch}
                    disabled={quickAddLoading}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-600 text-white rounded transition flex items-center gap-1"
                  >
                    <Search size={16} />
                    {quickAddLoading ? '查詢中...' : '查詢'}
                  </button>
                </div>
              </div>

              {/* 玩家資料預覽 */}
              {quickAddPlayerData && (
                <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-teal-500 bg-slate-600">
                      {quickAddPlayerData.avatarImage ? (
                        <img src={quickAddPlayerData.avatarImage} alt={quickAddPlayerData.nickname} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">{quickAddPlayerData.nickname}</p>
                      <p className="text-slate-400 text-sm">ID: {quickAddPlayerId}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getFireCrystalLevel(quickAddPlayerData.stoveLv) ? (
                          <>
                            <img 
                              src={`/assets/furnace/stove_lv_${getFireCrystalLevel(quickAddPlayerData.stoveLv)}.png`} 
                              alt="Fire Crystal"
                              className="w-6 h-6"
                            />
                            <span className="text-slate-300 text-sm">熔爐 Lv.{quickAddPlayerData.stoveLv}</span>
                          </>
                        ) : (
                          <span className="text-slate-300 text-sm">熔爐 Lv.{quickAddPlayerData.stoveLv}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 聯盟選擇 - 僅在非會員時顯示 */}
              {quickAddPlayerData && !quickAddIsExistingUser && (
                <>
                  <div>
                    <label className="block text-slate-300 text-sm mb-2">選擇聯盟 <span className="text-red-400">*</span></label>
                    <select
                      value={quickAddAlliance}
                      onChange={(e) => {
                        setQuickAddAlliance(e.target.value);
                        setQuickAddShowCustom(e.target.value === 'custom');
                      }}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="">請選擇聯盟</option>
                      <option value="TWD">TWD</option>
                      <option value="NTD">NTD</option>
                      <option value="QUO">QUO</option>
                      <option value="TTU">TTU</option>
                      <option value="ONE">ONE</option>
                      <option value="DEU">DEU</option>
                      {alliances
                        .filter(a => !['TWD', 'NTD', 'QUO', 'TTU', 'ONE', 'DEU'].includes(a))
                        .map(alliance => (
                          <option key={alliance} value={alliance}>{alliance}</option>
                        ))}
                      <option value="custom">--- 其他（自訂） ---</option>
                    </select>
                  </div>

                  {/* 自訂聯盟輸入 */}
                  {quickAddShowCustom && (
                    <div>
                      <label className="block text-slate-300 text-sm mb-2">自訂聯盟名稱 <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        value={quickAddCustomAlliance}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase().slice(0, 3);
                          setQuickAddCustomAlliance(value);
                        }}
                        placeholder="輸入 3 個字符（英文/數字）"
                        maxLength={3}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 uppercase"
                      />
                      <p className="text-slate-400 text-xs mt-1">
                        僅限大小寫英文和數字，共 3 個字符
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* 提示訊息 - 非會員 */}
              {quickAddPlayerData && !quickAddIsExistingUser && (
                <div className="bg-amber-900/30 border border-amber-600/50 rounded p-3 text-amber-200 text-sm">
                  <p>⚠️ 系統將自動為此玩家建立帳號</p>
                  <p className="text-amber-300 font-semibold">預設密碼：123456</p>
                </div>
              )}

              {/* 提示訊息 - 已是會員 */}
              {quickAddPlayerData && quickAddIsExistingUser && (
                <div className="bg-emerald-900/30 border border-emerald-600/50 rounded p-3 text-emerald-200 text-sm">
                  <p>✅ 此玩家已是會員，將直接加入時段並自動提交報名</p>
                  {quickAddExistingUserAlliance && (
                    <p className="text-emerald-300 font-semibold">聯盟：{quickAddExistingUserAlliance}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-600">
              <button
                onClick={() => {
                  setShowQuickAddModal(false);
                  setQuickAddSlotIndex(null);
                  setQuickAddPlayerId('');
                  setQuickAddAlliance('');
                  setQuickAddCustomAlliance('');
                  setQuickAddShowCustom(false);
                  setQuickAddPlayerData(null);
                  setQuickAddIsExistingUser(false);
                  setQuickAddExistingUserAlliance('');
                }}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
              >
                取消
              </button>
              <button
                onClick={handleQuickAddConfirm}
                disabled={!quickAddPlayerData || (!quickAddIsExistingUser && !quickAddAlliance) || (quickAddAlliance === 'custom' && !quickAddCustomAlliance.trim()) || quickAddLoading}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                <UserPlus size={16} />
                {quickAddLoading ? '處理中...' : '確認新增'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除用戶確認 Modal */}
      {showDeleteUserModal && userToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">確認刪除用戶</h3>
            <p className="text-slate-300 mb-2">
              確定要刪除以下用戶嗎？此操作無法復原。
            </p>
            <div className="bg-slate-900 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                {userToDelete.avatarImage && (
                  <img
                    src={userToDelete.avatarImage}
                    alt="Avatar"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="text-white font-semibold">{userToDelete.nickname || '未設定暱稱'}</p>
                  <p className="text-slate-400 text-sm font-mono">ID: {userToDelete.gameId}</p>
                  <p className="text-slate-400 text-sm">聯盟: {userToDelete.allianceName || '-'}</p>
                </div>
              </div>
            </div>
            <p className="text-red-400 text-sm mb-4">
              ⚠️ 刪除用戶將同時移除該用戶的所有報名資料和子帳號綁定
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteUserModal(false);
                  setUserToDelete(null);
                }}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
                disabled={deletingUser}
              >
                取消
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deletingUser}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                {deletingUser ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AdminDashboard;
