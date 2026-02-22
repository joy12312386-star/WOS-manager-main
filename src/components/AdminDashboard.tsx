import React, { useState, useEffect } from 'react';
import { Users, FileText, LogOut, Search, Download, Trash2, Edit, Eye, Filter, ChevronDown, Calendar, Plus, Settings, ArrowLeft, UserPlus, X, Map } from 'lucide-react';
import { AuthService, FormService, DebugService, OfficerConfigService, EventService, Event, ActivityType, MapService, AllianceMapItem, AllianceMapDetail } from '../services/auth';
import { User, FormSubmission, ACTIVITY_TYPES, DEFAULT_DAY_CONFIG } from '../../types';
import { useToast } from './ui/Toast';
import { useI18n } from '../i18n/I18nProvider';
import { fetchPlayer } from '../services/api';
import { AllianceMapEditor } from './AllianceMapEditor';

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

// 生成時間選項 (UTC 00:00 - 翌日 00:00)
const generateTimeOptions = (t: (key: string) => string) => {
  const options = [];
  for (let i = 0; i <= 24; i++) {
    const isNextDay = i === 24;
    const utcHour = isNextDay ? 0 : i;
    const utcHourStr = String(utcHour).padStart(2, '0');
    const taiwanHour = (i + 8) % 24;
    const taiwanHourStr = String(taiwanHour).padStart(2, '0');
    const day = i >= 24 || i + 8 >= 24 ? t('nextDay') : '';
    options.push({
      value: i,
      label: `UTC ${utcHourStr}:00 (台灣 ${taiwanHourStr}:00) ${day}`
    });
  }
  return options;
};

// 正規化時間字串 - 處理異常的時間值（如 "47:00" 轉為 "23:30" 等）
// 舊資料可能使用了 48 個半小時時段的索引值 (0-47)，需要轉換為正確格式
const normalizeTimeString = (timeStr: string): string => {
  if (!timeStr) return timeStr;
  const parts = timeStr.split(':');
  if (parts.length !== 2) return timeStr;
  
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  
  // 如果小時數在正常範圍 (0-24)，直接返回
  if (hour <= 24) {
    return timeStr;
  }
  
  // 舊系統使用 48 個半小時時段 (0-47)，需要轉換
  // 時段索引 * 30 分鐘 = 總分鐘數
  const totalMinutes = hour * 30; // hour 在這裡實際上是 slot index
  const normalizedHour = Math.floor(totalMinutes / 60) % 24;
  const normalizedMinute = totalMinutes % 60;
  
  return `${String(normalizedHour).padStart(2, '0')}:${String(normalizedMinute).padStart(2, '0')}`;
};

