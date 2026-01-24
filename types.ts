export interface Player {
  fid: string;
  nickname: string;
  kid: number;
  stove_lv: number;
  stove_lv_content: string;
  avatar_image: string;
  total_recharge_amount?: number;
  lastUpdated?: number;
}

export interface PlayerColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select';
}

export interface GroupPlayer extends Player {
  customData: Record<string, string>;
}

export interface PlayerGroup {
  id: string;
  name: string;
  columns: PlayerColumn[];
  players: GroupPlayer[];
}

export interface ImportStatus {
  total: number;
  current: number;
  success: number;
  failed: number;
  failedIds: string[];
  isImporting: boolean;
}

export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

// Auth & Form types
export interface User {
  id: string;
  fid?: string;
  gameId: string;
  nickname?: string;
  passwordHash?: string;
  allianceName?: string;
  allianceId?: string;
  avatarImage?: string;
  stoveLv?: number;
  kid?: number;
  createdAt?: number;
  isAdmin?: boolean; // 是否為管理員
}

export interface SlotSubmission {
  checked: boolean;
  researchAccel: { days: number; hours: number; minutes: number };
  generalAccel: { days: number; hours: number; minutes: number };
  upgradeT11: boolean;
  fireSparkleCount?: number;
  fireGemCount?: number;
  refinedFireGemCount?: number;
  timeSlots: Array<{ start: string; end: string }>;
}

export interface FormSubmission {
  id: string;
  userId: string;
  fid: string;
  gameId: string;
  playerName: string;
  alliance: string;
  eventDate?: string; // 報名的場次日期
  slots: {
    tuesday?: SlotSubmission;
    thursday?: SlotSubmission;
    friday?: SlotSubmission;
  };
  submittedAt: number;
  user?: {
    gameId?: string;
    nickname?: string;
    allianceName?: string;
    avatarImage?: string;
    stoveLv?: number;
  };
}

export interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
}

// 活動類型定義
export type ActivityType = 'research' | 'training' | 'building' | 'none';

export interface ActivityTypeConfig {
  type: ActivityType;
  name: string;
  emoji: string;
  researchLabel?: string;
  generalLabel?: string;
}

// 預設活動類型配置
export const ACTIVITY_TYPES: Record<ActivityType, ActivityTypeConfig> = {
  none: {
    type: 'none',
    name: '無',
    emoji: '⊘',
    researchLabel: '',
    generalLabel: ''
  },
  research: {
    type: 'research',
    name: '研究科技增益',
    emoji: '🔬',
    researchLabel: '研究加速',
    generalLabel: '通用加速（填寫預計使用在科技加速）'
  },
  training: {
    type: 'training',
    name: '士兵訓練增益',
    emoji: '🎖️',
    researchLabel: '士兵訓練加速',
    generalLabel: '通用加速（填寫預計使用在訓練士兵加速）'
  },
  building: {
    type: 'building',
    name: '建築訓練增益',
    emoji: '🏗️',
    researchLabel: '建築訓練加速',
    generalLabel: '通用加速（填寫預計使用在訓練建築加速）'
  }
};

// 預設每週活動配置
export const DEFAULT_DAY_CONFIG: Record<string, ActivityType> = {
  monday: 'none',
  tuesday: 'none',
  wednesday: 'none',
  thursday: 'none',
  friday: 'none',
  saturday: 'none',
  sunday: 'none'
};

// 事件（場次）類型
export interface GameEvent {
  id: string;
  eventDate: string;
  title?: string;
  registrationStart: string;
  registrationEnd: string;
  description?: string;
  status: 'open' | 'closed' | 'disabled';
  dayConfig?: Record<string, ActivityType>;
  createdAt: string;
  updatedAt: string;
}