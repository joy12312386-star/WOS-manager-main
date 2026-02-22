import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Player, User, FormSubmission, SlotSubmission, ActivityType, ACTIVITY_TYPES, DEFAULT_DAY_CONFIG } from '../../types';
import { AuthService, FormService, OfficerConfigService, EventService, Event, LinkedAccount, MapService } from '../services/auth';
import { fetchPlayer } from '../services/api';
import { useToast } from './ui/Toast';
import { useI18n } from '../i18n/I18nProvider';
import { AccountBindingModal } from './AccountBindingModal';
import { Check, AlertCircle, Download, Edit2, Trash2, CheckSquare2, Square, Plus, Trash, X, RefreshCw, Zap, MapPin, Users, UserPlus, ChevronDown, ChevronUp, Key, Share2, ArrowLeft, BarChart3 } from 'lucide-react';
import html2canvas from 'html2canvas';

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

// 堡壘等級轉換函數
const getFortiressLevel = (stoveLv: number): string => {
  if (stoveLv >= 1 && stoveLv <= 30) {
    return `LV ${stoveLv}`;
  } else if (stoveLv >= 31 && stoveLv <= 34) {
    return 'LV 30';
  } else if (stoveLv >= 35 && stoveLv <= 39) {
    return 'FC 1';
  } else if (stoveLv >= 40 && stoveLv <= 44) {
    return 'FC 2';
  } else if (stoveLv >= 45 && stoveLv <= 49) {
    return 'FC 3';
  } else if (stoveLv >= 50 && stoveLv <= 54) {
    return 'FC 4';
  } else if (stoveLv >= 55 && stoveLv <= 59) {
    return 'FC 5';
  } else if (stoveLv >= 60 && stoveLv <= 64) {
    return 'FC 6';
  } else if (stoveLv >= 65 && stoveLv <= 69) {
    return 'FC 7';
  } else if (stoveLv >= 70) {
    return 'FC 8';
  }
  return `LV ${stoveLv}`;
};

interface RegistrationFormProps {
  user: User;
  playerData: Player;
  onLogout: () => void;
  onSwitchToManager?: () => void;
}