// 格式化時間範圍，同時顯示 UTC 和台灣時間
// 格式: UTC XX:XX~XX:XX（台灣時間 XX:XX～XX:XX）
const formatTimeRangeWithTaiwan = (startStr: string, endStr: string): string => {
  const startNormalized = normalizeTimeString(startStr);
  const endNormalized = normalizeTimeString(endStr);
  if (!startNormalized || !endNormalized) return `${startNormalized || '-'}~${endNormalized || '-'}`;
  
  const startParts = startNormalized.split(':');
  const endParts = endNormalized.split(':');
  if (startParts.length !== 2 || endParts.length !== 2) return `${startNormalized}~${endNormalized}`;
  
  const startUtcHour = parseInt(startParts[0], 10);
  const endUtcHour = parseInt(endParts[0], 10);
  
  // 台灣時間 = UTC + 8
  const startTaiwanHour = (startUtcHour + 8) % 24;
  const endTaiwanHour = (endUtcHour + 8) % 24;
  
  const startTaiwanStr = `${String(startTaiwanHour).padStart(2, '0')}:${startParts[1]}`;
  const endTaiwanStr = `${String(endTaiwanHour).padStart(2, '0')}:${endParts[1]}`;
  
  return `UTC ${startNormalized}~${endNormalized}（台灣時間 ${startTaiwanStr}～${endTaiwanStr}）`;
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
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'users' | 'submissions' | 'officers' | 'events' | 'map'>('users');
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
  // 地圖數據
  const [mapData, setMapData] = useState<any>(null);
  const [mapList, setMapList] = useState<AllianceMapItem[]>([]);
  const [editingMapId, setEditingMapId] = useState<string | null>(null);
  const [showMapEditor, setShowMapEditor] = useState(false);
  const [newMapTitle, setNewMapTitle] = useState('');
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
  // 重設密碼
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  // 管理員聯盟權限設定
  const [showAdminSettingsModal, setShowAdminSettingsModal] = useState(false);
  const [userToSetAdmin, setUserToSetAdmin] = useState<User | null>(null);
  const [selectedManagedAlliances, setSelectedManagedAlliances] = useState<string[]>([]);
  const [manageAllAlliances, setManageAllAlliances] = useState(true);
  const [canAssignOfficers, setCanAssignOfficers] = useState(true);
  const [canManageEvents, setCanManageEvents] = useState(true);
  // 編輯報名資料
  const [showEditSubmissionModal, setShowEditSubmissionModal] = useState(false);
  const [submissionToEdit, setSubmissionToEdit] = useState<FormSubmission | null>(null);
  const [editPlayerName, setEditPlayerName] = useState('');
  const [editAlliance, setEditAlliance] = useState('');
  const [editSlots, setEditSlots] = useState<any>(null);
  const [editingSubmission, setEditingSubmission] = useState(false);
  
  // 可選的聯盟列表
  const ALLIANCE_OPTIONS = ['TWD', 'NTD', 'QUO', 'TTU', 'ONE', 'DEU'];
  
  // 時間選項
  const timeOptions = generateTimeOptions(t);
  
  // 編輯時段相關函數
  const handleEditTimeSlotChange = (day: string, index: number, field: 'start' | 'end', value: number) => {
    const timeStr = String(value).padStart(2, '0') + ':00';
    setEditSlots((prev: any) => {
      if (!prev) return prev;
      const slot = { ...prev[day] };
      if (!slot.timeSlots) slot.timeSlots = [{ start: '', end: '' }];
      slot.timeSlots = [...slot.timeSlots];
      slot.timeSlots[index] = { ...slot.timeSlots[index], [field]: timeStr };
      return { ...prev, [day]: slot };
    });
  };

  const addEditTimeSlot = (day: string) => {
    setEditSlots((prev: any) => {
      if (!prev) return prev;
      const slot = { ...prev[day] };
      if (!slot.timeSlots) slot.timeSlots = [];
      slot.timeSlots = [...slot.timeSlots, { start: '', end: '' }];
      return { ...prev, [day]: slot };
    });
  };

  const removeEditTimeSlot = (day: string, index: number) => {
    setEditSlots((prev: any) => {
      if (!prev) return prev;
      const slot = { ...prev[day] };
      if (!slot.timeSlots) return prev;
      slot.timeSlots = slot.timeSlots.filter((_: any, i: number) => i !== index);
      if (slot.timeSlots.length === 0) {
        slot.timeSlots = [{ start: '', end: '' }];
      }
      return { ...prev, [day]: slot };
    });
  };
  
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
      addToast(t('saveFailed'), 'error');
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
        addToast(`${t('userDeleted')} ${userToDelete.nickname || userToDelete.gameId}`, 'success');
        setShowDeleteUserModal(false);
        setUserToDelete(null);
      } else {
        addToast(t('deleteFailed'), 'error');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      addToast(t('deleteFailed'), 'error');
    } finally {
      setDeletingUser(false);
    }
  };

  // 重設密碼
  const handleResetPassword = async () => {
    if (!userToResetPassword) return;
    
    if (newPassword.length < 6) {
      addToast(t('passwordMinLength'), 'error');
      return;
    }
    
    setResettingPassword(true);
    try {
      const success = await AuthService.resetPassword(userToResetPassword.gameId, newPassword);
      if (success) {
        addToast(`${t('passwordResetSuccess')} - ${userToResetPassword.nickname || userToResetPassword.gameId}`, 'success');
        setShowResetPasswordModal(false);
        setUserToResetPassword(null);
        setNewPassword('');
      } else {
        addToast(t('passwordResetFailed'), 'error');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      addToast(t('passwordResetFailed'), 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  // 一鍵清除所有排定
  const handleClearAllAssignments = () => {
    const key = `${officerType}_slots`;
    const newOfficers = { ...officers };
    newOfficers[key] = [];
    setOfficers(newOfficers);
    saveOfficers(newOfficers, false);
    addToast(t('clearAllAssignments'), 'success');
  };

  // 切換官職類型（不再自動分配）
  const handleSwitchOfficerType = (newType: 'research' | 'training' | 'building') => {
    if (newType === officerType) return; // 如果是同一類型，不做任何事
    
    // 清除UI選擇狀態
    setHighlightedSlotIndex(null);
    setSelectedPlayer(null);
    setOfficerType(newType);
    // 不再自動分配，讓管理員手動操作
  };

  // 自動分配指定類型的未分配玩家
  const handleAutoAssignUnassigned = async (typeToAssign?: 'research' | 'training' | 'building') => {
    const targetType = typeToAssign || officerType;
    const slotKey = getSlotKeyByType(targetType);
    const key = `${targetType}_slots`;
    
    // 取得所有官職類型中已分配的玩家ID
    const assignedPlayerIds = new Set<string>();
    const newOfficers = { ...officers };
    if (!newOfficers[key]) newOfficers[key] = [];
    
    // 收集所有類型已分配的玩家ID（防止同一人出現在不同官職類型）
    const types = ['research', 'training', 'building'] as const;
    for (const type of types) {
      const typeKey = `${type}_slots`;
      for (const slot of (newOfficers[typeKey] || [])) {
        if (slot?.players) {
          for (const player of slot.players) {
            assignedPlayerIds.add(player.id);
          }
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
      addToast(`已自動分配 ${assignedCount} 位 ${[t('research'), t('training'), t('building')][['research', 'training', 'building'].indexOf(targetType)]} 玩家`, 'success');
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
    
    // 取得所有官職類型中已分配的玩家ID（防止同一人出現在不同官職類型）
    const assignedPlayerIds = new Set<string>();
    const types = ['research', 'training', 'building'] as const;
    for (const type of types) {
      const typeKey = `${type}_slots`;
      for (const slot of (newOfficers[typeKey] || [])) {
        if (slot?.players) {
          for (const player of slot.players) {
            assignedPlayerIds.add(player.id);
            if (player.gameId) assignedPlayerIds.add(player.gameId); // 也用 gameId 追蹤
          }
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
      addToast(`已自動分配 ${assignedCount} 位玩家（依${sortBy === 'accel' ? t('researchAccel') : '火晶微粒'}排序）`, 'success');
    } else if (eligiblePlayers.length === 0) {
      addToast(t('allPlayersAssigned'), 'info');
    } else {
      addToast(t('noEmptySlotsForPreference'), 'info');
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

  // 檢查玩家是否已在任何時段中（檢查所有官職類型）
  const isPlayerInAnySlot = (playerId: string, gameId?: string): { inSlot: boolean; slotIndex?: number; officerType?: string } => {
    // 檢查所有三種官職類型的時段
    const types = ['research', 'training', 'building'] as const;
    for (const type of types) {
      const key = `${type}_slots`;
      const slots = officers[key] || [];
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        // 同時檢查 id 和 gameId，以支持特殊新增的玩家
        if (slot?.players?.find((p: any) => p.id === playerId || (gameId && p.gameId === gameId))) {
          return { inSlot: true, slotIndex: i, officerType: type };
        }
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
            preferredSlots.push(`${normalizeTimeString(ts.start)}~${normalizeTimeString(ts.end)}`);
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
        const typeNames = { research: t('research'), training: t('training'), building: t('building') };
        const typeName = typeNames[check.officerType as keyof typeof typeNames] || check.officerType;
        addToast(`${submission.playerName} 已在${typeName}時段 ${check.slotIndex! + 1} 中，請先移除`, 'error');
        return;
      }
      setSelectedPlayer(submission);
      setHighlightedSlotIndex(null); // 選擇玩家時清除時段高亮
      addToast(`${t('selectingPlayer')} ${submission.playerName}，${t('pleaseClickSlot')}`, 'info');
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
      const typeNames = { research: t('research'), training: t('training'), building: t('building') };
      const typeName = typeNames[check.officerType as keyof typeof typeNames] || check.officerType;
      addToast(`${selectedPlayer.playerName} 已在${typeName}時段 ${check.slotIndex! + 1} 中，一人只能在一個時段`, 'error');
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
    addToast(`${selectedPlayer.playerName} ${t('allocatedSlot')}`, 'success');
    
    // 更新報名表單的時段資訊
    const timeSlots = generateTimeSlots();
    const assignedSlot = timeSlots[slotId];
    if (assignedSlot) {
      updateSubmissionTimeSlot(
        selectedPlayer,
        officerType,
        assignedSlot.hour,
        assignedSlot.minute
      );
    }
    
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
      addToast(`${draggedAssignedPlayer.player.playerName} ${t('movedToNewSlot')}`, 'success');
      setDraggedAssignedPlayer(null);
      saveOfficers(newOfficers, false); // 自動保存
      
      // 更新報名表單的時段資訊（移動時段時）
      const timeSlots = generateTimeSlots();
      const assignedSlot = timeSlots[slotId];
      if (assignedSlot) {
        // 從 submissions 中找到對應的報名資料
        const matchingSub = submissions.find(s => s.id === draggedAssignedPlayer.player.id);
        if (matchingSub) {
          updateSubmissionTimeSlot(
            matchingSub,
            officerType,
            assignedSlot.hour,
            assignedSlot.minute
          );
        }
      }
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
      const typeNames = { research: t('research'), training: t('training'), building: t('building') };
      const typeName = typeNames[check.officerType as keyof typeof typeNames] || check.officerType;
      addToast(`${draggedPlayer.submission.playerName} 已在${typeName}時段 ${check.slotIndex! + 1} 中，一人只能在一個時段`, 'error');
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
    addToast(`${draggedPlayer.submission.playerName} ${t('allocatedSlot')}`, 'success');
    saveOfficers(newOfficers, false); // 自動保存
    
    // 更新報名表單的時段資訊
    const timeSlots = generateTimeSlots();
    const assignedSlot = timeSlots[slotId];
    if (assignedSlot) {
      updateSubmissionTimeSlot(
        draggedPlayer.submission,
        officerType,
        assignedSlot.hour,
        assignedSlot.minute
      );
    }
  };

  // 更新報名表單的時段資訊（當管理員分配官職時）
  const updateSubmissionTimeSlot = async (
    submission: FormSubmission,
    type: 'research' | 'training' | 'building',
    slotHour: number,
    slotMinute: number
  ) => {
    try {
      const slotKey = getSlotKeyByType(type);
      const startTime = `${String(slotHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}`;
      // 結束時間為開始時間 + 30 分鐘
      const endMinutes = slotHour * 60 + slotMinute + 30;
      const endHour = Math.floor(endMinutes / 60) % 24;
      const endMin = endMinutes % 60;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
      
      // 深拷貝原有的 slots
      const updatedSlots = JSON.parse(JSON.stringify(submission.slots || {}));
      
      // 確保該天數的 slot 存在並初始化
      if (!updatedSlots[slotKey]) {
        updatedSlots[slotKey] = {
          checked: true,
          researchAccel: { days: 0, hours: 0, minutes: 0 },
          generalAccel: { days: 0, hours: 0, minutes: 0 },
          upgradeT11: false,
          timeSlots: []
        };
      }
      
      // 設置為已勾選
      updatedSlots[slotKey].checked = true;
      
      // 設置時段（替換為管理員指定的時段）
      updatedSlots[slotKey].timeSlots = [{ start: startTime, end: endTime }];
      
      // 調用 API 更新
      await FormService.adminUpdateSubmission(submission.id, {
        slots: updatedSlots
      });
      
      console.log(`✅ 已更新 ${submission.playerName} 的報名時段: ${slotKey} ${startTime}~${endTime}`);
      
      // 重新載入報名資料以保持同步
      const allSubmissions = await DebugService.getAllSubmissions();
      setSubmissions(allSubmissions);
    } catch (error) {
      console.error('更新報名時段失敗:', error);
      // 不顯示錯誤訊息，因為官職分配本身已成功
    }
  };

  // Load data on mount
  useEffect(() => {
    loadData();
    loadEventDates();
    // 載入地圖數據
    const savedMapData = localStorage.getItem('alliance_map_data');
    if (savedMapData) {
      try {
        setMapData(JSON.parse(savedMapData));
      } catch (e) {
        console.error('Failed to load map data:', e);
      }
    }
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
    console.log('📋 AdminDashboard loadData - users:', allUsers.length, 'submissions:', allSubmissions.length);
    console.log('📋 AdminDashboard loadData - submissions details:', allSubmissions);
    setUsers(allUsers);
    setSubmissions(allSubmissions);
    await loadEvents(); // 載入場次列表
    await loadMapList(); // 載入地圖列表
  };

  // 載入地圖列表
  const loadMapList = async () => {
    const maps = await MapService.getAllMaps();
    setMapList(maps);
  };

  // 創建新地圖
  const handleCreateMap = async () => {
    if (!newMapTitle.trim()) {
      addToast('請輸入地圖標題', 'error');
      return;
    }
    const map = await MapService.createMap({ title: newMapTitle.trim() });
    if (map) {
      addToast('地圖創建成功', 'success');
      setNewMapTitle('');
      await loadMapList();
      // 自動進入編輯模式
      setEditingMapId(map.id);
      setMapData({
        alliances: map.alliances,
        gridData: map.gridData,
        gridOwners: map.gridOwners,
      });
      setShowMapEditor(true);
    } else {
      addToast('創建失敗', 'error');
    }
  };

  // 編輯地圖
  const handleEditMap = async (id: string) => {
    const map = await MapService.getMap(id);
    if (map) {
      setEditingMapId(id);
      setMapData({
        alliances: map.alliances,
        gridData: map.gridData,
        gridOwners: map.gridOwners,
      });
      setShowMapEditor(true);
    } else {
      addToast('載入地圖失敗', 'error');
    }
  };

  // 保存地圖（實時保存，不顯示 toast）
  const handleSaveMap = async (data: any) => {
    if (!editingMapId) return;
    const result = await MapService.updateMap(editingMapId, data);
    if (!result) {
      addToast('保存失敗', 'error');
    }
  };

  // 更新地圖狀態
  const handleUpdateMapStatus = async (id: string, status: 'open' | 'closed') => {
    const success = await MapService.updateMapStatus(id, status);
    if (success) {
      addToast(`地圖狀態已更新為${status === 'open' ? '開放' : '截止'}`, 'success');
      await loadMapList();
    } else {
      addToast('更新失敗', 'error');
    }
  };

  // 刪除地圖
  const handleDeleteMap = async (id: string) => {
    if (!window.confirm('確定要刪除此地圖嗎？此操作無法復原。')) return;
    const success = await MapService.deleteMap(id);
    if (success) {
      addToast('地圖已刪除', 'success');
      await loadMapList();
    } else {
      addToast('刪除失敗', 'error');
    }
  };

  // 複製地圖
  const handleDuplicateMap = async () => {
    if (!editingMapId || !mapData) return;
    const currentMap = mapList.find(m => m.id === editingMapId);
    if (!currentMap) return;
    
    const newTitle = `${currentMap.title} (複製)`;
    const result = await MapService.createMap({
      title: newTitle,
      alliances: mapData.alliances,
      gridData: mapData.gridData,
      gridOwners: mapData.gridOwners,
    });
    
    if (result) {
      addToast('地圖已複製', 'success');
      await loadMapList();
      // 切換到新地圖
      setEditingMapId(result.id);
      setMapData({
        alliances: result.alliances,
        gridData: result.gridData,
        gridOwners: result.gridOwners,
      });
    } else {
      addToast('複製失敗', 'error');
    }
  };

  // 更新地圖標題
  const handleUpdateMapTitle = async (newTitle: string) => {
    if (!editingMapId) return;
    const result = await MapService.updateMap(editingMapId, { title: newTitle });
    if (result) {
      await loadMapList();
    } else {
      addToast('標題更新失敗', 'error');
    }
  };

  // 創建或更新場次
  const handleCreateEvent = async () => {
    if (!newEvent.eventDate || !newEvent.registrationStart || !newEvent.registrationEnd) {
      addToast(t('fieldRequired'), 'error');
      return;
    }
    
    if (editingEvent) {
      // 更新場次（使用原始的 eventDate 作為 URL 參數）
      const result = await EventService.updateEvent(editingEvent.eventDate, {
        title: newEvent.title,
        registrationStart: newEvent.registrationStart,
        registrationEnd: newEvent.registrationEnd,
        description: newEvent.description,
        dayConfig: newEvent.dayConfig as Record<string, any>
      });
      if (result.success) {
        addToast(t('eventUpdatedSuccess'), 'success');
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
        addToast(result.error || t('eventUpdatedFailed'), 'error');
      }
    } else {
      // 創建場次
      const result = await EventService.createEvent({
        eventDate: newEvent.eventDate,
        title: newEvent.title,
        registrationStart: newEvent.registrationStart,
        registrationEnd: newEvent.registrationEnd,
        description: newEvent.description,
        dayConfig: newEvent.dayConfig as Record<string, any>
      });
      if (result.success) {
        addToast(t('eventCreatedSuccess'), 'success');
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
        addToast(result.error || t('eventCreatedFailed'), 'error');
      }
    }
  };

  // 更新場次狀態
  const handleUpdateEventStatus = async (eventDate: string, status: 'open' | 'closed' | 'disabled') => {
    const success = await EventService.updateEventStatus(eventDate, status);
    if (success) {
      addToast(t('eventStatusUpdated'), 'success');
      loadEvents();
    } else {
      addToast(t('eventStatusUpdateFailed'), 'error');
    }
  };

  // 刪除場次
  const handleDeleteEvent = async (eventDate: string) => {
    if (!confirm(t('deleteEventConfirm'))) return;
    
    const success = await EventService.deleteEvent(eventDate);
    if (success) {
      addToast(t('eventDeletedSuccess'), 'success');
      loadEvents();
    } else {
      addToast(t('eventDeletedFailed'), 'error');
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
    
    // 如果該時段沒有勾選，則不顯示
    if (!slot?.checked) return false;
    
    // 根據類型進行細分篩選，但如果沒有任何數據也仍然顯示（因為他們報名了該時段）
    if (submissionType === 'research') {
      // 研究增益：科技加速 + 通用加速 + 火晶微粒
      // 即使沒有填寫數據，只要報名了該時段也要顯示
      return true;
    } else if (submissionType === 'training') {
      // 訓練士兵增益：火晶餘燼 + 通用加速
      // 即使沒有填寫數據，只要報名了該時段也要顯示
      return true;
    } else if (submissionType === 'building') {
      // 建築增益：火晶 + 精煉火晶 + 通用加速
      // 即使沒有填寫數據，只要報名了該時段也要顯示
      return true;
    }
    return false;
  };

  // 取得當前用戶可管理的聯盟列表（null 表示可管理所有聯盟）
  const userManagedAlliances = currentUser?.managedAlliances;
  
  // Filter submissions based on search, alliance filter, selected event, and managed alliances
  const filteredSubmissions = submissions.filter(submission => {
    const matchSearch = 
      submission.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.gameId.includes(searchTerm) ||
      submission.fid.includes(searchTerm);
    
    const matchAlliance = !filterAlliance || submission.alliance === filterAlliance;
    
    // 報名管理表格：僅在有明確選擇場次時才進行場次篩選；否則顯示所有場次的報名
    // 對於 eventDate 為 null 的舊資料（遷移資料），檢查提交時間是否在該場次報名開始之後
    let matchEvent = !selectedEventForManagement;
    if (selectedEventForManagement) {
      if (submission.eventDate) {
        // 新資料：eventDate 必須匹配
        matchEvent = submission.eventDate === selectedEventForManagement.eventDate;
      } else {
        // 舊資料（eventDate 為 null）：檢查提交時間
        // 如果提交時間在該場次報名開始之後，認為屬於此場次
        const registrationStartTime = new Date(selectedEventForManagement.registrationStart).getTime();
        const submittedTime = submission.submittedAt;
        matchEvent = submittedTime >= registrationStartTime;
      }
    }
    
    // 根據管理員權限過濾：如果 managedAlliances 為 null/undefined 表示可管理所有；否則只能看到指定聯盟
    const matchManagedAlliances = !userManagedAlliances || userManagedAlliances.length === 0 || userManagedAlliances.includes(submission.alliance);
    
    const includeThis = matchSearch && matchAlliance && matchEvent && matchManagedAlliances;
    return includeThis;
  });

  // Filter users based on search and managed alliances
  const filteredUsers = users.filter(user => {
    const matchSearch = 
      (user.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (user.gameId?.includes(searchTerm) ?? false) ||
      (user.allianceName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    // 根據管理員權限過濾：如果 managedAlliances 為 null/undefined 表示可管理所有；否則只能看到指定聯盟的用戶
    const matchManagedAlliances = !userManagedAlliances || userManagedAlliances.length === 0 || 
      (user.allianceName && userManagedAlliances.includes(user.allianceName));
    
    return matchSearch && matchManagedAlliances;
  });

  // Get unique alliances for filter
  const alliances = Array.from(new Set(submissions.map(s => s.alliance).filter(Boolean)));

  const handleDeleteSubmission = async (submissionId: string) => {
    if (confirm(t('confirmDeleteSubmission_long'))) {
      await FormService.deleteSubmission(submissionId);
      const allSubmissions = await DebugService.getAllSubmissions();
      setSubmissions(allSubmissions);
      addToast(t('submissionDeleted'), 'success');
    }
  };

  // 開啟編輯報名資料彈窗
  const openEditSubmissionModal = (submission: FormSubmission) => {
    setSubmissionToEdit(submission);
    setEditPlayerName(submission.playerName);
    setEditAlliance(submission.alliance);
    // 深拷貝並確保每個 slot 都有 timeSlots
    const slotsCopy = JSON.parse(JSON.stringify(submission.slots));
    ['tuesday', 'thursday', 'friday'].forEach(day => {
      if (slotsCopy[day] && slotsCopy[day].checked) {
        if (!slotsCopy[day].timeSlots || slotsCopy[day].timeSlots.length === 0) {
          slotsCopy[day].timeSlots = [{ start: '', end: '' }];
        }
      }
    });
    setEditSlots(slotsCopy);
    setShowEditSubmissionModal(true);
  };

  // 處理編輯報名資料
  const handleEditSubmission = async () => {
    if (!submissionToEdit) return;
    
    setEditingSubmission(true);
    try {
      await FormService.adminUpdateSubmission(submissionToEdit.id, {
        playerName: editPlayerName,
        alliance: editAlliance,
        slots: editSlots,
      });
      
      // 重新載入報名資料
      const allSubmissions = await DebugService.getAllSubmissions();
      setSubmissions(allSubmissions);
      
      addToast(t('submissionEditSuccess'), 'success');
      setShowEditSubmissionModal(false);
      setSubmissionToEdit(null);
    } catch (error) {
      console.error('Error editing submission:', error);
      addToast(t('submissionEditFailed'), 'error');
    } finally {
      setEditingSubmission(false);
    }
  };

  // 快速新增玩家 - 查詢玩家資料
  // 驗證自訂聯盟名稱
  const validateAllianceName = (name: string): string => {
    const trimmed = name.trim().toUpperCase();
    // 檢查長度
    if (trimmed.length !== 3) {
      return t('allianceNameMust3Chars');
    }
    // 檢查只能是英文大小寫和數字
    if (!/^[A-Z0-9]{3}$/.test(trimmed)) {
      return t('onlyEnglishNumbers');
    }
    return '';
  };

  const handleQuickAddSearch = async () => {
    if (!quickAddPlayerId.trim()) {
      addToast(t('playerIdRequired'), 'error');
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
      addToast(error.message || t('playerQueryFailed'), 'error');
      setQuickAddPlayerData(null);
      setQuickAddIsExistingUser(false);
    } finally {
      setQuickAddLoading(false);
    }
  };

  // 快速新增玩家 - 確認新增
  const handleQuickAddConfirm = async () => {
    if (!quickAddPlayerData || quickAddSlotIndex === null) {
      addToast(t('playerDataRequired'), 'error');
      return;
    }
    
    // 已是會員時不需要選擇聯盟（使用原有的聯盟）
    if (!quickAddIsExistingUser) {
      // 非會員需要選擇聯盟
      if (!quickAddAlliance) {
        addToast(t('allianceSelectionRequired'), 'error');
        return;
      }
      
      // 如果是自訂聯盟，驗證格式
      if (quickAddAlliance === 'custom') {
        if (!quickAddCustomAlliance.trim()) {
          addToast(t('customAllianceInputRequired'), 'error');
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
          throw new Error(t('userRegistrationFailed'));
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
          throw new Error(t('userNotFound'));
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
            slots: autoSlots,
            eventDate: selectedEventForManagement?.eventDate
          });
          addToast(`已自動提交 ${quickAddPlayerData.nickname} 的報名表單`, 'success');
          
          // 重新載入提交資料
          const allSubmissions = await DebugService.getAllSubmissions();
          setSubmissions(allSubmissions);
        } catch (submitError: any) {
          // 如果已經報名過，不視為錯誤
          if (submitError.message?.includes(t('submissionExists'))) {
            addToast(`${quickAddPlayerData.nickname} 該日已有報名紀錄`, 'info');
          } else {
            console.error(t('autoSubmitFormFailed'), submitError);
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
      addToast(error.message || t('submissionAddFailed'), 'error');
    } finally {
      setQuickAddLoading(false);
    }
  };

  const exportToCSV = () => {
    // Build CSV data from submissions
    const headers = [t('gameId'), t('player'), t('gameId'), t('nickname'), t('alliance'), t('tuesday'), t('thursday'), t('friday'), t('registrationTime')];
    const rows = filteredSubmissions.map(s => [
      s.id,
      s.fid,
      s.gameId,
      s.playerName,
      s.alliance,
      s.slots.tuesday?.checked ? `${s.slots.tuesday.timeSlots.map(t => `${normalizeTimeString(t.start)}-${normalizeTimeString(t.end)}`).join(', ')}` : '-',
      s.slots.thursday?.checked ? `${s.slots.thursday.timeSlots.map(t => `${normalizeTimeString(t.start)}-${normalizeTimeString(t.end)}`).join(', ')}` : '-',
      s.slots.friday?.checked ? `${s.slots.friday.timeSlots.map(t => `${normalizeTimeString(t.start)}-${normalizeTimeString(t.end)}`).join(', ')}` : '-',
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

    addToast(t('exportSubmission'), 'success');
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
            <h1 className="text-2xl font-bold text-white">WOS Manager - {t('adminDashboard')}</h1>
          </div>
          <div className="flex items-center gap-3">
            {onBackToPlayer && (
              <button
                onClick={onBackToPlayer}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                <ArrowLeft size={18} />
                {t('backToPlayerInterface')}
              </button>
            )}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              <LogOut size={18} />
              {t('logout')}
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
          {/* 官職管理 - 需要 canAssignOfficers 權限 */}
          {currentUser?.canAssignOfficers === true && (
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
          )}
          {/* 場次設定 - 需要 canManageEvents 權限 */}
          {currentUser?.canManageEvents === true && (
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
          )}
          {/* 地圖管理 */}
          <button
            onClick={() => setActiveTab('map')}
            className={`px-6 py-3 font-semibold border-b-2 transition ${
              activeTab === 'map'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            <Map className="w-4 h-4 inline mr-1" />
            地圖管理
          </button>
        </div>

        {/* Content Sections */}
        {activeTab === 'events' && currentUser?.canManageEvents === true && (
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
                                
                                if (!dayConfig) return t('none');
                                
                                const dayNames: Record<string, string> = {
                                  monday: t('monday'), tuesday: t('tuesday'), wednesday: t('wednesday'),
                                  thursday: t('thursday'), friday: t('friday'), saturday: t('saturday'), sunday: t('sunday')
                                };
                                const configs: string[] = [];
                                Object.entries(dayConfig).forEach(([day, type]) => {
                                  if (type !== 'none' && type) {
                                    const activityName = ACTIVITY_TYPES[type as ActivityType]?.name.split('增益')[0].trim() || type;
                                    configs.push(`${dayNames[day]}-${activityName}`);
                                  }
                                });
                                return configs.length > 0 ? configs.join(' ') : t('none');
                              } catch (e) {
                                return t('none');
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
                            title={t('editEventTitle')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.eventDate)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded"
                            title={t('deleteEventTitle')}
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
                      {editingEvent ? t('editEventTitle') : '新增場次'}
                    </h3>
                    <button
                      onClick={() => {
                        setShowEventModal(false);
                        setEditingEvent(null);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition"
                      title={t('close_button')}
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
                          placeholder={t('exampleEventTitle')}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">報名開始時間 * (UTC 時區)</label>
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
                        <label className="block text-sm text-slate-400 mb-1">報名結束時間 * (UTC 時區)</label>
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
                          placeholder={t('eventDescription')}
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
                              monday: t('monday'), tuesday: t('tuesday'), wednesday: t('wednesday'),
                              thursday: t('thursday'), friday: t('friday'), saturday: t('saturday'), sunday: t('sunday')
                            };
                            
                            // 檢查新增的活動類型是否已在其他天設定
                            const handleActivityChange = (selectedValue: string) => {
                              const newActivityType = selectedValue as ActivityType;
                              
                              // 檢查是否選了「無」
                              if (newActivityType === ('none' as ActivityType)) {
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
                                const dayName = { monday: t('monday'), tuesday: t('tuesday'), wednesday: t('wednesday'), thursday: t('thursday'), friday: t('friday'), saturday: t('saturday'), sunday: t('sunday') }[oldDay];
                                addToast(`⚠️ 已自動清除${dayName}的設定，因為每種增益只能設在一天`, 'info');
                                
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
                      {editingEvent ? t('updateSubmission') : '創建'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Officers Tab */}
        {activeTab === 'officers' && currentUser?.canAssignOfficers === true && (
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
                  title={t('assignPlayersAccel')}
                >
                  ⚡ 依加速排定
                </button>
                {officerType === 'research' && (
                  <button
                    onClick={() => handleAutoAssign('fireSparkle')}
                    disabled={isLoadingOfficers}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-slate-600 text-white rounded-lg transition font-semibold text-sm"
                    title={t('assignPlayersFireSparkle')}
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
                      title={t('assignPlayersFireGem')}
                    >
                      💎 依火晶排定
                    </button>
                    <button
                      onClick={() => handleAutoAssign('refinedFireGem')}
                      disabled={isLoadingOfficers}
                      className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:bg-slate-600 text-white rounded-lg transition font-semibold text-sm"
                      title={t('assignPlayersRefinedFireGem')}
                    >
                      💠 依精煉火晶排定
                    </button>
                  </>
                )}
                <button
                  onClick={handleClearAllAssignments}
                  disabled={isLoadingOfficers}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 text-white rounded-lg transition font-semibold text-sm"
                  title={t('clearAllSlotAssignments')}
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
                {isLoadingOfficers ? t('loading_short') : t('saveConfiguration')}
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
                    placeholder={t('searchIdOrName')}
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
                            title={t('scrollToAssignedSlot')}
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
                              title={t('quickAddPlayer_title')}
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
                placeholder={t('searchMemberPlaceholder')}
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
                        {user.isAdmin ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-green-400 font-bold">✔</span>
                            {user.managedAlliances === null || user.managedAlliances === undefined ? (
                              <span className="text-xs text-slate-400">全部聯盟</span>
                            ) : user.managedAlliances.length > 0 ? (
                              <span className="text-xs text-cyan-400">{user.managedAlliances.join(', ')}</span>
                            ) : (
                              <span className="text-xs text-red-400">無權限</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* 只有超級管理員才能設定管理員權限 */}
                          {currentUser?.gameId === SUPER_ADMIN_ID && user.gameId !== 'admin' && user.gameId !== SUPER_ADMIN_ID && (
                            user.isAdmin ? (
                              <>
                                <button
                                  onClick={() => {
                                    setUserToSetAdmin(user);
                                    setManageAllAlliances(user.managedAlliances === null || user.managedAlliances === undefined);
                                    setSelectedManagedAlliances(user.managedAlliances || []);
                                    setCanAssignOfficers(user.canAssignOfficers !== false);
                                    setCanManageEvents(user.canManageEvents !== false);
                                    setShowAdminSettingsModal(true);
                                  }}
                                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs"
                                  title="設定管理權限"
                                >
                                  ⚙️ 權限
                                </button>
                                <button
                                  onClick={async () => {
                                    await AuthService.setAdmin(user.gameId, false);
                                    addToast(t('removeAdminRole'), 'info');
                                    setUsers(users => users.map(u => u.gameId === user.gameId ? { ...u, isAdmin: false, managedAlliances: null } : u));
                                  }}
                                  className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded text-xs"
                                >
                                  取消管理員
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setUserToSetAdmin(user);
                                  setManageAllAlliances(true);
                                  setSelectedManagedAlliances([]);
                                  setCanAssignOfficers(true);
                                  setCanManageEvents(true);
                                  setShowAdminSettingsModal(true);
                                }}
                                className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs"
                              >
                                設為管理員
                              </button>
                            )
                          )}
                          {/* 刪除用戶按鈕 - 管理員可用，不能刪除超級管理員和自己 */}
                          {user.gameId !== 'admin' && user.gameId !== SUPER_ADMIN_ID && user.gameId !== currentUser?.gameId && (
                            <>
                              <button
                                onClick={() => {
                                  setUserToResetPassword(user);
                                  setNewPassword('');
                                  setShowResetPasswordModal(true);
                                }}
                                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs"
                                title={t('resetPassword')}
                              >
                                🔑
                              </button>
                              <button
                                onClick={() => {
                                  setUserToDelete(user);
                                  setShowDeleteUserModal(true);
                                }}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                                title={t('deleteUserTitle')}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
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
                          // 計算該場次的報名人數（包括舊資料 eventDate 為 null）
                          const eventSubmissions = submissions.filter(s => s.eventDate === null || s.eventDate === event.eventDate);
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
                                  {event.status === 'open' ? t('open') : event.status === 'closed' ? t('closed') : t('close_button')}
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
                placeholder={t('searchMemberPlaceholder')}
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
                            const slot = submission.slots?.tuesday;
                            const formatAccel = (accel?: { days: number; hours: number; minutes: number }) => {
                              if (!accel) return '-';
                              const parts = [];
                              if (accel.days > 0) parts.push(`${accel.days}天`);
                              if (accel.hours > 0) parts.push(`${accel.hours}時`);
                              if (accel.minutes > 0) parts.push(`${accel.minutes}分`);
                              return parts.length > 0 ? parts.join('') : '-';
                            };
                            return (
                              <>
                                <td className="px-6 py-3 text-white font-semibold text-xs">
                                  {formatAccel(slot?.researchAccel)}
                                </td>
                                <td className="px-6 py-3 text-white font-semibold text-xs">
                                  {formatAccel(slot?.generalAccel)}
                                </td>
                                <td className="px-6 py-3 text-white font-semibold text-xs">
                                  {slot?.upgradeT11 && slot.fireSparkleCount ? slot.fireSparkleCount : '-'}
                                </td>
                              </>
                            );
                          })()}
                          {submissionType === 'training' && (() => {
                            const slot = submission.slots?.thursday;
                            const formatAccel = (accel?: { days: number; hours: number; minutes: number }) => {
                              if (!accel) return '-';
                              const parts = [];
                              if (accel.days > 0) parts.push(`${accel.days}天`);
                              if (accel.hours > 0) parts.push(`${accel.hours}時`);
                              if (accel.minutes > 0) parts.push(`${accel.minutes}分`);
                              return parts.length > 0 ? parts.join('') : '-';
                            };
                            return (
                              <>
                                <td className="px-6 py-3 text-white font-semibold text-xs">
                                  {formatAccel(slot?.researchAccel)}
                                </td>
                                <td className="px-6 py-3 text-white font-semibold text-xs">
                                  {formatAccel(slot?.generalAccel)}
                                </td>
                              </>
                            );
                          })()}
                          {submissionType === 'building' && (() => {
                            const slot = submission.slots?.friday;
                            const formatAccel = (accel?: { days: number; hours: number; minutes: number }) => {
                              if (!accel) return '-';
                              const parts = [];
                              if (accel.days > 0) parts.push(`${accel.days}天`);
                              if (accel.hours > 0) parts.push(`${accel.hours}時`);
                              if (accel.minutes > 0) parts.push(`${accel.minutes}分`);
                              return parts.length > 0 ? parts.join('') : '-';
                            };
                            return (
                              <>
                                <td className="px-6 py-3 text-white font-semibold text-xs">
                                  {slot?.fireGemCount ? slot.fireGemCount : '-'}
                                </td>
                                <td className="px-6 py-3 text-white font-semibold text-xs">
                                  {slot?.refinedFireGemCount ? slot.refinedFireGemCount : '-'}
                                </td>
                                <td className="px-6 py-3 text-white font-semibold text-xs">
                                  {formatAccel(slot?.generalAccel)}
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
                                  const labels = ['🥇 ' + t('preferenceLevel').split('|')[0], '🥈 ' + t('preferenceLevel').split('|')[1], '🥉 ' + t('preferenceLevel').split('|')[2]];
                                  const colors = ['text-green-300', 'text-blue-300', 'text-purple-300'];
                                  return (
                                    <div key={idx} className={colors[idx] || 'text-slate-300'}>
                                      {labels[idx] || `第${idx + 1}志願`}: {formatTimeRangeWithTaiwan(ts.start, ts.end)}
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
                              onClick={() => openEditSubmissionModal(submission)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-amber-900/30 hover:bg-amber-900/50 text-amber-300 rounded transition text-xs"
                            >
                              <Edit size={14} />
                              {t('edit')}
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
                      tuesday: '🔬 ' + t('researchAccel'),
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
                                {labels[idx] || `第${idx + 1}志願`}: {formatTimeRangeWithTaiwan(ts.start, ts.end)}
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
                              <p>士兵訓練加速: {slot.researchAccel?.days || 0}天 {slot.researchAccel?.hours || 0}小時 {slot.researchAccel?.minutes || 0}分</p>
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

      {/* 地圖管理 */}
      {activeTab === 'map' && (
        <div className="space-y-6">
          {!showMapEditor ? (
            <>
              {/* 新增地圖 */}
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <h3 className="text-lg font-semibold text-white mb-4">新增地圖</h3>
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={newMapTitle}
                    onChange={(e) => setNewMapTitle(e.target.value)}
                    placeholder="輸入地圖標題..."
                    className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateMap()}
                  />
                  <button
                    onClick={handleCreateMap}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:opacity-90 transition flex items-center gap-2"
                  >
                    <Plus size={18} /> 新增地圖
                  </button>
                </div>
              </div>

              {/* 地圖列表 */}
              <div className="space-y-4">
                {/* 操作欄位 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const mapList = mapList.map(m => `◆ ${m.title} (建立時間: ${new Date(m.createdAt).toLocaleDateString('zh-TW')})`).join('\n');
                      navigator.clipboard.writeText(mapList).then(() => {
                        alert('地圖列表已複製');
                      }).catch(() => {
                        alert('複製失敗');
                      });
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition text-sm font-semibold"
                  >
                    複製地圖列表
                  </button>
                </div>

                {/* 地圖列表表格 */}
                <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">標題</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">建立日期</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">狀態</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">操作</th>
                      </tr>
                  </thead>
                  <tbody>
                    {mapList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                          尚未創建任何地圖
                        </td>
                      </tr>
                    ) : (
                      mapList.map(map => (
                        <tr key={map.id} className="border-b border-slate-700 hover:bg-slate-900/50 transition">
                          <td className="px-6 py-4 text-white font-semibold">{map.title}</td>
                          <td className="px-6 py-4 text-slate-300">
                            {new Date(map.createdAt).toLocaleDateString('zh-TW', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleUpdateMapStatus(map.id, map.status === 'open' ? 'closed' : 'open')}
                              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                                map.status === 'open'
                                  ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                                  : 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                              }`}
                            >
                              {map.status === 'open' ? '✓ 開放' : '✕ 截止'}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEditMap(map.id)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition flex items-center gap-1"
                              >
                                <Edit size={14} /> 編輯
                              </button>
                              <button
                                onClick={() => handleDeleteMap(map.id)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold transition flex items-center gap-1"
                              >
                                <Trash2 size={14} /> 刪除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 返回按鈕 */}
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={() => {
                    setShowMapEditor(false);
                    setEditingMapId(null);
                    setMapData(null);
                    loadMapList();
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition flex items-center gap-2"
                >
                  <ArrowLeft size={18} /> 返回列表
                </button>
              </div>
              
              {/* 地圖編輯器 */}
              <AllianceMapEditor
                initialData={mapData}
                title={mapList.find(m => m.id === editingMapId)?.title}
                onTitleChange={handleUpdateMapTitle}
                onDuplicate={handleDuplicateMap}
                players={users.map(u => ({
                  gameId: u.gameId,
                  nickname: u.nickname || undefined,
                  allianceName: u.allianceName || undefined,
                }))}
                onSave={async (data) => {
                  await handleSaveMap(data);
                  setMapData(data);
                }}
              />
            </>
          )}
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
                    placeholder={t('gameIdPlaceholder')}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
                  />
                  <button
                    onClick={handleQuickAddSearch}
                    disabled={quickAddLoading}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-600 text-white rounded transition flex items-center gap-1"
                  >
                    <Search size={16} />
                    {quickAddLoading ? t('searching') : '查詢'}
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
                    <label className="block text-slate-300 text-sm mb-2">{t('allianceLabel_form')} <span className="text-red-400">*</span></label>
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
                      <label className="block text-slate-300 text-sm mb-2">{t('customAllianceLabel')} <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        value={quickAddCustomAlliance}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase().slice(0, 3);
                          setQuickAddCustomAlliance(value);
                        }}
                        placeholder={t('enter3CharAlphanum_admin')}
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
                {quickAddLoading ? t('processing') : t('confirmAddPlayerButton')}
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
                  <p className="text-white font-semibold">{userToDelete.nickname || t('nicknameFallback')}</p>
                  <p className="text-slate-400 text-sm font-mono">ID: {userToDelete.gameId}</p>
                  <p className="text-slate-400 text-sm">{t('alliance')}: {userToDelete.allianceName || '-'}</p>
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
                {deletingUser ? t('deleting') : t('confirmDeleteButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 重設密碼 Modal */}
      {showResetPasswordModal && userToResetPassword && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">🔑 {t('resetPasswordTitle')}</h3>
            <div className="bg-slate-900 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                {userToResetPassword.avatarImage && (
                  <img
                    src={userToResetPassword.avatarImage}
                    alt="Avatar"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="text-white font-semibold">{userToResetPassword.nickname || t('nicknameFallback')}</p>
                  <p className="text-slate-400 text-sm font-mono">ID: {userToResetPassword.gameId}</p>
                  <p className="text-slate-400 text-sm">{t('alliance')}: {userToResetPassword.allianceName || '-'}</p>
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-slate-300 text-sm mb-2">{t('newPassword')}</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('passwordMinLength')}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setUserToResetPassword(null);
                  setNewPassword('');
                }}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
                disabled={resettingPassword}
              >
                {t('cancelButton')}
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resettingPassword || newPassword.length < 6}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                🔑
                {resettingPassword ? t('processing') : t('confirmResetPassword')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 管理員權限設定 Modal */}
      {showAdminSettingsModal && userToSetAdmin && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4">⚙️ 管理員權限設定</h3>
            <div className="bg-slate-900 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                {userToSetAdmin.avatarImage && (
                  <img
                    src={userToSetAdmin.avatarImage}
                    alt="Avatar"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="text-white font-semibold">{userToSetAdmin.nickname || t('nicknameFallback')}</p>
                  <p className="text-slate-400 text-sm font-mono">ID: {userToSetAdmin.gameId}</p>
                  <p className="text-slate-400 text-sm">{t('alliance')}: {userToSetAdmin.allianceName || '-'}</p>
                </div>
              </div>
            </div>
            
            {/* 權限範圍選擇 */}
            <div className="mb-4">
              <label className="block text-slate-300 text-sm mb-3">管理範圍</label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="allianceScope"
                    checked={manageAllAlliances}
                    onChange={() => {
                      setManageAllAlliances(true);
                      setSelectedManagedAlliances([]);
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-white">可管理所有聯盟</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="allianceScope"
                    checked={!manageAllAlliances}
                    onChange={() => setManageAllAlliances(false)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-white">僅管理指定聯盟</span>
                </label>
              </div>
            </div>

            {/* 聯盟多選 */}
            {!manageAllAlliances && (
              <div className="mb-4">
                <label className="block text-slate-300 text-sm mb-2">選擇可管理的聯盟</label>
                <div className="bg-slate-900 rounded-lg p-3 grid grid-cols-3 gap-2">
                  {ALLIANCE_OPTIONS.map(alliance => (
                    <label key={alliance} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedManagedAlliances.includes(alliance)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedManagedAlliances([...selectedManagedAlliances, alliance]);
                          } else {
                            setSelectedManagedAlliances(selectedManagedAlliances.filter(a => a !== alliance));
                          }
                        }}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span className="text-white text-sm font-semibold">{alliance}</span>
                    </label>
                  ))}
                </div>
                {selectedManagedAlliances.length === 0 && (
                  <p className="text-amber-400 text-xs mt-2">⚠️ 請至少選擇一個聯盟</p>
                )}
              </div>
            )}

            {/* 功能權限設定 */}
            <div className="mb-4">
              <label className="block text-slate-300 text-sm mb-3">功能權限</label>
              <div className="space-y-3 bg-slate-900 rounded-lg p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canAssignOfficers}
                    onChange={(e) => setCanAssignOfficers(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-white">可分配官職</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canManageEvents}
                    onChange={(e) => setCanManageEvents(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span className="text-white">可設定場次</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAdminSettingsModal(false);
                  setUserToSetAdmin(null);
                }}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
              >
                {t('cancelButton')}
              </button>
              <button
                onClick={async () => {
                  const managedAlliances = manageAllAlliances ? null : selectedManagedAlliances;
                  if (!manageAllAlliances && selectedManagedAlliances.length === 0) {
                    addToast('請至少選擇一個聯盟', 'error');
                    return;
                  }
                  await AuthService.setAdmin(userToSetAdmin.gameId, true, managedAlliances, canAssignOfficers, canManageEvents);
                  addToast(userToSetAdmin.isAdmin ? '管理員權限已更新' : t('setAsAdminRole'), 'success');
                  setUsers(users => users.map(u => 
                    u.gameId === userToSetAdmin.gameId 
                      ? { ...u, isAdmin: true, managedAlliances, canAssignOfficers, canManageEvents } 
                      : u
                  ));
                  setShowAdminSettingsModal(false);
                  setUserToSetAdmin(null);
                }}
                disabled={!manageAllAlliances && selectedManagedAlliances.length === 0}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                ✓ {userToSetAdmin.isAdmin ? '更新權限' : '確認設為管理員'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 編輯報名資料 Modal */}
      {showEditSubmissionModal && submissionToEdit && editSlots && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl border border-slate-700 my-4">
            <h3 className="text-xl font-bold text-white mb-4">✏️ {t('editSubmissionTitle')}</h3>
            
            {/* 基本資料 */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm mb-2">{t('gameId')}</label>
                  <input
                    type="text"
                    value={submissionToEdit.gameId}
                    disabled
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-2">{t('playerNameLabel')}</label>
                  <input
                    type="text"
                    value={editPlayerName}
                    onChange={(e) => setEditPlayerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 text-sm mb-2">{t('allianceLabel')}</label>
                <input
                  type="text"
                  value={editAlliance}
                  onChange={(e) => setEditAlliance(e.target.value.toUpperCase())}
                  maxLength={3}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* 報名時段資料 */}
            <div className="border-t border-slate-700 pt-4">
              <h4 className="text-white font-semibold mb-4">報名時段資料</h4>
              
              {/* 研究增益 (Tuesday) */}
              {editSlots.tuesday?.checked && (
                <div className="bg-slate-700/50 rounded-lg p-4 mb-4 border border-slate-600">
                  <p className="text-cyan-400 font-semibold mb-3">🧬 研究增益報名</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">研究加速 (天/時/分)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          value={editSlots.tuesday?.researchAccel?.days || 0}
                          onChange={(e) => setEditSlots({...editSlots, tuesday: {...editSlots.tuesday, researchAccel: {...editSlots.tuesday?.researchAccel, days: parseInt(e.target.value) || 0}}})}
                          className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={editSlots.tuesday?.researchAccel?.hours || 0}
                          onChange={(e) => setEditSlots({...editSlots, tuesday: {...editSlots.tuesday, researchAccel: {...editSlots.tuesday?.researchAccel, hours: parseInt(e.target.value) || 0}}})}
                          className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={editSlots.tuesday?.researchAccel?.minutes || 0}
                          onChange={(e) => setEditSlots({...editSlots, tuesday: {...editSlots.tuesday, researchAccel: {...editSlots.tuesday?.researchAccel, minutes: parseInt(e.target.value) || 0}}})}
                          className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">通用加速 (天/時/分)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          value={editSlots.tuesday?.generalAccel?.days || 0}
                          onChange={(e) => setEditSlots({...editSlots, tuesday: {...editSlots.tuesday, generalAccel: {...editSlots.tuesday?.generalAccel, days: parseInt(e.target.value) || 0}}})}
                          className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={editSlots.tuesday?.generalAccel?.hours || 0}
                          onChange={(e) => setEditSlots({...editSlots, tuesday: {...editSlots.tuesday, generalAccel: {...editSlots.tuesday?.generalAccel, hours: parseInt(e.target.value) || 0}}})}
                          className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={editSlots.tuesday?.generalAccel?.minutes || 0}
                          onChange={(e) => setEditSlots({...editSlots, tuesday: {...editSlots.tuesday, generalAccel: {...editSlots.tuesday?.generalAccel, minutes: parseInt(e.target.value) || 0}}})}
                          className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">火晶餘燼數量</label>
                      <input
                        type="number"
                        min="0"
                        value={editSlots.tuesday?.fireSparkleCount || 0}
                        onChange={(e) => setEditSlots({...editSlots, tuesday: {...editSlots.tuesday, fireSparkleCount: parseInt(e.target.value) || 0}})}
                        className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* 時段選擇 - 研究 */}
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <label className="block text-slate-400 text-xs mb-2">{t('acceptableTimeslots') || '可接受的時段'}</label>
                    <div className="space-y-2">
                      {(editSlots.tuesday?.timeSlots || [{ start: '', end: '' }]).map((ts: any, index: number) => (
                        <div key={index} className="flex gap-2 items-center">
                          <select
                            value={ts.start ? parseInt(ts.start.split(':')[0]) : ''}
                            onChange={(e) => handleEditTimeSlotChange('tuesday', index, 'start', parseInt(e.target.value))}
                            className="flex-1 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-xs"
                          >
                            <option value="">{t('startTimeLabel') || '開始時間'}</option>
                            {timeOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <span className="text-slate-400 text-xs">～</span>
                          <select
                            value={ts.end ? parseInt(ts.end.split(':')[0]) : ''}
                            onChange={(e) => handleEditTimeSlotChange('tuesday', index, 'end', parseInt(e.target.value))}
                            className="flex-1 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-xs"
                          >
                            <option value="">{t('endTimeLabel') || '結束時間'}</option>
                            {timeOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          {(editSlots.tuesday?.timeSlots?.length || 0) > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEditTimeSlot('tuesday', index)}
                              className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-red-400 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {(editSlots.tuesday?.timeSlots?.length || 0) < 3 && (
                      <button
                        type="button"
                        onClick={() => addEditTimeSlot('tuesday')}
                        className="mt-2 px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded flex items-center gap-1 transition"
                      >
                        <Plus size={12} />
                        {t('addTimeSlot') || '添加時段'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 訓練增益 (Thursday) */}
              {editSlots.thursday?.checked && (
                <div className="bg-slate-700/50 rounded-lg p-4 mb-4 border border-slate-600">
                  <p className="text-orange-400 font-semibold mb-3">⚔️ 訓練士兵增益報名</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">訓練加速 (天/時/分)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          value={editSlots.thursday?.researchAccel?.days || 0}
                          onChange={(e) => setEditSlots({...editSlots, thursday: {...editSlots.thursday, researchAccel: {...editSlots.thursday?.researchAccel, days: parseInt(e.target.value) || 0}}})}
                          className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={editSlots.thursday?.researchAccel?.hours || 0}
                          onChange={(e) => setEditSlots({...editSlots, thursday: {...editSlots.thursday, researchAccel: {...editSlots.thursday?.researchAccel, hours: parseInt(e.target.value) || 0}}})}
                          className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={editSlots.thursday?.researchAccel?.minutes || 0}
                          onChange={(e) => setEditSlots({...editSlots, thursday: {...editSlots.thursday, researchAccel: {...editSlots.thursday?.researchAccel, minutes: parseInt(e.target.value) || 0}}})}
                          className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">通用加速 (天/時/分)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          value={editSlots.thursday?.generalAccel?.days || 0}
                          onChange={(e) => setEditSlots({...editSlots, thursday: {...editSlots.thursday, generalAccel: {...editSlots.thursday?.generalAccel, days: parseInt(e.target.value) || 0}}})}
                          className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={editSlots.thursday?.generalAccel?.hours || 0}
                          onChange={(e) => setEditSlots({...editSlots, thursday: {...editSlots.thursday, generalAccel: {...editSlots.thursday?.generalAccel, hours: parseInt(e.target.value) || 0}}})}
                          className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={editSlots.thursday?.generalAccel?.minutes || 0}
                          onChange={(e) => setEditSlots({...editSlots, thursday: {...editSlots.thursday, generalAccel: {...editSlots.thursday?.generalAccel, minutes: parseInt(e.target.value) || 0}}})}
                          className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* 時段選擇 - 訓練 */}
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <label className="block text-slate-400 text-xs mb-2">{t('acceptableTimeslots') || '可接受的時段'}</label>
                    <div className="space-y-2">
                      {(editSlots.thursday?.timeSlots || [{ start: '', end: '' }]).map((ts: any, index: number) => (
                        <div key={index} className="flex gap-2 items-center">
                          <select
                            value={ts.start ? parseInt(ts.start.split(':')[0]) : ''}
                            onChange={(e) => handleEditTimeSlotChange('thursday', index, 'start', parseInt(e.target.value))}
                            className="flex-1 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-xs"
                          >
                            <option value="">{t('startTimeLabel') || '開始時間'}</option>
                            {timeOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <span className="text-slate-400 text-xs">～</span>
                          <select
                            value={ts.end ? parseInt(ts.end.split(':')[0]) : ''}
                            onChange={(e) => handleEditTimeSlotChange('thursday', index, 'end', parseInt(e.target.value))}
                            className="flex-1 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-xs"
                          >
                            <option value="">{t('endTimeLabel') || '結束時間'}</option>
                            {timeOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          {(editSlots.thursday?.timeSlots?.length || 0) > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEditTimeSlot('thursday', index)}
                              className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-red-400 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {(editSlots.thursday?.timeSlots?.length || 0) < 3 && (
                      <button
                        type="button"
                        onClick={() => addEditTimeSlot('thursday')}
                        className="mt-2 px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded flex items-center gap-1 transition"
                      >
                        <Plus size={12} />
                        {t('addTimeSlot') || '添加時段'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 建築增益 (Friday) */}
              {editSlots.friday?.checked && (
                <div className="bg-slate-700/50 rounded-lg p-4 mb-4 border border-slate-600">
                  <p className="text-amber-400 font-semibold mb-3">🏗️ 建築增益報名</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">火晶數量</label>
                      <input
                        type="number"
                        min="0"
                        value={editSlots.friday?.fireGemCount || 0}
                        onChange={(e) => setEditSlots({...editSlots, friday: {...editSlots.friday, fireGemCount: parseInt(e.target.value) || 0}})}
                        className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-xs mb-1">精煉火晶數量</label>
                      <input
                        type="number"
                        min="0"
                        value={editSlots.friday?.refinedFireGemCount || 0}
                        onChange={(e) => setEditSlots({...editSlots, friday: {...editSlots.friday, refinedFireGemCount: parseInt(e.target.value) || 0}})}
                        className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-slate-400 text-xs mb-1">建築加速 (天/時/分)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          value={editSlots.friday?.generalAccel?.days || 0}
                          onChange={(e) => setEditSlots({...editSlots, friday: {...editSlots.friday, generalAccel: {...editSlots.friday?.generalAccel, days: parseInt(e.target.value) || 0}}})}
                          className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={editSlots.friday?.generalAccel?.hours || 0}
                          onChange={(e) => setEditSlots({...editSlots, friday: {...editSlots.friday, generalAccel: {...editSlots.friday?.generalAccel, hours: parseInt(e.target.value) || 0}}})}
                          className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                        />
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={editSlots.friday?.generalAccel?.minutes || 0}
                          onChange={(e) => setEditSlots({...editSlots, friday: {...editSlots.friday, generalAccel: {...editSlots.friday?.generalAccel, minutes: parseInt(e.target.value) || 0}}})}
                          className="w-20 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* 時段選擇 - 建築 */}
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <label className="block text-slate-400 text-xs mb-2">{t('acceptableTimeslots') || '可接受的時段'}</label>
                    <div className="space-y-2">
                      {(editSlots.friday?.timeSlots || [{ start: '', end: '' }]).map((ts: any, index: number) => (
                        <div key={index} className="flex gap-2 items-center">
                          <select
                            value={ts.start ? parseInt(ts.start.split(':')[0]) : ''}
                            onChange={(e) => handleEditTimeSlotChange('friday', index, 'start', parseInt(e.target.value))}
                            className="flex-1 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-xs"
                          >
                            <option value="">{t('startTimeLabel') || '開始時間'}</option>
                            {timeOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <span className="text-slate-400 text-xs">～</span>
                          <select
                            value={ts.end ? parseInt(ts.end.split(':')[0]) : ''}
                            onChange={(e) => handleEditTimeSlotChange('friday', index, 'end', parseInt(e.target.value))}
                            className="flex-1 px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-xs"
                          >
                            <option value="">{t('endTimeLabel') || '結束時間'}</option>
                            {timeOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          {(editSlots.friday?.timeSlots?.length || 0) > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEditTimeSlot('friday', index)}
                              className="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-red-400 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {(editSlots.friday?.timeSlots?.length || 0) < 3 && (
                      <button
                        type="button"
                        onClick={() => addEditTimeSlot('friday')}
                        className="mt-2 px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded flex items-center gap-1 transition"
                      >
                        <Plus size={12} />
                        {t('addTimeSlot') || '添加時段'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 沒有任何勾選的時段 */}
              {!editSlots.tuesday?.checked && !editSlots.thursday?.checked && !editSlots.friday?.checked && (
                <p className="text-slate-500 text-center py-4">無報名時段資料</p>
              )}
            </div>

            {/* 按鈕 */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditSubmissionModal(false);
                  setSubmissionToEdit(null);
                  setEditSlots(null);
                }}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
                disabled={editingSubmission}
              >
                {t('cancelButton')}
              </button>
              <button
                onClick={handleEditSubmission}
                disabled={editingSubmission || !editPlayerName || !editAlliance}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                <Edit size={16} />
                {editingSubmission ? t('processing') : t('save')}
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