const defaultSlot: SlotSubmission = {
  checked: false,
  researchAccel: { days: 0, hours: 0, minutes: 0 },
  generalAccel: { days: 0, hours: 0, minutes: 0 },
  upgradeT11: false,
  fireSparkleCount: undefined,
  fireGemCount: 0,
  refinedFireGemCount: 0,
  timeSlots: [{ start: '', end: '' }]
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

// 深複製 slot 物件
const cloneSlot = (slot?: SlotSubmission): SlotSubmission => {
  if (!slot) {
    return {
      checked: false,
      researchAccel: { days: 0, hours: 0, minutes: 0 },
      generalAccel: { days: 0, hours: 0, minutes: 0 },
      upgradeT11: false,
      fireSparkleCount: undefined,
      fireGemCount: 0,
      refinedFireGemCount: 0,
      timeSlots: [{ start: '', end: '' }]
    };
  }
  return {
    ...slot,
    researchAccel: slot.researchAccel ? { ...slot.researchAccel } : { days: 0, hours: 0, minutes: 0 },
    generalAccel: slot.generalAccel ? { ...slot.generalAccel } : { days: 0, hours: 0, minutes: 0 },
    timeSlots: slot.timeSlots?.map(ts => ({ ...ts })) || [{ start: '', end: '' }]
  };
};
const ALLIANCE_OPTIONS = ['TWD', 'NTD', 'QUO', 'TTU', 'ONE', 'DEU'];

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ user, playerData, onLogout, onSwitchToManager }) => {
  const { addToast } = useToast();
  const { t } = useI18n();

  // 生成時間選項 (UTC 00:00 - 翌日 00:00，對應台灣時間 08:00 - 翌日 08:00)
  const generateTimeOptions = () => {
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
        label: `UTC ${utcHourStr}:00 (${t('taiwanTimePrefix')} ${taiwanHourStr}:00) ${day}`
      });
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // 初始化 slots，包含所有星期
  const initializeSlots = () => {
    const slots: Record<string, SlotSubmission> = {};
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
      slots[day] = cloneSlot();
    });
    return slots;
  };
  
  const [formData, setFormData] = useState({
    gameId: playerData.fid,
    playerName: playerData.nickname,
    alliance: user.allianceName || '',
    slots: initializeSlots()
  });

  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<FormSubmission | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAllianceEdit, setShowAllianceEdit] = useState(false);
  const [tempAlliance, setTempAlliance] = useState(user.allianceName || '');
  const [editCustomAlliance, setEditCustomAlliance] = useState('');
  const [editShowCustomInput, setEditShowCustomInput] = useState(false);
  const [allianceList, setAllianceList] = useState(ALLIANCE_OPTIONS);
  const [allianceError, setAllianceError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // SVS 相關狀態
  const [isSVSMode, setIsSVSMode] = useState(false);
  const [isSVSMapMode, setIsSVSMapMode] = useState(false);
  const [svsFormExpanded, setSVSFormExpanded] = useState(false);
  const [showSVSMapAlloc, setShowSVSMapAlloc] = useState(false);
  const [showSVSImmigrant, setShowSVSImmigrant] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventDate, setSelectedEventDate] = useState<string | null>(null);
  const [showOfficerSchedule, setShowOfficerSchedule] = useState(false);
  const [officerScheduleEventDate, setOfficerScheduleEventDate] = useState<string>('');
  const [officerScheduleData, setOfficerScheduleData] = useState<any>(null);
  const [viewOnlyMode, setViewOnlyMode] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<any[]>([]);
  
  // SVS 地圖相關狀態
  const [openMaps, setOpenMaps] = useState<any[]>([]);
  const [selectedMap, setSelectedMap] = useState<any>(null);
  const [loadingMaps, setLoadingMaps] = useState(false);
  const mapViewRef = useRef<HTMLDivElement>(null);
  const [formDate, setFormDate] = useState<string>('');
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  
  // 每日活動類型配置
  const [dayConfig, setDayConfig] = useState<Record<string, ActivityType>>(DEFAULT_DAY_CONFIG);
  
  // 確認弹窗相關狀態
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState<any>(null);

  // 帳號管理相關狀態
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccountGameId, setNewAccountGameId] = useState('');
  const [addingAccount, setAddingAccount] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [showBindingModal, setShowBindingModal] = useState(false);

  // 變更密碼相關狀態
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadSubmissions();
    loadEvents();
    loadLinkedAccounts();
  }, [user.id]);

  // 添加鍵盤快捷鍵支持（Escape 鍵退出 SVS 模式）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('[Debug] 按下 Escape 鍵');
        if (isSVSMapMode) {
          setIsSVSMapMode(false);
          setSelectedMap(null);
        } else if (isSVSMode) {
          setIsSVSMode(false);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSVSMapMode, isSVSMode]);

  // 載入開放中的地圖列表
  const loadOpenMaps = useCallback(async () => {
    setLoadingMaps(true);
    try {
      const maps = await MapService.getAllMaps();
      // 只顯示開放中的地圖
      const openOnly = maps.filter((m: any) => m.status === 'open');
      setOpenMaps(openOnly);
    } catch (error) {
      console.error('載入地圖失敗:', error);
    } finally {
      setLoadingMaps(false);
    }
  }, []);

  // 載入單個地圖詳情
  const loadMapDetail = async (id: string) => {
    try {
      const map = await MapService.getMap(id);
      setSelectedMap(map);
    } catch (error) {
      console.error('載入地圖詳情失敗:', error);
      addToast('載入地圖失敗', 'error');
    }
  };

  // 下載地圖圖片
  const downloadMapImage = async () => {
    if (!mapViewRef.current || !selectedMap) return;
    try {
      addToast('正在生成地圖圖片...', 'info');
      
      // 建立臨時容器包含地圖和統計
      const tempContainer = document.createElement('div');
      tempContainer.style.display = 'flex';
      tempContainer.style.gap = '20px';
      tempContainer.style.padding = '20px';
      tempContainer.style.backgroundColor = '#1e293b';
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      
      // 複製地圖
      const mapClone = mapViewRef.current.cloneNode(true) as HTMLElement;
      mapClone.style.flexShrink = '0';
      tempContainer.appendChild(mapClone);
      
      // 建立統計區域
      if (selectedMap.alliances && selectedMap.alliances.length > 0) {
        const statsDiv = document.createElement('div');
        statsDiv.style.display = 'flex';
        statsDiv.style.flexDirection = 'column';
        statsDiv.style.gap = '15px';
        statsDiv.style.padding = '20px';
        statsDiv.style.backgroundColor = '#334155';
        statsDiv.style.borderRadius = '12px';
        statsDiv.style.minWidth = '250px';
        
        // 標題
        const titleDiv = document.createElement('div');
        titleDiv.style.color = '#fff';
        titleDiv.style.fontSize = '18px';
        titleDiv.style.fontWeight = 'bold';
        titleDiv.style.marginBottom = '10px';
        titleDiv.textContent = '聯盟統計';
        statsDiv.appendChild(titleDiv);
        
        // 各聯盟統計
        selectedMap.alliances.forEach((alliance: any) => {
          const count = Object.values(selectedMap.gridData || {}).filter((id: any) => id === alliance.id).length;
          
          const allianceDiv = document.createElement('div');
          allianceDiv.style.display = 'flex';
          allianceDiv.style.flexDirection = 'column';
          allianceDiv.style.gap = '8px';
          allianceDiv.style.padding = '12px';
          allianceDiv.style.backgroundColor = '#1e293b';
          allianceDiv.style.borderRadius = '8px';
          
          // 聯盟名稱和顏色
          const nameDiv = document.createElement('div');
          nameDiv.style.display = 'flex';
          nameDiv.style.alignItems = 'center';
          nameDiv.style.gap = '8px';
          
          const colorBox = document.createElement('div');
          colorBox.style.width = '16px';
          colorBox.style.height = '16px';
          colorBox.style.borderRadius = '4px';
          colorBox.style.backgroundColor = alliance.color;
          nameDiv.appendChild(colorBox);
          
          const nameSpan = document.createElement('span');
          nameSpan.style.color = '#fff';
          nameSpan.style.fontWeight = 'bold';
          nameSpan.textContent = alliance.name;
          nameDiv.appendChild(nameSpan);
          
          allianceDiv.appendChild(nameDiv);
          
          // 格子數
          const countDiv = document.createElement('div');
          countDiv.style.color = '#a78bfa';
          countDiv.style.fontSize = '16px';
          countDiv.style.fontWeight = 'bold';
          countDiv.textContent = `佔地數：${count}`;
          allianceDiv.appendChild(countDiv);
          
          statsDiv.appendChild(allianceDiv);
        });
        
        tempContainer.appendChild(statsDiv);
      }
      
      document.body.appendChild(tempContainer);
      
      // 等待一下讓 DOM 渲染
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: '#1e293b',
        scale: 2,
        logging: false
      });
      
      document.body.removeChild(tempContainer);
      
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.download = `alliance_map_${selectedMap.title}_${timestamp}.png`;
      link.href = canvas.toDataURL();
      link.click();
      addToast('地圖已下載', 'success');
    } catch (error) {
      console.error('下載失敗:', error);
      addToast('下載失敗', 'error');
    }
  };

  // 分享地圖連結
  const shareMapLink = () => {
    if (!selectedMap) return;
    const shareURL = `${window.location.origin}/map/${selectedMap.id}`;
    
    navigator.clipboard.writeText(shareURL).then(() => {
      addToast('分享連結已複製', 'success');
    }).catch(() => {
      addToast('複製失敗', 'error');
    });
  };

  // 當選中場次時，加載該場次的活動類型配置
  // 當 dayConfig 變化時，檢查並遷移報名資料
  const migrateDataIfNeeded = (newConfig: Record<string, ActivityType>) => {
    // 只在編輯現有報名時進行遷移
    if (!editingSubmission) return;

    const oldSlots = editingSubmission.slots;
    const newSlots = { ...formData.slots };
    let hasMigrated = false;

    // 建立映射表：活動類型 -> 舊日期和新日期
    const activityTypeMapping: Record<string, { oldDays: string[]; newDay?: string }> = {
      'research': { oldDays: [] },
      'training': { oldDays: [] },
      'building': { oldDays: [] }
    };

    // 從舊的提交資料中找出有填寫內容的日期
    Object.entries(oldSlots || {}).forEach(([day, slot]) => {
      if (slot && slot.checked) {
        // 找出這個日期對應的活動類型（通過掃描所有可能的舊配置）
        // 假設之前也是按照舊的 dayConfig 填寫的，我們通過對比來推測
        // 簡化方法：假設填寫過的日期對應一個活動類型
        const possibleTypes = Object.entries(newConfig)
          .filter(([d, type]) => type !== 'none')
          .map(([d, type]) => type as ActivityType);
        
        // 優先使用之前在該日期的活動類型（如果還存在配置中）
        if (newConfig[day] && newConfig[day] !== 'none') {
          activityTypeMapping[newConfig[day] as ActivityType].oldDays.push(day);
        } else {
          // 如果配置改變，嘗試從位置推測（假設只有一個相同類型的移動）
          // 取最接近的活動類型
          possibleTypes.forEach(type => {
            // 這裡我們無法準確判斷，所以先標記為潛在的舊日期
            if (!activityTypeMapping[type].oldDays.includes(day)) {
              activityTypeMapping[type].oldDays.push(day);
            }
          });
        }
      }
    });

    // 從新配置中找出新日期
    Object.entries(newConfig).forEach(([day, type]) => {
      if (type && type !== 'none') {
        if (activityTypeMapping[type]) {
          activityTypeMapping[type].newDay = day;
        }
      }
    });

    // 進行遷移：對於每種活動類型，如果舊位置和新位置不同，複製資料
    Object.entries(activityTypeMapping).forEach(([activityType, { oldDays, newDay }]) => {
      if (newDay && oldDays.length > 0) {
        // 找到第一個有內容的舊日期
        const oldDay = oldDays.find(d => oldSlots && oldSlots[d] && oldSlots[d].checked);
        if (oldDay && oldDay !== newDay) {
          // 複製資料到新日期
          newSlots[newDay] = { ...oldSlots[oldDay] };
          // 清空舊日期
          if (oldDay !== newDay) {
            newSlots[oldDay] = cloneSlot();
          }
          hasMigrated = true;
        }
      }
    });

    if (hasMigrated) {
      setFormData(prev => ({
        ...prev,
        slots: newSlots
      }));
      addToast(`✓ 報名資料已自動遷移到新的時段`, 'success');
    }
  };

  useEffect(() => {
    if (selectedEventDate) {
      const loadDayConfig = async () => {
        const config = await EventService.getDayConfig(selectedEventDate);
        if (config) {
          // 檢查並遷移資料
          migrateDataIfNeeded(config);
          setDayConfig(config);
        }
      };
      loadDayConfig();
    }
  }, [selectedEventDate]);

  const loadLinkedAccounts = async () => {
    try {
      const result = await AuthService.getLinkedAccounts();
      if (result && Array.isArray(result.accounts)) {
        setLinkedAccounts(result.accounts);
      } else {
        console.warn('⚠️ loadLinkedAccounts - 無效的回應格式:', result);
        setLinkedAccounts([]);
      }
    } catch (error) {
      console.error('❌ loadLinkedAccounts 錯誤:', error);
      setLinkedAccounts([]);
    }
  };

  const loadEvents = async () => {
    try {
      const allEvents = await EventService.getPublicEvents();
      
      // 確保 allEvents 是陣列
      if (!allEvents || !Array.isArray(allEvents)) {
        console.warn('⚠️ loadEvents - 無效的回應格式:', allEvents);
        setEvents([]);
        return;
      }
      
      // 排序：開放報名的在最上方，然後按日期遞減
      const sortedEvents = allEvents.sort((a, b) => {
        // 首先按狀態排序：open 在前
        if (a.status === 'open' && b.status !== 'open') return -1;
        if (a.status !== 'open' && b.status === 'open') return 1;
        // 同狀態則按日期遞減
        return b.eventDate.localeCompare(a.eventDate);
      });
      setEvents(sortedEvents);
      
      // 如果有開放報名的場次，載入其活動類型配置
      const openEvent = sortedEvents.find(e => e.status === 'open');
      if (openEvent) {
        const config = await EventService.getDayConfig(openEvent.eventDate);
        if (config) {
          setDayConfig(config);
        }
      }
    } catch (error) {
      console.error('❌ loadEvents 錯誤:', error);
      setEvents([]);
    }
  };

  // 檢查用戶是否已報名指定場次
  const hasSubmissionForEvent = (eventDate: string): boolean => {
    return submissions.some(s => s.eventDate === eventDate);
  };

  // 取得場次狀態顯示文字
  const getEventStatusText = (event: Event): string => {
    if (event.status === 'disabled') return t('svsNotOpened');
    if (event.status === 'closed') return t('svsClosed');
    return t('svsOpening');
  };

  // 取得場次狀態樣式
  const getEventStatusStyle = (event: Event): string => {
    if (event.status === 'disabled') return 'bg-slate-700 text-slate-300 border border-slate-600';
    if (event.status === 'closed') return 'bg-red-900/40 text-red-300 border border-red-500';
    return 'bg-green-900/40 text-green-300 border border-green-500';
  };

  const loadSubmissions = async () => {
    try {
      const userSubmissions = await FormService.getSubmissionsByUser(user.id);
      console.log('📋 載入的報名記錄:', userSubmissions);
      
      // 確保 userSubmissions 是陣列
      if (!userSubmissions || !Array.isArray(userSubmissions)) {
        console.warn('⚠️ userSubmissions 不是有效陣列:', userSubmissions);
        setSubmissions([]);
        return;
      }
      
      setSubmissions(userSubmissions);
      
      // 如果有報名資料，自動進入編輯模式
      if (userSubmissions.length > 0) {
        // 自動載入最新報名資料以便編輯
        const latestSubmission = userSubmissions[0];
        setEditingId(latestSubmission.id);
        setFormData({
          gameId: latestSubmission.gameId,
          playerName: latestSubmission.playerName,
          alliance: latestSubmission.alliance,
          slots: {
            tuesday: cloneSlot(latestSubmission.slots?.tuesday),
            thursday: cloneSlot(latestSubmission.slots?.thursday),
            friday: cloneSlot(latestSubmission.slots?.friday)
          }
        });
      }
    } catch (error) {
      console.error('❌ loadSubmissions 錯誤:', error);
      setSubmissions([]);
    }
  };

  const handleRefreshPlayerData = async () => {
    setRefreshing(true);
    try {
      const updatedPlayer = await fetchPlayer(playerData.fid);
      // 更新 playerData 中的資料
      Object.assign(playerData, updatedPlayer);
      addToast(t('playerDataUpdated'), 'success');
      // 打開聯盟編輯視窗
      setTempAlliance(user.allianceName || '');
      setShowAllianceEdit(true);
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('refreshFailed'), 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAllianceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      alliance: e.target.value
    }));
  };

  const validateAllianceName = (name: string): string => {
    const trimmed = name.trim();
    // 檢查長度
    if (trimmed.length !== 3) {
      return '聯盟名稱必須是 3 個字符';
    }
    // 檢查只能是英文大小寫和數字
    if (!/^[A-Za-z0-9]{3}$/.test(trimmed)) {
      return '只能輸入英文和數字';
    }
    return '';
  };

  const handleAllianceSave = async () => {
    let finalAlliance = tempAlliance;
    setAllianceError('');

    // 如果選擇了自訂選項
    if (tempAlliance === t('custom') || editShowCustomInput) {
      const customAlliance = editCustomAlliance.trim();
      if (!customAlliance) {
        setAllianceError(t('enterAllianceName'));
        return;
      }

      const error = validateAllianceName(customAlliance);
      if (error) {
        setAllianceError(error);
        return;
      }

      finalAlliance = customAlliance;

      // 如果是新的聯盟，加入列表
      if (!allianceList.includes(finalAlliance)) {
        setAllianceList(prev => [...prev, finalAlliance]);
      }
    }

    // 更新用戶資料庫中的聯盟
    const success = await AuthService.updateProfile({ allianceName: finalAlliance });
    
    if (!success) {
      addToast(t('updateAllianceFailed'), 'error');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      alliance: finalAlliance
    }));
    
    // 更新所有報名記錄中的聯盟
    for (const submission of submissions) {
      await FormService.updateSubmission(submission.id, {
        alliance: finalAlliance
      });
    }
    
    // 重新加載提交記錄以反映更改
    await loadSubmissions();
    setShowAllianceEdit(false);
    setEditCustomAlliance('');
    setEditShowCustomInput(false);
    addToast(t('allianceUpdated'), 'success');
  };

  const handleSlotToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      slots: {
        ...prev.slots,
        [day]: {
          ...prev.slots[day],
          checked: !prev.slots[day].checked
        }
      }
    }));
  };

  const handleFireSparkleChange = (day: string, value: string) => {
    // 只允許數字，移除非數字字符
    const cleanValue = value.replace(/\D/g, '');
    const num = cleanValue === '' ? 0 : parseInt(cleanValue, 10);
    setFormData(prev => ({
      ...prev,
      slots: {
        ...prev.slots,
        [day]: {
          ...prev.slots[day],
          fireSparkleCount: num
        }
      }
    }));
  };

  const handleFireGemChange = (day: string, field: 'fireGemCount' | 'refinedFireGemCount', value: string) => {
    // 只允許數字，移除非數字字符
    const cleanValue = value.replace(/\D/g, '');
    const num = cleanValue === '' ? 0 : parseInt(cleanValue, 10);
    setFormData(prev => ({
      ...prev,
      slots: {
        ...prev.slots,
        [day]: {
          ...prev.slots[day],
          [field]: num
        }
      }
    }));
  };

  const handleAccelChange = (day: string, type: 'research' | 'general', field: 'days' | 'hours' | 'minutes', value: string) => {
    // 只允許數字，移除非數字字符
    const cleanValue = value.replace(/\D/g, '');
    const num = cleanValue === '' ? 0 : parseInt(cleanValue, 10);
    setFormData(prev => {
      const slot = { ...prev.slots[day] };
      if (type === 'research') {
        slot.researchAccel[field] = num;
      } else {
        slot.generalAccel[field] = num;
      }
      return {
        ...prev,
        slots: { ...prev.slots, [day]: slot }
      };
    });
  };

  const handleT11Change = (day: string) => {
    setFormData(prev => ({
      ...prev,
      slots: {
        ...prev.slots,
        [day]: {
          ...prev.slots[day],
          upgradeT11: !prev.slots[day].upgradeT11,
          fireSparkleCount: !prev.slots[day].upgradeT11 ? 0 : undefined
        }
      }
    }));
  };

  const handleTimeSlotChange = (day: string, index: number, field: 'start' | 'end', value: number) => {
    // 將小時數轉換為 HH:00 格式
    const timeStr = String(value).padStart(2, '0') + ':00';
    
    setFormData(prev => {
      const slot = { ...prev.slots[day] };
      slot.timeSlots[index] = { ...slot.timeSlots[index], [field]: timeStr };
      return {
        ...prev,
        slots: { ...prev.slots, [day]: slot }
      };
    });
  };

  const addTimeSlot = (day: string) => {
    setFormData(prev => {
      const slot = { ...prev.slots[day] };
      slot.timeSlots = [...slot.timeSlots, { start: '', end: '' }];
      return {
        ...prev,
        slots: { ...prev.slots, [day]: slot }
      };
    });
  };

  const removeTimeSlot = (day: string, index: number) => {
    setFormData(prev => {
      const slot = { ...prev.slots[day] };
      if (!slot.timeSlots) slot.timeSlots = [{ start: '', end: '' }];
      slot.timeSlots = slot.timeSlots.filter((_, i) => i !== index);
      if (slot.timeSlots.length === 0) {
        slot.timeSlots = [{ start: '', end: '' }];
      }
      return {
        ...prev,
        slots: { ...prev.slots, [day]: slot }
      };
    });
  };

  // 檢查單個時段是否有問題
  const getTimeSlotError = (day: string, index: number): string | null => {
    const slot = formData.slots[day as 'tuesday' | 'thursday' | 'friday'];
    if (!slot || !slot.timeSlots) return null;
    
    const ts = slot.timeSlots[index];
    if (!ts || !ts.start || !ts.end) return null;
    
    // 檢查起迄時間是否相同
    if (ts.start === ts.end) {
      return t('startEndTimeSame');
    }

    // 檢查結束時間是否早於起始時間
    const startTime = timeToMinutes(ts.start);
    const endTime = timeToMinutes(ts.end);
    if (endTime < startTime) {
      return t('endTimeEarlier');
    }
    
    // 檢查是否與其他時段重疊
    for (let i = 0; i < slot.timeSlots.length; i++) {
      if (i === index) continue;
      const otherSlot = slot.timeSlots[i];
      if (!otherSlot.start || !otherSlot.end) continue;
      
      const currentStart = timeToMinutes(ts.start);
      const currentEnd = timeToMinutes(ts.end);
      const otherStart = timeToMinutes(otherSlot.start);
      const otherEnd = timeToMinutes(otherSlot.end);
      
      // 檢查是否重疊
      if (!(currentEnd <= otherStart || otherEnd <= currentStart)) {
        return t('timeslotDuplicate');
      }
    }
    
    return null;
  };

  // 時間字符串轉換為分鐘
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // 檢查時間段是否重疊
  const checkTimeOverlap = (timeSlots: Array<{ start: string; end: string }>): boolean => {
    const validSlots = timeSlots.filter(ts => ts.start && ts.end);
    
    for (let i = 0; i < validSlots.length; i++) {
      for (let j = i + 1; j < validSlots.length; j++) {
        const slot1Start = timeToMinutes(validSlots[i].start);
        const slot1End = timeToMinutes(validSlots[i].end);
        const slot2Start = timeToMinutes(validSlots[j].start);
        const slot2End = timeToMinutes(validSlots[j].end);

        // 檢查是否重疊
        if (!(slot1End <= slot2Start || slot2End <= slot1Start)) {
          return true; // 有重疊
        }
      }
    }
    return false; // 無重疊
  };

  // 檢查起迄時間是否相同
  const checkStartEndSame = (timeSlots: Array<{ start: string; end: string }>): boolean => {
    return timeSlots.some(ts => ts.start && ts.end && ts.start === ts.end);
  };

  const validateForm = () => {
    if (!formData.alliance.trim()) {
      // 直接彈出聯盟設定而不顯示錯誤
      setTempAlliance(user.allianceName || '');
      setShowAllianceEdit(true);
      return false;
    }

    const hasAnySelected = Object.values(formData.slots).some(slot => slot.checked);
    if (!hasAnySelected) {
      addToast(t('selectAtLeastOne'), 'error');
      return false;
    }

    // 檢查已選項的必填欄位
    for (const [day, slot] of Object.entries(formData.slots)) {
      if (slot.checked) {
        // 檢查時段不能為空
        const hasValidTimeSlot = slot.timeSlots.some(ts => ts.start && ts.end);
        if (!hasValidTimeSlot) {
          addToast(t('timeslotCannotBeEmpty'), 'error');
          return false;
        }

        // 檢查至少有一個資源被填寫
        const hasResource = 
          (slot.researchAccel?.days > 0 || slot.researchAccel?.hours > 0 || slot.researchAccel?.minutes > 0) ||
          (slot.generalAccel?.days > 0 || slot.generalAccel?.hours > 0 || slot.generalAccel?.minutes > 0) ||
          (slot.upgradeT11 && slot.fireSparkleCount) ||
          slot.fireGemCount > 0 ||
          slot.refinedFireGemCount > 0;
        
        if (!hasResource) {
          addToast(t('resourceCannotBeEmpty'), 'error');
          return false;
        }

        // 週五不強制填寫建築加速，其他日期強制填寫研究加速
        if (day !== 'friday' && slot.researchAccel.days === 0 && slot.researchAccel.hours === 0 && slot.researchAccel.minutes === 0) {
          addToast(`${day} 請填寫研究加速時間`, 'error');
          return false;
        }
        if (slot.timeSlots.some(ts => ts.start === undefined || ts.end === undefined)) {
          addToast(`${day} 請選擇完整的可接受時段`, 'error');
          return false;
        }
        // 檢查起迄時間是否相同
        if (checkStartEndSame(slot.timeSlots)) {
          addToast(`${day} 起迄時間不能相同`, 'error');
          return false;
        }
        // 檢查時間是否重疊
        if (checkTimeOverlap(slot.timeSlots)) {
          addToast(`${day} 時段不能重複`, 'error');
          return false;
        }
        // 只在星期二時檢查 T11 和火精微粒
        if (day === 'tuesday' && slot.upgradeT11 && !slot.fireSparkleCount) {
          addToast(`${day} 請填寫火精微粒數量`, 'error');
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const cleanedSlots: any = {};
    Object.entries(formData.slots).forEach(([day, slot]) => {
      if (slot.checked) {
        cleanedSlots[day] = slot;
      }
    });

    // 顯示確認彈窗而不是直接提交
    setConfirmData({
      gameId: formData.gameId,
      playerName: formData.playerName,
      alliance: formData.alliance,
      slots: cleanedSlots,
      isEditing: !!editingId,
      eventDate: selectedEventDate || undefined
    });
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setLoading(true);

    try {
      if (editingId) {
        await FormService.updateSubmission(editingId, {
          alliance: confirmData.alliance,
          slots: confirmData.slots
        });
        addToast(t('submissionUpdated'), 'success');
        setEditingId(null);
      } else {
        await FormService.submitForm({
          userId: user.id,
          fid: playerData.fid,
          gameId: confirmData.gameId,
          playerName: confirmData.playerName,
          alliance: confirmData.alliance,
          slots: confirmData.slots,
          eventDate: confirmData.eventDate
        });
        addToast(t('submissionSuccess'), 'success');

        setFormData(prev => ({
          ...prev,
          alliance: '',
          slots: {
            tuesday: cloneSlot(),
            thursday: cloneSlot(),
            friday: cloneSlot()
          }
        }));
        
        // SVS 模式下提交後回到表格
        if (isSVSMode) {
          setSVSFormExpanded(false);
        }
      }

      await loadSubmissions();
      // 非 SVS 模式才隱藏表單
      if (!isSVSMode) {
        setShowForm(false);
      }
      
      // 關閉確認彈窗
      setShowConfirmModal(false);
      setConfirmData(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('submitFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (submission: FormSubmission) => {
    console.log('📝 編輯報名 - 原始資料:', submission);
    console.log('📝 編輯報名 - slots:', submission.slots);
    
    // 複製所有天的資料
    const editData: any = {
      gameId: submission.gameId,
      playerName: submission.playerName,
      alliance: submission.alliance,
      slots: {}
    };

    // 複製所有可用的天數資料
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
      editData.slots[day] = submission.slots && submission.slots[day] 
        ? cloneSlot(submission.slots[day]) 
        : cloneSlot();
    });
    
    console.log('📝 編輯報名 - 設定的資料:', editData);
    
    setFormData(editData);
    setEditingId(submission.id);
    setEditingSubmission(submission); // 保存原始提交資料以便遷移
    setShowForm(true);
  };

  const handleDelete = async (submissionId: string) => {
    if (window.confirm(t('confirmDeleteSubmission'))) {
      await FormService.deleteSubmission(submissionId);
      await loadSubmissions();
      addToast(t('submissionDeleted'), 'success');
    }
  };

  const handleLogoutClick = () => {
    const confirmed = window.confirm(t('confirmLogout'));
    if (confirmed) {
      onLogout();
    }
  };

  // ======== 變更密碼函數 ========
  
  const handleChangePassword = async () => {
    // 驗證
    if (!currentPassword.trim()) {
      addToast(t('currentPasswordIncorrect'), 'error');
      return;
    }
    if (newPasswordInput.length < 6) {
      addToast(t('passwordMinLength'), 'error');
      return;
    }
    if (newPasswordInput !== confirmNewPassword) {
      addToast(t('passwordsDoNotMatch'), 'error');
      return;
    }

    setChangingPassword(true);
    try {
      const result = await AuthService.changePassword(currentPassword, newPasswordInput);
      if (result.success) {
        addToast(t('passwordChanged'), 'success');
        setShowChangePasswordModal(false);
        setCurrentPassword('');
        setNewPasswordInput('');
        setConfirmNewPassword('');
      } else {
        addToast(result.message === 'Current password is incorrect' ? t('currentPasswordIncorrect') : t('passwordChangeFailed'), 'error');
      }
    } catch (error) {
      addToast(t('passwordChangeFailed'), 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  // ======== 帳號管理函數 ========
  
  const handleAddSubAccount = async () => {
    if (!newAccountGameId.trim()) {
      addToast(t('enterGameId_error'), 'error');
      return;
    }

    // 不能添加自己
    if (newAccountGameId.trim() === user.gameId) {
      addToast(t('cannotAddCurrentAccount'), 'error');
      return;
    }

    setAddingAccount(true);
    try {
      // 先從遊戲 API 獲取玩家資料
      const playerInfo = await fetchPlayer(newAccountGameId.trim());
      
      if (!playerInfo) {
        addToast(t('fetchPlayerDataFailed_detailed'), 'error');
        setAddingAccount(false);
        return;
      }

      const result = await AuthService.addSubAccount(newAccountGameId.trim(), {
        nickname: playerInfo.nickname,
        kid: playerInfo.kid,
        stoveLv: playerInfo.stove_lv,
        avatarImage: playerInfo.avatar_image,
      });
      
      if (result.success) {
        addToast(result.message || t('altAccountAddedSuccess'), 'success');
        setNewAccountGameId('');
        setShowAddAccountModal(false);
        await loadLinkedAccounts();
      } else {
        addToast(result.message || t('addAccountFailed'), 'error');
      }
    } catch (error) {
      addToast('無法獲取玩家資料，請檢查遊戲 ID 是否正確', 'error');
    } finally {
      setAddingAccount(false);
    }
  };

  const handleSwitchAccount = async (targetGameId: string) => {
    if (targetGameId === user.gameId) return; // 已經是當前帳號
    
    setSwitchingAccount(true);
    try {
      const newUser = await AuthService.switchAccount(targetGameId);
      if (newUser) {
        addToast(`已切換到帳號 ${targetGameId}`, 'success');
        // 重新載入頁面以刷新所有數據
        window.location.reload();
      } else {
        addToast(t('switchAccountFailed'), 'error');
      }
    } catch (error) {
      addToast(t('switchAccountFailedRetry'), 'error');
    } finally {
      setSwitchingAccount(false);
    }
  };

  const handleRemoveSubAccount = async (gameId: string) => {
    if (!window.confirm(`確定要解除綁定帳號 ${gameId} 嗎？\n\n解除綁定後，該帳號需要重新使用密碼登入。`)) {
      return;
    }

    try {
      const success = await AuthService.removeSubAccount(gameId);
      if (success) {
        addToast(t('unbindAccountSuccess'), 'success');
        await loadLinkedAccounts();
      } else {
        addToast(t('unbindAccountFailed'), 'error');
      }
    } catch (error) {
      addToast(t('operationFailed'), 'error');
    }
  };

  const handleExportCSV = () => {
    const headers = [t('gameId'), t('nickname'), t('alliance'), t('timeslot'), t('researchAccel'), t('generalAccel'), t('upgradeT11'), '火精微粒', '可接受時段', t('registrationTime')];
    const rows: string[][] = [];

    submissions.forEach(s => {
      const baseRow = [s.gameId, s.playerName, s.alliance];
      let isFirst = true;

      Object.entries(s.slots).forEach(([day, slot]) => {
        if (slot) {
          const researchTime = `${slot.researchAccel.days}天${slot.researchAccel.hours}小時${slot.researchAccel.minutes}分鐘`;
          const generalTime = `${slot.generalAccel.days}天${slot.generalAccel.hours}小時${slot.generalAccel.minutes}分鐘`;
          const fireSparkle = slot.upgradeT11 && slot.fireSparkleCount ? slot.fireSparkleCount.toString() : '-';
          const timeSlots = slot.timeSlots.map(ts => `${normalizeTimeString(ts.start)}~${normalizeTimeString(ts.end)}`).join(' | ');
          
          const row = [
            isFirst ? baseRow[0] : '',
            isFirst ? baseRow[1] : '',
            isFirst ? baseRow[2] : '',
            day,
            researchTime,
            generalTime,
            slot.upgradeT11 ? t('yes') : t('no'),
            fireSparkle,
            timeSlots,
            isFirst ? new Date(s.submittedAt).toLocaleString('zh-TW') : ''
          ];
          rows.push(row);
          isFirst = false;
        }
      });
    });

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `報名記錄_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  // 根據 dayConfig 動態產生每日標籤
  const getDayLabel = (day: string) => {
    const activityType = dayConfig[day] || 'research';
    const activityInfo = ACTIVITY_TYPES[activityType];
    const dayLabels: Record<string, string> = {
      monday: t('mondayLabel'),
      tuesday: t('tuesdayLabel'),
      wednesday: t('wednesdayLabel'),
      thursday: t('thursdayLabel'),
      friday: t('fridayLabel'),
      saturday: t('saturdayLabel'),
      sunday: t('sundayLabel')
    };
    return {
      name: `${dayLabels[day]} - ${t(getActivityTypeNameKey(activityType))}`,
      emoji: activityInfo.emoji,
      researchLabel: t(getActivityTypeResearchLabelKey(activityType)),
      generalLabel: t(getActivityTypeGeneralLabelKey(activityType)),
      activityType
    };
  };

  // Helper functions to get activity type translation keys
  const getActivityTypeNameKey = (activityType: ActivityType): string => {
    switch (activityType) {
      case 'research': return 'researchBonusDayName';
      case 'training': return 'trainingBonusDayName';
      case 'building': return 'buildingBonusDayName';
      default: return 'none';
    }
  };

  const getActivityTypeResearchLabelKey = (activityType: ActivityType): string => {
    switch (activityType) {
      case 'research': return 'researchAccelLabel_activity';
      case 'training': return 'trainingAccelLabel';
      case 'building': return 'buildingAccelLabel_activity';
      default: return 'researchAccelLabel_activity';
    }
  };

  const getActivityTypeGeneralLabelKey = (activityType: ActivityType): string => {
    switch (activityType) {
      case 'research': return 'generalAccelResearchLabel';
      case 'training': return 'generalAccelTrainingLabel';
      case 'building': return 'generalAccelBuildingLabel';
      default: return 'generalAccelResearchLabel';
    }
  };

  // 根據活動類型排序天數，顯示順序：研究增益 → 練兵增益 → 建築增益
  const getSortedDays = (): string[] => {
    // 只包含非 'none' 的天數
    const availableDays = Object.keys(dayConfig).filter(
      day => dayConfig[day] !== 'none'
    ) as string[];

    const activityOrder: Record<string, number> = {
      'research': 1,
      'training': 2,
      'building': 3,
      'none': 4
    };

    return availableDays.sort((a, b) => {
      const typeA = (dayConfig[a] as ActivityType) || 'research';
      const typeB = (dayConfig[b] as ActivityType) || 'research';
      return (activityOrder[typeA] || 4) - (activityOrder[typeB] || 4);
    });
  };

  const dayLabels: Record<string, any> = {};
  Object.keys(dayConfig).forEach(day => {
    dayLabels[day] = getDayLabel(day);
  });

  const sortedDays = getSortedDays();

  const renderSlotForm = (day: string) => {
    // 確保 slot 存在，如果不存在則使用預設值
    let slot = formData.slots[day] || cloneSlot();
    
    // 確保 timeSlots 存在
    if (!slot.timeSlots) {
      slot = { ...slot, timeSlots: [{ start: '', end: '' }] };
    }
    
    const label = dayLabels[day];

    // 如果 slot 不存在於 formData，先初始化它
    if (!formData.slots[day]) {
      setFormData(prev => ({
        ...prev,
        slots: {
          ...prev.slots,
          [day]: slot
        }
      }));
    }

    return (
      <div key={day} className="bg-slate-700/30 border border-slate-600 rounded-lg p-3 sm:p-4 md:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <button
            type="button"
            onClick={() => handleSlotToggle(day)}
            className="text-slate-400 hover:text-blue-400 transition flex-shrink-0"
          >
            {slot.checked ? (
              <CheckSquare2 size={20} className="text-blue-400 sm:w-6 sm:h-6" />
            ) : (
              <Square size={20} className="sm:w-6 sm:h-6" />
            )}
          </button>
          <span className="text-white font-semibold flex-1 text-sm sm:text-base md:text-lg">
            {label.emoji} {label.name}
          </span>
        </div>

        {slot.checked && (
          <div className="space-y-4 sm:space-y-6 ml-6 sm:ml-9">
            {day === 'friday' && (
              <div className="bg-slate-700/50 rounded p-3 sm:p-4">
                <h4 className="text-white font-semibold mb-3 text-sm sm:text-base">{t('fireGemItems')}</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-300 text-sm mb-2 block">{t('fireGemCount_label')}</label>
                    <input
                      type="number"
                      min="0"
                      value={slot.fireGemCount || 0}
                      onChange={(e) => handleFireGemChange(day, 'fireGemCount', e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm mb-2 block">{t('refinedFireGemCount_label')}</label>
                    <input
                      type="number"
                      min="0"
                      value={slot.refinedFireGemCount || 0}
                      onChange={(e) => handleFireGemChange(day, 'refinedFireGemCount', e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-700/50 rounded p-3 sm:p-4">
              <h4 className="text-white font-semibold mb-3 text-sm sm:text-base">{t('accelerationItemsCount')}：</h4>
              
              <div className="mb-4">
                <p className="text-slate-300 text-xs sm:text-sm mb-2">{label.researchLabel}：</p>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={slot.researchAccel.days}
                      onChange={(e) => handleAccelChange(day, 'research', 'days', e.target.value)}
                      placeholder="0"
                      className="w-12 sm:w-16 px-1 sm:px-2 py-2 bg-slate-600 border border-slate-500 rounded text-white text-xs sm:text-sm text-center"
                    />
                    <span className="text-slate-400 text-xs sm:text-sm">{t('daysUnit')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={slot.researchAccel.hours}
                      onChange={(e) => handleAccelChange(day, 'research', 'hours', e.target.value)}
                      placeholder="0"
                      className="w-12 sm:w-16 px-1 sm:px-2 py-2 bg-slate-600 border border-slate-500 rounded text-white text-xs sm:text-sm text-center"
                    />
                    <span className="text-slate-400 text-xs sm:text-sm">{t('hoursUnit')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={slot.researchAccel.minutes}
                      onChange={(e) => handleAccelChange(day, 'research', 'minutes', e.target.value)}
                      placeholder="0"
                      className="w-12 sm:w-16 px-1 sm:px-2 py-2 bg-slate-600 border border-slate-500 rounded text-white text-xs sm:text-sm text-center"
                    />
                    <span className="text-slate-400 text-xs sm:text-sm">{t('minutesUnit')}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-slate-300 text-xs sm:text-sm mb-2">{label.generalLabel}：</p>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={slot.generalAccel.days}
                    onChange={(e) => handleAccelChange(day, 'general', 'days', e.target.value)}
                    placeholder="0"
                    className="w-12 sm:w-16 px-1 sm:px-2 py-2 bg-slate-600 border border-slate-500 rounded text-white text-xs sm:text-sm text-center"
                  />
                  <span className="text-slate-400 text-xs sm:text-sm">{t('daysUnit')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={slot.generalAccel.hours}
                    onChange={(e) => handleAccelChange(day, 'general', 'hours', e.target.value)}
                    placeholder="0"
                    className="w-12 sm:w-16 px-1 sm:px-2 py-2 bg-slate-600 border border-slate-500 rounded text-white text-xs sm:text-sm text-center"
                  />
                  <span className="text-slate-400 text-xs sm:text-sm">{t('hoursUnit')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={slot.generalAccel.minutes}
                    onChange={(e) => handleAccelChange(day, 'general', 'minutes', e.target.value)}
                    placeholder="0"
                    className="w-12 sm:w-16 px-1 sm:px-2 py-2 bg-slate-600 border border-slate-500 rounded text-white text-xs sm:text-sm text-center"
                  />
                  <span className="text-slate-400 text-xs sm:text-sm">{t('minutesUnit')}</span>
                  </div>
                </div>
              </div>
            </div>

            {day === 'tuesday' && (
              <>
                <div className="flex items-center gap-2 sm:gap-3 bg-slate-700/50 rounded p-3 sm:p-4">
                  <button
                    type="button"
                    onClick={() => handleT11Change(day)}
                    className="text-slate-400 hover:text-green-400 transition"
                  >
                    {slot.upgradeT11 ? (
                      <CheckSquare2 size={18} className="text-green-400 sm:w-5 sm:h-5" />
                    ) : (
                      <Square size={18} className="sm:w-5 sm:h-5" />
                    )}
                  </button>
                  <span className="text-slate-300 text-sm sm:text-base">{t('upgradeT11Tech')}</span>
                </div>

                {slot.upgradeT11 && (
                  <div className="bg-slate-700/50 rounded p-3 sm:p-4">
                    <label className="text-slate-300 text-xs sm:text-sm mb-2 block">{t('fireSparkleCount')}</label>
                    <input
                      type="number"
                      min="0"
                      value={slot.fireSparkleCount || ''}
                      onChange={(e) => handleFireSparkleChange(day, e.target.value)}
                      placeholder={t('enterFireSparkleCount')}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition"
                      required
                    />
                  </div>
                )}
              </>
            )}

            <div className="bg-slate-700/50 rounded p-3 sm:p-4">
              <h4 className="text-white font-semibold mb-3 text-sm sm:text-base">{t('acceptableTimeslots')}</h4>
              <div className="space-y-3">
                {slot.timeSlots.map((ts, index) => {
                  const error = getTimeSlotError(day, index);
                  return (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-400 text-[10px] sm:text-xs mb-1">
                          {index === 0 ? t('preferenceLevel').split('|')[0] : index === 1 ? t('preferenceLevel').split('|')[1] : t('preferenceLevel').split('|')[2]}
                        </p>
                        <div className={`flex flex-col sm:flex-row gap-1 sm:gap-2 px-2 py-2 rounded ${error ? 'bg-red-900/30 border border-red-500' : 'bg-slate-600'}`}>
                          <select
                            value={ts.start ? parseInt(ts.start.split(':')[0]) : ''}
                            onChange={(e) => handleTimeSlotChange(day, index, 'start', parseInt(e.target.value))}
                            className={`flex-1 px-2 py-1.5 sm:py-1 rounded text-white text-xs sm:text-sm focus:outline-none overflow-x-auto whitespace-nowrap ${error ? 'bg-red-800/50 border border-red-400' : 'bg-slate-500'}`}
                          >
                            <option value="">{t('startTimeLabel')}</option>
                            {timeOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <span className="text-slate-400 text-xs sm:text-sm text-center hidden sm:inline">～</span>
                          <select
                            value={ts.end ? parseInt(ts.end.split(':')[0]) : ''}
                            onChange={(e) => handleTimeSlotChange(day, index, 'end', parseInt(e.target.value))}
                            className={`flex-1 px-2 py-1.5 sm:py-1 rounded text-white text-xs sm:text-sm focus:outline-none overflow-x-auto whitespace-nowrap ${error ? 'bg-red-800/50 border border-red-400' : 'bg-slate-500'}`}
                          >
                            <option value="">{t('endTimeLabel')}</option>
                            {timeOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        {error && (
                          <p className="text-red-400 text-[10px] sm:text-xs mt-1">⚠️ {error}</p>
                        )}
                      </div>
                      {slot.timeSlots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(day, index)}
                          className="p-1.5 sm:p-2 hover:bg-slate-600 rounded text-slate-400 hover:text-red-400 transition flex-shrink-0"
                        >
                          <Trash size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {slot.timeSlots.length < 3 && (
                <button
                  type="button"
                  onClick={() => addTimeSlot(day)}
                  className="mt-3 px-3 py-1.5 sm:py-2 bg-slate-600 hover:bg-slate-500 text-white text-xs sm:text-sm rounded flex items-center gap-2 transition"
                >
                  <Plus size={14} className="sm:w-4 sm:h-4" />
                  {t('addTimeSlot')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 sm:p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2">💸 {t('gameTitle')}</h1>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {user.isAdmin && (
                <button
                  onClick={() => window.location.href = '/manager'}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition font-semibold text-sm sm:text-base"
                >
                  👑 {t('adminDashboard')}
                </button>
              )}
              <button
                onClick={() => setShowChangePasswordModal(true)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition font-semibold text-sm sm:text-base flex items-center gap-1"
                title={t('changePassword')}
              >
                <Key size={16} />
                <span className="hidden sm:inline">{t('changePassword')}</span>
              </button>
              <button
                onClick={handleLogoutClick}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition font-semibold text-sm sm:text-base"
              >
                {t('logout')}
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-800 to-slate-700 border border-slate-600 rounded-xl p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0">
                {playerData.avatar_image ? (
                  <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 border-blue-500 shadow-lg">
                    <img
                      src={playerData.avatar_image}
                      alt={playerData.nickname}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23374151" width="100" height="100"/><text x="50" y="50" font-size="50" fill="%23fff" text-anchor="middle" dominant-baseline="central">👤</text></svg>';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-lg bg-slate-600 border-2 border-slate-500 flex items-center justify-center text-2xl sm:text-3xl">
                    👤
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 sm:gap-4 mb-2 sm:mb-3">
                  <div className="min-w-0">
                    <p className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-wide mb-0.5">{t('currentLoginUser_label')}</p>
                    <p className="text-white font-bold text-base sm:text-xl truncate">{playerData.nickname}</p>
                  </div>
                  <button
                    onClick={handleRefreshPlayerData}
                    disabled={refreshing}
                    className="p-1.5 sm:p-2 text-slate-400 hover:text-blue-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    title={t('refreshPlayerData')}
                  >
                    <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                  </button>
                </div>
                
                {/* 資訊網格 - 水平排列 */}
                <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">ID:</span>
                    <span className="text-blue-300 font-semibold">{playerData.fid}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">{t('levelLabel')}:</span>
                    {getFireCrystalLevel(playerData.stove_lv || 0) ? (
                      <img 
                        src={`/assets/furnace/stove_lv_${getFireCrystalLevel(playerData.stove_lv || 0)}.png`}
                        alt={`FC ${getFireCrystalLevel(playerData.stove_lv || 0)}`}
                        className="w-6 h-6 sm:w-7 sm:h-7"
                      />
                    ) : (
                      <span className="text-yellow-300 font-bold">
                        {getFortiressLevel(playerData.stove_lv || 0)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">{t('kingdomLabel')}:</span>
                    <span className="text-blue-300 font-semibold">{playerData.kid || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">{t('alliance')}:</span>
                    <span className="text-green-300 font-semibold">{formData.alliance}</span>
                    <button
                      type="button"
                      onClick={() => setShowAllianceEdit(true)}
                      className="p-0.5 text-slate-400 hover:text-blue-400 transition"
                      title={t('editAlliance')}
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 綁定子帳號按鈕 */}
          <div className="mt-4 sm:mt-6">
            <button
              onClick={() => setShowBindingModal(true)}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-lg transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <UserPlus size={18} />
              🔗 {t('bindAltAccount')}
            </button>
          </div>

          {/* 帳號管理區塊 */}
          {linkedAccounts.length > 1 && (
            <div className="mt-4 sm:mt-6 bg-slate-800/50 border border-slate-700 rounded-xl p-3 sm:p-4">
              <button
                onClick={() => setShowAccountManager(!showAccountManager)}
                className="w-full flex items-center justify-between text-slate-300 hover:text-white transition"
              >
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  <span className="text-sm font-semibold">{t('accountSwitchingSection')}</span>
                  <span className="text-xs text-slate-500">({linkedAccounts.length} {t('accountCountUnit')})</span>
                </div>
                {showAccountManager ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showAccountManager && (
                <div className="mt-3 space-y-2">
                  {linkedAccounts.map((account) => {
                    const isCurrentAccount = account.gameId === user.gameId;
                    return (
                      <div
                        key={account.id}
                        className={`flex items-center justify-between gap-2 p-2 sm:p-3 rounded-lg border transition ${
                          isCurrentAccount
                            ? 'bg-blue-900/30 border-blue-500'
                            : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-slate-500 bg-slate-600 flex-shrink-0">
                            {account.avatarImage ? (
                              <img src={account.avatarImage} alt={account.nickname || ''} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm">👤</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-white font-semibold text-sm truncate">
                                {account.nickname || account.gameId}
                              </span>
                              {account.isParent && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-600/50 text-amber-200 rounded">{t('mainAccount')}</span>
                              )}
                              {isCurrentAccount && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-600/50 text-blue-200 rounded">{t('currentAccount')}</span>
                              )}
                            </div>
                            <p className="text-[10px] sm:text-xs text-slate-400">
                              ID: {account.gameId}
                              {account.allianceName && ` · ${account.allianceName}`}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!isCurrentAccount && (
                            <button
                              onClick={() => handleSwitchAccount(account.gameId)}
                              disabled={switchingAccount}
                              className="px-2 sm:px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded transition disabled:opacity-50"
                            >
                              {t('switch')}
                            </button>
                          )}
                          {!account.isParent && !isCurrentAccount && (
                            <button
                              onClick={() => handleRemoveSubAccount(account.gameId)}
                              className="p-1 text-red-400 hover:text-red-300 transition"
                              title={t('unbindAccountSuccess')}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  <button
                    onClick={() => setShowAddAccountModal(true)}
                    className="w-full flex items-center justify-center gap-2 p-2 sm:p-3 border-2 border-dashed border-slate-600 hover:border-slate-500 text-slate-400 hover:text-slate-300 rounded-lg transition"
                  >
                    <UserPlus size={16} />
                    <span className="text-sm">{t('addAccount')}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 如果還沒有子帳號，顯示新增按鈕 */}
          {linkedAccounts.length <= 1 && (
            <div className="mt-4 sm:mt-6">
              <button
                onClick={() => setShowAddAccountModal(true)}
                className="w-full flex items-center justify-center gap-2 p-2 sm:p-3 bg-slate-800/50 border border-dashed border-slate-600 hover:border-slate-500 text-slate-400 hover:text-slate-300 rounded-lg transition"
              >
                <UserPlus size={16} />
                <span className="text-sm">{t('addOtherAccountShort')}</span>
              </button>
            </div>
          )}

          {/* SVS 按鈕區塊 */}
          <div className="grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-3 mt-4 sm:mt-6">
            <button
              onClick={() => {
                console.log('[Debug] 進入 SVS 官職報名模式');
                setIsSVSMode(true);
                setIsSVSMapMode(false);
                setSelectedMap(null);
              }}
              className="bg-gradient-to-br from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 border border-amber-600 rounded-lg p-3 sm:p-4 text-white font-semibold transition shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center gap-2 justify-center text-sm sm:text-base">
                <Zap size={16} className="sm:w-[18px] sm:h-[18px]" />
                {t('svsOfficerRegistration_button')}
              </div>
              <p className="text-[10px] sm:text-xs text-amber-200 mt-1">{t('clickToEnterRegistration')}</p>
            </button>

            <button
              onClick={() => {
                console.log('[Debug] 進入 SVS 地圖分配模式');
                setIsSVSMapMode(true);
                setIsSVSMode(false);
                setSelectedMap(null);
                loadOpenMaps();
              }}
              className="bg-gradient-to-br from-purple-700 to-purple-800 hover:from-purple-600 hover:to-purple-700 border border-purple-600 rounded-lg p-3 sm:p-4 text-white font-semibold transition shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center gap-2 justify-center text-sm sm:text-base">
                <MapPin size={16} className="sm:w-[18px] sm:h-[18px]" />
                {t('svsMapAllocation')}
              </div>
              <p className="text-[10px] sm:text-xs text-purple-200 mt-1">查看地圖分配</p>
            </button>

            <button
              onClick={() => {
                setShowSVSImmigrant(true);
                setIsSVSMode(false);
                setIsSVSMapMode(false);
                setSelectedMap(null);
              }}
              className="bg-gradient-to-br from-cyan-700 to-cyan-800 hover:from-cyan-600 hover:to-cyan-700 border border-cyan-600 rounded-lg p-3 sm:p-4 text-white font-semibold transition shadow-lg hover:shadow-xl"
            >
              <div className="flex items-center gap-2 justify-center text-sm sm:text-base">
                <Users size={16} className="sm:w-[18px] sm:h-[18px]" />
                {t('immigrationListRecommendation')}
              </div>
              <p className="text-[10px] sm:text-xs text-cyan-200 mt-1">{t('pageUnderConstruction_short')}</p>
            </button>
          </div>
        </div>

        <div className={isSVSMapMode ? "w-full" : "grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6"}>
          <div className={isSVSMapMode ? "w-full" : "lg:col-span-3"}>
            {/* SVS 官職報名模式 */}
            {isSVSMode ? (
              <div className="bg-slate-800 rounded-xl sm:rounded-2xl shadow-2xl border border-slate-700 p-4 sm:p-6 md:p-8">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">{t('svsOfficerRegistration_button')}</h2>
                </div>

                {/* SVS 表格 */}
                {!svsFormExpanded && (
                  <div className="mb-4 sm:mb-6">
                    {/* 手機版：卡片式顯示 */}
                    <div className="block sm:hidden space-y-3">
                      {events.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">{t('noEventData')}</div>
                      ) : (
                        events.map(event => {
                          const hasApplied = hasSubmissionForEvent(event.eventDate);
                          const submission = submissions.find(s => s.eventDate === event.eventDate);
                          const isOpen = event.status === 'open';
                          
                          return (
                            <div key={event.eventDate} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-white font-bold text-base">{event.eventDate}</span>
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${getEventStatusStyle(event)}`}>
                                  {getEventStatusText(event)}
                                </span>
                              </div>
                              <div className="flex flex-col gap-2">
                                {isOpen ? (
                                  <button
                                    onClick={() => {
                                      setViewOnlyMode(false);
                                      setSelectedEventDate(event.eventDate);
                                      if (hasApplied && submission) {
                                        handleEdit(submission);
                                        setSVSFormExpanded(true);
                                      } else {
                                        setEditingId(null);
                                        setEditingSubmission(null);
                                        setSelectedSlots([]);
                                        setFormDate(event.eventDate);
                                        // 清空表單資料以防止舊事件數據被帶入新事件
                                        setFormData(prev => ({
                                          ...prev,
                                          slots: initializeSlots()
                                        }));
                                        setSVSFormExpanded(true);
                                      }
                                    }}
                                    className={`w-full px-4 py-2 rounded-lg font-semibold transition text-sm ${
                                      hasApplied
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                    }`}
                                  >
                                    {hasApplied ? t('editSubmission') : t('startRegistration')}
                                  </button>
                                ) : (
                                  hasApplied && submission ? (
                                    <button
                                      onClick={() => {
                                        setViewOnlyMode(true);
                                        setSelectedEventDate(event.eventDate);
                                        handleEdit(submission);
                                        setSVSFormExpanded(true);
                                      }}
                                      className="w-full px-4 py-2 rounded-lg font-semibold transition bg-slate-600 hover:bg-slate-500 text-white text-sm"
                                    >
                                      {t('viewSubmission')}
                                    </button>
                                  ) : null
                                )}
                                <button
                                  onClick={() => {
                                    setOfficerScheduleEventDate(event.eventDate);
                                    setShowOfficerSchedule(true);
                                  }}
                                  className="w-full px-4 py-2 rounded-lg font-semibold transition bg-purple-600 hover:bg-purple-700 text-white text-sm"
                                >
                                  📋 {t('officerSchedule')}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    
                    {/* 電腦版：表格式顯示 */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-600">
                            <th className="px-4 py-3 text-left text-slate-300 font-semibold">{t('eventDate')}</th>
                            <th className="px-4 py-3 text-center text-slate-300 font-semibold">{t('registrationStatus')}</th>
                            <th className="px-4 py-3 text-center text-slate-300 font-semibold">{t('action')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {events.length === 0 ? (
                            <tr className="border-b border-slate-700">
                              <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                                {t('noEventData')}
                              </td>
                            </tr>
                          ) : (
                            events.map(event => {
                              const hasApplied = hasSubmissionForEvent(event.eventDate);
                              const submission = submissions.find(s => s.eventDate === event.eventDate);
                              const isOpen = event.status === 'open';
                              
                              return (
                                <tr key={event.eventDate} className="border-b border-slate-700 hover:bg-slate-700/30 transition">
                                  <td className="px-4 py-4 text-white font-semibold">{event.eventDate}</td>
                                  <td className="px-4 py-4 text-center">
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getEventStatusStyle(event)}`}>
                                      {getEventStatusText(event)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2 flex-wrap">
                                      {isOpen ? (
                                        <button
                                          onClick={() => {
                                            setViewOnlyMode(false);
                                            setSelectedEventDate(event.eventDate);
                                            if (hasApplied && submission) {
                                              handleEdit(submission);
                                              setSVSFormExpanded(true);
                                            } else {
                                              setEditingId(null);
                                              setEditingSubmission(null);
                                              setSelectedSlots([]);
                                              setFormDate(event.eventDate);
                                              // 清空表單資料以防止舊事件數據被帶入新事件
                                              setFormData(prev => ({
                                                ...prev,
                                                slots: initializeSlots()
                                              }));
                                              setSVSFormExpanded(true);
                                            }
                                          }}
                                          className={`px-4 py-2 rounded-lg font-semibold transition ${
                                            hasApplied
                                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                              : 'bg-green-600 hover:bg-green-700 text-white'
                                          }`}
                                        >
                                          {hasApplied ? t('editSubmission') : t('startRegistration')}
                                        </button>
                                      ) : (
                                        hasApplied && submission ? (
                                          <button
                                            onClick={() => {
                                              setViewOnlyMode(true);
                                              setSelectedEventDate(event.eventDate);
                                              handleEdit(submission);
                                              setSVSFormExpanded(true);
                                            }}
                                            className="px-4 py-2 rounded-lg font-semibold transition bg-slate-600 hover:bg-slate-500 text-white"
                                          >
                                            {t('viewSubmission')}
                                          </button>
                                        ) : null
                                      )}
                                      <button
                                        onClick={() => {
                                          setOfficerScheduleEventDate(event.eventDate);
                                          setShowOfficerSchedule(true);
                                        }}
                                        className="px-4 py-2 rounded-lg font-semibold transition bg-purple-600 hover:bg-purple-700 text-white"
                                      >
                                        📋 {t('officerSchedule')}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* SVS 報名表單 */}
                {svsFormExpanded && (
                  <form onSubmit={viewOnlyMode ? (e) => e.preventDefault() : handleSubmit} className="space-y-6">
                    <div className="space-y-4 pt-4 border-t border-slate-600">
                      <h3 className="text-lg font-semibold text-white">
                        {viewOnlyMode ? t('viewSubmissions') : t('selectTimeslotsFillResources')}
                      </h3>
                      {!viewOnlyMode && <p className="text-slate-400 text-sm">{t('checkboxResourceNeeded')}</p>}

                      <div className={viewOnlyMode ? 'pointer-events-none opacity-80' : ''}>
                        {sortedDays.map((day) => renderSlotForm(day))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-slate-600">
                      {!viewOnlyMode && (
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Check size={18} />
                          {selectedEventDate && hasSubmissionForEvent(selectedEventDate) ? t('updateSubmission') : t('newSubmission')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSVSFormExpanded(false);
                          setViewOnlyMode(false);
                        }}
                        className={`${viewOnlyMode ? 'w-full' : 'flex-1'} py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition`}
                      >
                        {t('backToTable')}
                      </button>
                    </div>
                  </form>
                )}

                {svsFormExpanded && (
                  <div className="mt-6 pt-6 border-t border-slate-600">
                    <p className="text-slate-400 text-sm mb-3">
                      <span className="font-semibold">{t('tipPrefix')}</span>
                      {t('currentAllianceText')} <span className="text-green-300 font-semibold">{formData.alliance}</span>
                    </p>
                    {selectedEventDate && hasSubmissionForEvent(selectedEventDate) && (
                      <div className="bg-green-900/30 border border-green-600 rounded-lg p-3 text-green-300 text-sm">
                        {t('dataAlreadySubmitted')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : isSVSMapMode ? (
              // SVS 地圖分配模式
              <div className="bg-slate-800 rounded-xl sm:rounded-2xl shadow-2xl border border-slate-700 p-6 sm:p-8 md:p-10 w-full">
                <div className="mb-6 sm:mb-8">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                    <MapPin size={24} className="text-purple-400" />
                    {t('svsMapAllocation')}
                  </h2>
                </div>

                {selectedMap ? (
                  // 地圖詳情查看
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <button
                        onClick={() => setSelectedMap(null)}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition flex items-center gap-1 text-sm"
                      >
                        <ArrowLeft size={16} /> 返回列表
                      </button>
                      <h4 className="text-lg font-bold text-white">◆ {selectedMap.title}</h4>
                    </div>

                    {/* 聯盟統計 (上方) */}
                    {selectedMap.alliances && selectedMap.alliances.length > 0 && (
                      <div className="mb-6 bg-slate-700/30 rounded-lg p-4">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                          <BarChart3 size={18} className="text-purple-400" />
                          聯盟統計
                        </h3>
                        <div className="flex flex-wrap gap-4">
                          {selectedMap.alliances.map((alliance: any) => {
                            const count = Object.values(selectedMap.gridData || {}).filter((id: any) => id === alliance.id).length;
                            return (
                              <div key={alliance.id} className="flex items-center gap-3">
                                <div
                                  className="w-6 h-6 rounded flex-shrink-0"
                                  style={{ backgroundColor: alliance.color }}
                                />
                                <div className="flex flex-col">
                                  <span className="text-white font-semibold text-sm">{alliance.name}</span>
                                  <span className="text-purple-300 text-lg font-bold">{count} 個格子</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 操作按鈕 */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={downloadMapImage}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition text-sm"
                      >
                        <Download size={16} /> 下載圖片
                      </button>
                      <button
                        onClick={shareMapLink}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition text-sm"
                      >
                        <Share2 size={16} /> 分享連結
                      </button>
                    </div>

                    {/* 地圖顯示 (只讀) */}
                    <div className="flex justify-center items-center overflow-auto w-full" style={{ minHeight: '1000px', maxHeight: '95vh' }}>
                      <div
                        ref={mapViewRef}
                        style={{
                          width: Math.ceil(14 * 40 * Math.sqrt(2)),
                          height: Math.ceil(14 * 40 * Math.sqrt(2)),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#cbd5e1',
                          borderRadius: '16px',
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(14, 38px)`,
                            gridTemplateRows: `repeat(14, 38px)`,
                            gap: '2px',
                            transform: 'rotate(45deg)',
                          }}
                        >
                          {Array.from({ length: 14 * 14 }).map((_, idx) => {
                            const row = Math.floor(idx / 14);
                            const col = idx % 14;
                            const key = `${row}-${col}`;
                            const blocked = row >= 4 && row <= 9 && col >= 4 && col <= 9;
                            
                            const directionMap: Record<string, string> = {
                              '4-4': 'N', '4-9': 'E', '9-4': 'W', '9-9': 'S'
                            };
                            const direction = directionMap[key];
                            
                            if (direction) {
                              return (
                                <div
                                  key={key}
                                  className="flex items-center justify-center bg-slate-600 border-2 border-slate-500 rounded-sm"
                                  style={{ width: 38, height: 38 }}
                                >
                                  <span className="text-white font-bold text-sm" style={{ transform: 'rotate(-45deg)' }}>{direction}</span>
                                </div>
                              );
                            }
                            
                            if (blocked) {
                              return (
                                <div
                                  key={key}
                                  className="flex items-center justify-center bg-slate-800 border-2 border-slate-700 rounded-sm"
                                  style={{ width: 38, height: 38 }}
                                >
                                  <span className="text-slate-500 text-xs">✕</span>
                                </div>
                              );
                            }
                            
                            const allianceId = selectedMap.gridData?.[key];
                            const owner = selectedMap.gridOwners?.[key];
                            const alliance = selectedMap.alliances?.find((a: any) => a.id === allianceId);
                            const bgColor = alliance?.color || '#e2e8f0';
                            
                            return (
                              <div
                                key={key}
                                className="flex items-center justify-center border-2 rounded-sm cursor-pointer hover:scale-105 transition-transform duration-100"
                                style={{
                                  width: 38,
                                  height: 38,
                                  backgroundColor: bgColor,
                                  borderColor: alliance ? '#475569' : '#cbd5e1',
                                }}
                                onMouseEnter={(e) => {
                                  if (owner) {
                                    setTooltip({ text: owner, x: e.clientX, y: e.clientY });
                                  }
                                }}
                                onMouseLeave={() => setTooltip(null)}
                                onMouseMove={(e) => {
                                  if (owner && tooltip) {
                                    setTooltip({ ...tooltip, x: e.clientX, y: e.clientY });
                                  }
                                }}
                              >
                                {owner && (
                                  <span
                                    className="font-bold"
                                    style={{
                                      fontSize: '10px',
                                      color: '#000',
                                      transform: 'rotate(-45deg)',
                                      textShadow: '0 0 2px white, 0 0 2px white',
                                      textAlign: 'center',
                                      lineHeight: '1.1',
                                      maxWidth: '36px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {owner}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Tooltip */}
                      {tooltip && (
                        <div
                          style={{
                            position: 'fixed',
                            left: `${tooltip.x + 10}px`,
                            top: `${tooltip.y + 10}px`,
                            backgroundColor: '#1f2937',
                            color: '#fff',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            border: '1px solid #4b5563',
                            zIndex: 1000,
                            pointerEvents: 'none',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                          }}
                        >
                          {tooltip.text}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // 地圖列表
                  <div>
                    {loadingMaps ? (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw className="animate-spin text-purple-400" size={32} />
                      </div>
                    ) : openMaps.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="text-6xl mb-4">📭</div>
                        <h4 className="text-xl font-bold text-white mb-2">目前沒有開放的地圖</h4>
                        <p className="text-slate-400 text-center">請等待管理員發布地圖</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {openMaps.map((map: any) => (
                          <button
                            key={map.id}
                            onClick={() => loadMapDetail(map.id)}
                            className="w-full bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg p-4 text-left transition"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-white font-bold text-lg">◆ {map.title}</h4>
                                <p className="text-slate-400 text-sm">
                                  建立時間: {new Date(map.createdAt).toLocaleDateString('zh-TW')}
                                </p>
                              </div>
                              <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs font-semibold rounded">
                                開放中
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* 原始報名表單 */}
                {showForm && (
                  <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8">
                    <h2 className="text-2xl font-bold text-white mb-6">
                      {editingId ? t('editSubmission') : t('newSubmission')}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                          {t('gameIdLabel_form')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.gameId}
                          disabled
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-400 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                          {t('gameNameLabel_form')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.playerName}
                          disabled
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-400 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                          {t('allianceLabel_form')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.alliance}
                          onChange={handleAllianceChange}
                          placeholder={t('enterAllianceName_form')}
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                          required
                        />
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-600">
                        <h3 className="text-lg font-semibold text-white">{t('selectTimeslotsFillResources')}</h3>
                        <p className="text-slate-400 text-sm">{t('checkboxResourceNeeded')}</p>

                        {sortedDays.map((day) => renderSlotForm(day))}
                      </div>

                      <div className="flex gap-3 pt-6 border-t border-slate-600">
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Check size={18} />
                          {editingId ? t('updateSubmission') : t('newSubmission')}
                        </button>
                        {editingId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setShowForm(false);
                            }}
                            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
                          >
                            {t('cancelButton')}
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Submission Confirmation Modal */}
      {showConfirmModal && confirmData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-6 max-w-2xl w-full my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">
                {confirmData.isEditing ? t('editConfirmationTitle') : t('submitConfirmationTitle')}
              </h3>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmData(null);
                }}
                className="p-1 text-slate-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6 max-h-96 overflow-y-auto">
              {/* 基本信息 */}
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase">{t('basicInfoSection')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400">{t('gameIdLabel_form')}</p>
                    <p className="text-white font-semibold">{confirmData.gameId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">{t('gameNameLabel_form')}</p>
                    <p className="text-white font-semibold">{confirmData.playerName}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-400">{t('allianceLabel_form')}</p>
                    <p className="text-white font-semibold">{confirmData.alliance || t('unselectedText')}</p>
                  </div>
                </div>
              </div>

              {/* 時間槽位 */}
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <h4 className="text-sm font-semibold text-slate-300 mb-3 uppercase">{t('submissionTimeslotsSection')}</h4>
                <div className="space-y-3">
                  {Object.entries(confirmData.slots).map(([day, slot]: [string, any]) => (
                    <div key={day} className="border-l-2 border-blue-500 pl-3">
                      <p className="text-xs text-slate-400 uppercase mb-1">
                        {day === 'tuesday' ? t('tuesday') : day === 'thursday' ? t('thursday') : t('friday')}
                      </p>
                      {slot.timeSlots && slot.timeSlots.length > 0 ? (
                        <div className="space-y-1">
                          {slot.timeSlots.map((ts: any, idx: number) => (
                            <p key={idx} className="text-white text-sm">
                              {normalizeTimeString(ts.start)} - {normalizeTimeString(ts.end)}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 text-sm">{t('unselectedText')}</p>
                      )}
                      
                      {/* 加速 */}
                      {(slot.researchAccel?.days || slot.researchAccel?.hours || slot.researchAccel?.minutes) && (
                        <div className="mt-2 text-xs text-cyan-400">
                          {t('researchAccelerationLabel')}: {slot.researchAccel.days}{t('accelerationTime_days')} {slot.researchAccel.hours}{t('accelerationTime_hours')} {slot.researchAccel.minutes}{t('accelerationTime_minutes')}
                        </div>
                      )}
                      {(slot.generalAccel?.days || slot.generalAccel?.hours || slot.generalAccel?.minutes) && (
                        <div className="text-xs text-purple-400">
                          {t('buildingAccelerationLabel')}: {slot.generalAccel.days}{t('accelerationTime_days')} {slot.generalAccel.hours}{t('accelerationTime_hours')} {slot.generalAccel.minutes}{t('accelerationTime_minutes')}
                        </div>
                      )}
                      
                      {/* T11升級 & 火晶微粒 */}
                      {slot.upgradeT11 && (
                        <div className="mt-1 text-xs text-green-400">
                          ✓ {t('t11UpgradeAccelLabel')}
                          {slot.fireSparkleCount > 0 && (
                            <span className="ml-2 text-pink-400">{t('fireSparkleParticles')}: {slot.fireSparkleCount}</span>
                          )}
                        </div>
                      )}
                      
                      {/* 火晶餘燼 (訓練官) */}
                      {!slot.upgradeT11 && slot.fireSparkleCount > 0 && (
                        <div className="mt-1 text-xs text-orange-400">
                          {t('fireSparkleAshLabel')}: {slot.fireSparkleCount}
                        </div>
                      )}
                      
                      {/* 火晶石 (建設官) */}
                      {slot.fireGemCount > 0 && (
                        <div className="mt-1 text-xs text-red-400">
                          {t('fireGemStones')}: {slot.fireGemCount}
                        </div>
                      )}
                      {slot.refinedFireGemCount > 0 && (
                        <div className="text-xs text-purple-400">
                          {t('refinedFireGemStones')}: {slot.refinedFireGemCount}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-3 pt-6 border-t border-slate-700 mt-6">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmData(null);
                }}
                disabled={loading}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700 disabled:opacity-50 text-white font-semibold rounded-lg transition"
              >
                {t('cancelButton')}
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={loading}
                className="flex-1 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:from-green-700 disabled:to-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    {t('submittingText')}
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    {t('confirmSubmitText')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alliance Edit Modal */}
      {showAllianceEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">{t('editAllianceTitle')}</h3>
              <button
                onClick={() => {
                  setShowAllianceEdit(false);
                  setTempAlliance(formData.alliance);
                  setEditCustomAlliance('');
                  setEditShowCustomInput(false);
                  setAllianceError('');
                }}
                className="p-1 text-slate-400 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <select
                  value={tempAlliance}
                  onChange={(e) => {
                    const selected = e.target.value;
                    setTempAlliance(selected);
                    if (selected === t('custom')) {
                      setEditShowCustomInput(true);
                      setAllianceError('');
                    } else {
                      setEditShowCustomInput(false);
                      setEditCustomAlliance('');
                      setAllianceError('');
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                >
                  <option value="">{t('selectAllianceDropdown')}</option>
                  {allianceList.map(alliance => (
                    <option key={alliance} value={alliance}>{alliance}</option>
                  ))}
                  <option value={t('custom')}>{t('custom')}</option>
                </select>
              </div>

              {editShowCustomInput && (
                <div>
                  <input
                    type="text"
                    maxLength={3}
                    value={editCustomAlliance}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditCustomAlliance(val);
                      if (val) {
                        const error = validateAllianceName(val);
                        setAllianceError(error);
                      } else {
                        setAllianceError('');
                      }
                    }}
                    placeholder={t('enter3CharAlphanum')}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                  {allianceError && (
                    <p className="text-red-400 text-sm mt-2">{allianceError}</p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAllianceSave}
                  className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-lg transition"
                >
                  {t('save')}
                </button>
                <button
                  onClick={() => {
                    setTempAlliance(formData.alliance);
                    setShowAllianceEdit(false);
                    setEditCustomAlliance('');
                    setEditShowCustomInput(false);
                    setAllianceError('');
                  }}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
                >
                  {t('cancelButton')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Sub-Account Modal */}
      {showAddAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UserPlus size={20} className="text-blue-400" />
                <h3 className="text-xl font-bold text-white">{t('addAccountTitle')}</h3>
              </div>
              <button
                onClick={() => {
                  setShowAddAccountModal(false);
                  setNewAccountGameId('');
                }}
                className="p-1 text-slate-400 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">{t('gameIdInputLabel')}</label>
                <input
                  type="text"
                  value={newAccountGameId}
                  onChange={(e) => setNewAccountGameId(e.target.value)}
                  placeholder={t('gameIdPlaceholder')}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>

              <div className="p-3 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400">
                  {t('accountPassword_tip')}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddSubAccount}
                  disabled={addingAccount || !newAccountGameId.trim()}
                  className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingAccount ? t('completing') : t('confirmAddPlayerButton')}
                </button>
                <button
                  onClick={() => {
                    setShowAddAccountModal(false);
                    setNewAccountGameId('');
                  }}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
                >
                  {t('cancelButton')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SVS 聯盟地圖分配 */}
      {showSVSMapAlloc && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-auto">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-4 sm:p-6 w-full max-w-4xl max-h-[95vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin size={24} className="text-purple-400" />
                <h3 className="text-xl sm:text-2xl font-bold text-white">{t('svsMapAllocation')}</h3>
              </div>
              <button
                onClick={() => {
                  setShowSVSMapAlloc(false);
                  setSelectedMap(null);
                }}
                className="p-1 text-slate-400 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            {selectedMap ? (
              // 地圖詳情查看
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => setSelectedMap(null)}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition flex items-center gap-1"
                  >
                    <ArrowLeft size={16} /> 返回列表
                  </button>
                  <h4 className="text-lg font-bold text-white">◆ {selectedMap.title}</h4>
                </div>

                {/* 操作按鈕 */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={downloadMapImage}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition text-sm"
                  >
                    <Download size={16} /> 下載圖片
                  </button>
                  <button
                    onClick={shareMapLink}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition text-sm"
                  >
                    <Share2 size={16} /> 分享連結
                  </button>
                </div>

                {/* 地圖顯示 (只讀) */}
                <div className="flex justify-center">
                  <div
                    ref={mapViewRef}
                    style={{
                      width: Math.ceil(14 * 40 * Math.sqrt(2)),
                      height: Math.ceil(14 * 40 * Math.sqrt(2)),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#cbd5e1',
                      borderRadius: '16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(14, 38px)`,
                        gridTemplateRows: `repeat(14, 38px)`,
                        gap: '2px',
                        transform: 'rotate(45deg)',
                      }}
                    >
                      {Array.from({ length: 14 * 14 }).map((_, idx) => {
                        const row = Math.floor(idx / 14);
                        const col = idx % 14;
                        const key = `${row}-${col}`;
                        const blocked = row >= 4 && row <= 9 && col >= 4 && col <= 9;
                        
                        // 方向格子
                        const directionMap: Record<string, string> = {
                          '4-4': 'N', '4-9': 'E', '9-4': 'W', '9-9': 'S'
                        };
                        const direction = directionMap[key];
                        
                        if (direction) {
                          return (
                            <div
                              key={key}
                              className="flex items-center justify-center bg-slate-600 border-2 border-slate-500 rounded-sm"
                              style={{ width: 38, height: 38 }}
                            >
                              <span className="text-white font-bold text-sm" style={{ transform: 'rotate(-45deg)' }}>{direction}</span>
                            </div>
                          );
                        }
                        
                        if (blocked) {
                          return (
                            <div
                              key={key}
                              className="flex items-center justify-center bg-slate-800 border-2 border-slate-700 rounded-sm"
                              style={{ width: 38, height: 38 }}
                            >
                              <span className="text-slate-500 text-xs">✕</span>
                            </div>
                          );
                        }
                        
                        const allianceId = selectedMap.gridData?.[key];
                        const owner = selectedMap.gridOwners?.[key];
                        const alliance = selectedMap.alliances?.find((a: any) => a.id === allianceId);
                        const bgColor = alliance?.color || '#e2e8f0';
                        
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-center border-2 rounded-sm"
                            style={{
                              width: 38,
                              height: 38,
                              backgroundColor: bgColor,
                              borderColor: allianceId ? '#475569' : '#94a3b8',
                            }}
                          >
                            {owner && (
                              <span
                                className="text-[10px] text-black font-bold text-center leading-tight"
                                style={{ transform: 'rotate(-45deg)', textShadow: '0 0 2px rgba(255,255,255,0.9)' }}
                              >
                                {owner}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 聯盟統計 */}
                {selectedMap.alliances && selectedMap.alliances.length > 0 && (
                  <div className="mt-4 bg-slate-700/50 rounded-lg p-4">
                    <h5 className="text-white font-semibold mb-2">聯盟統計</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {selectedMap.alliances.map((alliance: any) => {
                        const count = Object.values(selectedMap.gridData || {}).filter((id: any) => id === alliance.id).length;
                        return (
                          <div key={alliance.id} className="flex items-center gap-2 bg-slate-600/50 rounded px-2 py-1">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: alliance.color }}
                            />
                            <span className="text-white text-sm">{alliance.name}</span>
                            <span className="text-slate-400 text-xs ml-auto">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // 地圖列表
              <div>
                {loadingMaps ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="animate-spin text-purple-400" size={32} />
                  </div>
                ) : openMaps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="text-6xl mb-4">📭</div>
                    <h4 className="text-xl font-bold text-white mb-2">目前沒有開放的地圖</h4>
                    <p className="text-slate-400 text-center">請等待管理員發布地圖</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {openMaps.map((map: any) => (
                      <button
                        key={map.id}
                        onClick={() => loadMapDetail(map.id)}
                        className="w-full bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg p-4 text-left transition"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-white font-bold text-lg">◆ {map.title}</h4>
                            <p className="text-slate-400 text-sm">
                              建立時間: {new Date(map.createdAt).toLocaleDateString('zh-TW')}
                            </p>
                          </div>
                          <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs font-semibold rounded">
                            開放中
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SVS 移民名單推薦 - 頁面建置中 */}
      {showSVSImmigrant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8 max-w-sm w-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users size={24} className="text-cyan-400" />
                <h3 className="text-2xl font-bold text-white">{t('immigrationListRecommendation')}</h3>
              </div>
              <button
                onClick={() => setShowSVSImmigrant(false)}
                className="p-1 text-slate-400 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">🔨</div>
              <h4 className="text-xl font-bold text-white mb-2">{t('pageUnderConstruction')}</h4>
              <p className="text-slate-400 text-center">{t('featureUnderDevelopment')}</p>
            </div>

            <button
              onClick={() => setShowSVSImmigrant(false)}
              className="w-full mt-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
            >
              {t('closeButton')}
            </button>
          </div>
        </div>
      )}

      {/* 官職排序查看 Modal */}
      {showOfficerSchedule && (
        <OfficerScheduleModal 
          onClose={() => setShowOfficerSchedule(false)}
          eventDate={officerScheduleEventDate}
          currentUserGameId={user.gameId}
        />
      )}

      {/* 帳號綁定 Modal */}
      <AccountBindingModal 
        isOpen={showBindingModal}
        onClose={() => setShowBindingModal(false)}
        onSuccess={() => {
          setShowBindingModal(false);
          loadLinkedAccounts();
        }}
      />

      {/* 變更密碼 Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Key size={20} className="text-amber-400" />
                <h3 className="text-xl font-bold text-white">{t('changePasswordTitle')}</h3>
              </div>
              <button
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setCurrentPassword('');
                  setNewPasswordInput('');
                  setConfirmNewPassword('');
                }}
                className="p-1 text-slate-400 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">{t('currentPassword')}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder={t('currentPassword')}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">{t('newPassword')}</label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder={t('newPassword')}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                />
                <p className="text-xs text-slate-500 mt-1">{t('passwordMinLength')}</p>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">{t('confirmNewPassword')}</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder={t('confirmNewPassword')}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !currentPassword || !newPasswordInput || !confirmNewPassword}
                  className="flex-1 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changingPassword ? t('processing') : t('confirmResetPassword')}
                </button>
                <button
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setCurrentPassword('');
                    setNewPasswordInput('');
                    setConfirmNewPassword('');
                  }}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
                >
                  {t('cancelButton')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 官職排序查看組件
const OfficerScheduleModal: React.FC<{ onClose: () => void; eventDate: string; currentUserGameId: string }> = ({ onClose, eventDate, currentUserGameId }) => {
  const { t } = useI18n();
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'research' | 'training' | 'building'>('research');
  const [utcOffset, setUtcOffset] = useState('00:00');
  const [showOnlyEmpty, setShowOnlyEmpty] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareModal, setShareModal] = useState<{ show: boolean; url: string; title: string; text: string } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSchedule();
  }, [eventDate]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      console.log('Loading officer schedule for date:', eventDate);
      // 從 OfficerConfigService 獲取官職排序資料
      const data = await OfficerConfigService.getAssignments(eventDate);
      console.log('Officer schedule data:', data);
      if (data && Object.keys(data).length > 0) {
        setScheduleData(data);
        if (data.research_utcOffset) {
          setUtcOffset(data.research_utcOffset);
        }
      } else {
        console.log('No officer schedule data found');
        setScheduleData(null);
      }
    } catch (error) {
      console.error('載入官職排序失敗:', error);
      setScheduleData(null);
    } finally {
      setLoading(false);
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
      });
    }
    return slots;
  };

  const getTabLabel = (tab: string) => {
    switch(tab) {
      case 'research': return t('researchAccel');
      case 'training': return t('trainingTabLabel');
      case 'building': return t('buildingTabLabel');
      default: return tab;
    }
  };

  const getTabDay = (tab: string) => {
    switch(tab) {
      case 'research': return t('tuesday');
      case 'training': return t('thursday');
      case 'building': return t('friday');
      default: return '';
    }
  };

  const timeSlots = generateTimeSlots();
  const key = `${activeTab}_slots`;
  const slots = scheduleData?.[key] || [];

  // 找到當前用戶被排定的時段
  const findMySlot = () => {
    for (let idx = 0; idx < slots.length; idx++) {
      const slot = slots[idx];
      if (slot?.players?.length > 0) {
        const player = slot.players[0];
        if (player.gameId === currentUserGameId || player.id === currentUserGameId) {
          const ts = timeSlots[idx];
          const twStartHour = (ts.hour + 8) % 24;
          const twStartMin = ts.minute;
          const twEndMin = (ts.minute + 30) % 60;
          const twEndHour = (twStartHour + (ts.minute + 30 >= 60 ? 1 : 0)) % 24;
          return {
            idx,
            utcTime: `${String(ts.hour).padStart(2, '0')}:${String(ts.minute).padStart(2, '0')}~${String((ts.hour + (ts.minute + 30 >= 60 ? 1 : 0)) % 24).padStart(2, '0')}:${String((ts.minute + 30) % 60).padStart(2, '0')}`,
            twTime: `${String(twStartHour).padStart(2, '0')}:${String(twStartMin).padStart(2, '0')}~${String(twEndHour).padStart(2, '0')}:${String(twEndMin).padStart(2, '0')}`
          };
        }
      }
    }
    return null;
  };

  const mySlot = findMySlot();

  // 計算空閒時段
  const getEmptySlots = () => {
    return timeSlots.map((ts, idx) => {
      const slot = slots[idx];
      const hasPlayer = slot?.players?.length > 0;
      const twStartHour = (ts.hour + 8) % 24;
      const twStartMin = ts.minute;
      const twEndMin = (ts.minute + 30) % 60;
      const twEndHour = (twStartHour + (ts.minute + 30 >= 60 ? 1 : 0)) % 24;
      return {
        idx,
        isEmpty: !hasPlayer,
        utcTime: `${String(ts.hour).padStart(2, '0')}:${String(ts.minute).padStart(2, '0')}~${String((ts.hour + (ts.minute + 30 >= 60 ? 1 : 0)) % 24).padStart(2, '0')}:${String((ts.minute + 30) % 60).padStart(2, '0')}`,
        twTime: `${String(twStartHour).padStart(2, '0')}:${String(twStartMin).padStart(2, '0')}~${String(twEndHour).padStart(2, '0')}:${String(twEndMin).padStart(2, '0')}`,
        player: hasPlayer ? slot.players[0] : null,
      };
    });
  };

  const allSlotsInfo = getEmptySlots();
  const emptySlots = allSlotsInfo.filter(s => s.isEmpty);
  const totalSlots = allSlotsInfo.length;
  const emptyCount = emptySlots.length;
  const assignedCount = totalSlots - emptyCount;

  // 複製空閒時段
  const copyEmptySlots = async () => {
    const tabName = getTabLabel(activeTab);
    const dayName = getTabDay(activeTab);
    const lines = emptySlots.map(s => `UTC ${s.utcTime} (台灣時間：${s.twTime})`);
    const text = `【${tabName}】${dayName} 空閒時段\n場次：${eventDate}\n\n${lines.join('\n')}`;
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
    const tabName = getTabLabel(activeTab);
    const dayName = getTabDay(activeTab);
    const lines = allSlotsInfo.map(s => {
      const status = s.isEmpty ? '🟢 空閒' : '✅ 已排';
      const playerInfo = s.player ? ` - ${s.player.playerName}` : '';
      return `UTC ${s.utcTime} (台灣時間：${s.twTime}) ${status}${playerInfo}`;
    });
    const text = `【${tabName}】${dayName} 全部時段\n場次：${eventDate}\n\n${lines.join('\n')}`;
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
      date: eventDate,
      type: activeTab,
      showEmpty: onlyEmpty.toString(),
    });
    return `${baseUrl}/officers?${params.toString()}`;
  };

  // 分享功能 - 顯示彈窗
  const shareSlots = (onlyEmpty: boolean) => {
    const tabName = getTabLabel(activeTab);
    const dayName = getTabDay(activeTab);
    const slotsToShare = onlyEmpty ? emptySlots : allSlotsInfo;
    const title = onlyEmpty ? `${tabName} 空閒時段` : `${tabName} 全部時段`;
    const shareUrl = getShareUrl(onlyEmpty);
    
    const lines = slotsToShare.map(s => {
      if (onlyEmpty) {
        return `UTC ${s.utcTime} (台灣時間：${s.twTime})`;
      } else {
        const status = s.isEmpty ? '🟢 空閒' : '✅ 已排';
        const playerInfo = s.player ? ` - ${s.player.playerName}` : '';
        return `UTC ${s.utcTime} (台灣時間：${s.twTime}) ${status}${playerInfo}`;
      }
    });
    
    const text = `【${title}】${dayName}\n場次：${eventDate}\n\n${lines.join('\n')}`;

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

  const scrollToMySlot = () => {
    if (mySlot && listRef.current) {
      const element = listRef.current.querySelector(`[data-slot-idx="${mySlot.idx}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 添加高亮效果
        element.classList.add('ring-2', 'ring-yellow-400');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-yellow-400');
        }, 2000);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-slate-800 rounded-xl sm:rounded-2xl shadow-2xl border border-slate-700 p-4 sm:p-6 max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">📋</span>
            <h3 className="text-base sm:text-xl font-bold text-white">官職排序 - {eventDate}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition"
          >
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* 說明文字 */}
        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-amber-900/30 border border-amber-600/50 rounded-lg">
          <p className="text-amber-200 text-xs sm:text-sm">
            {t('scheduleWarning')}
          </p>
        </div>

        {/* 分頁切換 */}
        <div className="flex gap-1 sm:gap-2 mb-3 sm:mb-4">
          {(['research', 'training', 'building'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 sm:flex-none px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold transition text-xs sm:text-sm whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <span className="hidden sm:inline">{getTabLabel(tab)} ({getTabDay(tab)})</span>
              <span className="sm:hidden">{getTabLabel(tab)}</span>
            </button>
          ))}
        </div>

        {/* 統計與功能按鈕 */}
        {!loading && scheduleData && (
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
            {/* 統計資訊 */}
            <div className="flex items-center gap-3 mb-2 text-xs sm:text-sm">
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
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-semibold rounded transition flex items-center gap-1 ${
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
                className="px-2 sm:px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded transition flex items-center gap-1"
              >
                <span>📋</span>
                <span>複製空閒</span>
              </button>
              <button
                onClick={copyAllSlots}
                className="px-2 sm:px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-semibold rounded transition flex items-center gap-1"
              >
                <span>📋</span>
                <span>複製全部</span>
              </button>
              <button
                onClick={() => shareSlots(true)}
                className="px-2 sm:px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs sm:text-sm font-semibold rounded transition flex items-center gap-1"
              >
                <span>📤</span>
                <span>分享空閒</span>
              </button>
              <button
                onClick={() => shareSlots(false)}
                className="px-2 sm:px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded transition flex items-center gap-1"
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
        )}

        {/* 我的排定時段 */}
        {!loading && scheduleData && mySlot && (
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-teal-900/50 border border-teal-500 rounded-lg flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎯</span>
              <div className="text-xs sm:text-sm">
                <span className="text-teal-200">{t('currentlyAssignedTo')} </span>
                <span className="text-white font-bold">UTC {mySlot.utcTime}</span>
                <span className="text-slate-400 text-[10px] sm:text-xs ml-1">({t('taiwanTimePrefix')} {mySlot.twTime})</span>
              </div>
            </div>
            <button
              onClick={scrollToMySlot}
              className="px-2 sm:px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-semibold rounded transition flex-shrink-0"
            >
              查看
            </button>
          </div>
        )}

        {/* 時段列表 - 與管理員後台相同的顯示方式 */}
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-400">載入中...</div>
            </div>
          ) : !scheduleData ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-slate-400">尚無官職排序資料</p>
            </div>
          ) : (
            <div className="space-y-2">
              {timeSlots
                .map((ts, idx) => ({ ts, idx }))
                .filter(({ idx }) => {
                  if (!showOnlyEmpty) return true;
                  const slot = slots[idx];
                  return !(slot?.players?.length > 0);
                })
                .map(({ ts, idx }) => {
                const slot = slots[idx];
                const hasPlayer = slot?.players?.length > 0;
                const player = hasPlayer ? slot.players[0] : null;
                
                // 計算台灣時間 (UTC+8)
                const twStartHour = (ts.hour + 8) % 24;
                const twStartMin = ts.minute;
                const twEndMin = (ts.minute + 30) % 60;
                const twEndHour = (twStartHour + (ts.minute + 30 >= 60 ? 1 : 0)) % 24;
                
                const isMySlot = mySlot && mySlot.idx === idx;
                
                return (
                  <div
                    key={idx}
                    data-slot-idx={idx}
                    className={`min-h-12 sm:min-h-14 rounded-lg border p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 transition-all ${
                      isMySlot
                        ? 'bg-yellow-900/40 border-yellow-500'
                        : hasPlayer
                        ? 'bg-teal-900/40 border-teal-600'
                        : 'bg-slate-700/50 border-slate-600'
                    }`}
                  >
                    {/* 時間顯示 */}
                    <div className="text-[10px] sm:text-xs font-semibold text-slate-300 sm:w-44 flex-shrink-0">
                      {isMySlot ? <span className="mr-1">⭐</span> : hasPlayer && <span className="mr-1">✅</span>}
                      <span className="text-slate-400">
                        UTC {String(ts.hour).padStart(2, '0')}:{String(ts.minute).padStart(2, '0')}~
                        {String((ts.hour + (ts.minute + 30 >= 60 ? 1 : 0)) % 24).padStart(2, '0')}:{String((ts.minute + 30) % 60).padStart(2, '0')}
                      </span>
                      <span className="hidden sm:inline"><br /></span>
                      <span className="sm:hidden"> | </span>
                      <span className="text-slate-300">
                        {t('taiwanTimePrefix')} {String(twStartHour).padStart(2, '0')}:{String(twStartMin).padStart(2, '0')}~
                        {String(twEndHour).padStart(2, '0')}:{String(twEndMin).padStart(2, '0')}
                      </span>
                    </div>
                    
                    {/* 玩家資訊 */}
                    <div className="flex-1">
                      {hasPlayer ? (
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
                        <span className="text-slate-500 text-xs sm:text-sm">{t('notAssigned')}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 sm:mt-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition text-sm sm:text-base"
        >
          關閉
        </button>

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

export default RegistrationForm;
