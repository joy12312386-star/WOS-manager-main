// API endpoint - use api-proxy.php for production, localhost for development
const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api'
  : '';
const API_PROXY = '/api-proxy.php?path=';
const TOKEN_KEY = 'wos_token';
const USER_KEY = 'wos_user';

// Helper to construct API URL
function getApiUrl(endpoint: string): string {
  if (API_URL) {
    return `${API_URL}${endpoint}`;
  }
  return `${API_PROXY}${endpoint.substring(1)}`;
}

export interface User {
  id: string;
  gameId: string;
  allianceName?: string;
  allianceId?: string;
  isAdmin?: boolean;
  managedAlliances?: string[] | null;
  canAssignOfficers?: boolean;
  canManageEvents?: boolean;
}

export interface LinkedAccount {
  id: string;
  gameId: string;
  nickname?: string;
  allianceName?: string;
  avatarImage?: string;
  stoveLv?: number;
  isAdmin?: boolean;
  isParent?: boolean;
}

export class AuthService {
  // 清除所有本地存储数据
  static clearAllData(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('wos_users');
    localStorage.removeItem('wos_current_user');
    localStorage.removeItem('wos_admin_ids');
    localStorage.removeItem('wos_submissions');
    localStorage.removeItem('wos_officers');
  }

  // 检查用户是否已注册
  static async userExists(gameId: string): Promise<boolean> {
    try {
      const response = await fetch(getApiUrl(`/auth/check-user/${gameId}`));
      if (!response.ok) throw new Error('Failed to check user');
      const data = await response.json();
      return data.exists;
    } catch (error) {
      console.error('Error checking user:', error);
      // 當 API 失敗時拋出錯誤，而不是返回 false（避免誤判為新用戶）
      throw new Error('無法連接伺服器，請檢查網路連接');
    }
  }

  // 登入
  static async login(gameId: string, password: string): Promise<User | null> {
    try {
      const response = await fetch(getApiUrl(`/auth/login`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      console.log('✅ Login response data.user:', data.user);
      
      // 保存 token 和用户信息
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      console.log('✅ Saved to localStorage - USER_KEY:', JSON.stringify(data.user));

      return data.user;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  }

  // 注册
  static async register(
    gameId: string, 
    password: string, 
    allianceName: string,
    playerData?: {
      nickname?: string;
      kid?: number;
      stoveLv?: number;
      avatarImage?: string;
    }
  ): Promise<User | null> {
    try {
      const response = await fetch(getApiUrl(`/auth/register`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, password, allianceName, playerData })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data = await response.json();
      
      // 保存 token 和用户信息
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      return data.user;
    } catch (error) {
      console.error('Registration error:', error);
      return null;
    }
  }

  static getCurrentUser(): User | null {
    const stored = localStorage.getItem(USER_KEY);
    const user = stored ? JSON.parse(stored) : null;
    console.log('📦 getCurrentUser from localStorage:', user);
    return user;
  }

  // 從伺服器刷新用戶資料（包括 isAdmin 狀態）
  static async refreshUserData(): Promise<User | null> {
    try {
      const token = this.getToken();
      if (!token) return null;

      console.log('🔄 refreshUserData - 從伺服器刷新用戶資料');
      const response = await fetch(getApiUrl(`/auth/me`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('🔄 refreshUserData - response status:', response.status);
      if (!response.ok) {
        console.warn('🔄 refreshUserData - response not ok, returning null');
        // Token 無效時清除本地資料
        if (response.status === 401) {
          console.warn('🔄 refreshUserData - Token 無效，執行登出');
          this.logout();
        }
        return null;
      }

      const serverUser = await response.json();
      console.log('🔄 refreshUserData - serverUser from API:', serverUser);
      
      // 檢查是否有錯誤回應（例如 token 無效）
      if (serverUser && serverUser.error) {
        console.warn('🔄 refreshUserData - API 回傳錯誤:', serverUser.error);
        // Token 無效時清除本地資料
        if (serverUser.error === 'Invalid token' || serverUser.error === 'Token expired') {
          console.warn('🔄 refreshUserData - Token 無效，執行登出');
          this.logout();
        }
        return null;
      }
      
      // 更新本地存儲的用戶資料
      const currentUser = this.getCurrentUser();
      if (currentUser && serverUser) {
        const updatedUser = { 
          ...currentUser, 
          isAdmin: serverUser.isAdmin,
          allianceName: serverUser.allianceName || currentUser.allianceName,
          nickname: serverUser.nickname || currentUser.nickname,
          managedAlliances: serverUser.managedAlliances,
          canAssignOfficers: serverUser.canAssignOfficers,
          canManageEvents: serverUser.canManageEvents,
        };
        console.log('🔄 refreshUserData - updatedUser:', updatedUser);
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        return updatedUser;
      }
      console.log('🔄 refreshUserData - returning serverUser directly:', serverUser);
      return serverUser;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return null;
    }
  }

  // 更新用戶資料（包括聯盟）
  static async updateProfile(data: {
    allianceName?: string;
    allianceId?: string;
    coordinateX?: number;
    coordinateY?: number;
    powerPoints?: number;
    T11Status?: string;
  }): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) return false;

      const url = getApiUrl('/auth/profile');
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        // 更新本地存儲的用戶資料
        const currentUser = this.getCurrentUser();
        if (currentUser) {
          const updatedUser = { ...currentUser, ...data };
          localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        }
      }
      
      return response.ok;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  }

  // 更新玩家遊戲資料到資料庫
  static async updatePlayerData(playerData: {
    nickname?: string;
    kid?: number;
    stoveLv?: number;
    avatarImage?: string;
  }): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) return false;

      const url = getApiUrl('/auth/player-data');
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(playerData)
      });
      return response.ok;
    } catch (error) {
      console.error('Error updating player data:', error);
      return false;
    }
  }

  static getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  static logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  // 获取所有用户（管理员功能）
  static async getAllUsers(): Promise<any[]> {
    try {
      const token = this.getToken();
      const url = getApiUrl('/auth/users');
      const response = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.users || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  // 删除用户（管理员功能）
  static async deleteUser(userId: string): Promise<boolean> {
    try {
      const token = this.getToken();
      const url = getApiUrl(`/auth/users/${userId}`);
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  // ======== 子帳號管理 ========

  // 獲取關聯帳號列表
  static async getLinkedAccounts(): Promise<{
    accounts: LinkedAccount[];
    currentAccountId: string;
    parentUserId: string;
  } | null> {
    try {
      const token = this.getToken();
      if (!token) return null;

      const url = getApiUrl('/auth/sub-accounts');
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error('Error fetching linked accounts:', error);
      return null;
    }
  }

  // 新增子帳號
  static async addSubAccount(
    gameId: string, 
    playerData?: {
      nickname?: string;
      kid?: number;
      stoveLv?: number;
      avatarImage?: string;
    }
  ): Promise<{ success: boolean; message: string; account?: LinkedAccount }> {
    try {
      const token = this.getToken();
      if (!token) return { success: false, message: '未登入' };

      const url = getApiUrl('/auth/sub-accounts');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gameId, playerData })
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, message: data.error || '新增失敗' };
      }

      return data;
    } catch (error) {
      console.error('Error adding sub-account:', error);
      return { success: false, message: '網路錯誤' };
    }
  }

  // 切換帳號
  static async switchAccount(targetGameId: string): Promise<User | null> {
    try {
      const token = this.getToken();
      if (!token) return null;

      const url = getApiUrl('/auth/switch-account');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ targetGameId })
      });

      if (!response.ok) return null;

      const data = await response.json();
      
      // 更新本地 token 和用戶資料
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      return data.user;
    } catch (error) {
      console.error('Error switching account:', error);
      return null;
    }
  }

  // 移除子帳號綁定
  static async removeSubAccount(gameId: string): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) return false;

      const url = getApiUrl(`/auth/sub-accounts/${gameId}`);
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return response.ok;
    } catch (error) {
      console.error('Error removing sub-account:', error);
      return false;
    }
  }

  // 设置管理员（管理员功能）
  static async setAdmin(
    userIdOrGameId: string, 
    isAdmin: boolean, 
    managedAlliances?: string[] | null,
    canAssignOfficers?: boolean,
    canManageEvents?: boolean
  ): Promise<User | null> {
    try {
      const token = this.getToken();
      const url = getApiUrl(`/auth/users/${userIdOrGameId}/admin`);
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isAdmin, managedAlliances, canAssignOfficers, canManageEvents })
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Error setting admin:', error);
      return null;
    }
  }

  // 重設密碼（管理員功能）
  static async resetPassword(gameId: string, newPassword: string): Promise<boolean> {
    try {
      const token = this.getToken();
      const url = getApiUrl(`/auth/users/${gameId}/reset-password`);
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword })
      });
      return response.ok;
    } catch (error) {
      console.error('Error resetting password:', error);
      return false;
    }
  }

  // 會員自行變更密碼
  static async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const token = this.getToken();
      if (!token) return { success: false, message: '未登入' };

      const url = getApiUrl('/auth/change-password');
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, message: data.error || '變更密碼失敗' };
      }

      return { success: true, message: data.message || '密碼已變更' };
    } catch (error) {
      console.error('Error changing password:', error);
      return { success: false, message: '網路錯誤' };
    }
  }
}

export class FormService {
  private static getApiUrl(endpoint: string): string {
    // 動態生成 API URL，在生產環境使用代理
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return `http://localhost:3001/api${endpoint}`;
    }
    // 生產環境：使用 PHP 代理
    return `/api-proxy.php?path=${endpoint.substring(1)}`;
  }

  static async submitForm(data: {
    userId: string;
    fid: string;
    gameId: string;
    playerName: string;
    alliance: string;
    slots: any;
    eventDate?: string;
  }): Promise<any> {
    try {
      const token = AuthService.getToken();
      const response = await fetch(this.getApiUrl(`/submissions`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit form');
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting form:', error);
      throw error;
    }
  }

  // 管理員代用戶提交表單
  static async adminSubmitForm(data: {
    userId: string;
    fid: string;
    gameId: string;
    playerName: string;
    alliance: string;
    slots: any;
    eventDate?: string;
  }): Promise<any> {
    try {
      const token = AuthService.getToken();
      const response = await fetch(this.getApiUrl(`/submissions/admin-submit`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit form');
      }

      return await response.json();
    } catch (error) {
      console.error('Error admin submitting form:', error);
      throw error;
    }
  }

  static async updateSubmission(submissionId: string, data: {
    alliance?: string;
    slots?: any;
  }): Promise<any> {
    try {
      const token = AuthService.getToken();
      const response = await fetch(this.getApiUrl(`/submissions/${submissionId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update submission');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating submission:', error);
      throw error;
    }
  }

  // 管理員更新提交（可更新更多欄位）
  static async adminUpdateSubmission(submissionId: string, data: {
    alliance?: string;
    playerName?: string;
    slots?: any;
  }): Promise<any> {
    try {
      const token = AuthService.getToken();
      const response = await fetch(this.getApiUrl(`/submissions/admin/${submissionId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update submission');
      }

      return await response.json();
    } catch (error) {
      console.error('Error admin updating submission:', error);
      throw error;
    }
  }

  static async getSubmissionsByUser(userId: string): Promise<any[]> {
    try {
      const token = AuthService.getToken();
      console.log('📡 FormService.getSubmissionsByUser - userId:', userId);
      console.log('📡 FormService.getSubmissionsByUser - token:', token ? 'exists' : 'missing');
      const response = await fetch(this.getApiUrl(`/submissions/my`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 FormService.getSubmissionsByUser - response status:', response.status);
      
      if (!response.ok) {
        console.warn('📡 FormService.getSubmissionsByUser - response not ok, returning []');
        return [];
      }

      const data = await response.json();
      console.log('📡 FormService.getSubmissionsByUser - data:', data);
      return data;
    } catch (error) {
      console.error('Error fetching submissions:', error);
      return [];
    }
  }

  static async deleteSubmission(submissionId: string): Promise<boolean> {
    try {
      const token = AuthService.getToken();
      const response = await fetch(this.getApiUrl(`/submissions/${submissionId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting submission:', error);
      return false;
    }
  }

  static async getAllSubmissions(): Promise<any[]> {
    try {
      const token = AuthService.getToken();
      const response = await fetch(this.getApiUrl(`/submissions/all`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching all submissions:', error);
      return [];
    }
  }
}

// 官職配置服務
export class OfficerConfigService {
  private static getApiUrl(endpoint: string): string {
    // 動態生成 API URL
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return `http://localhost:3001/api${endpoint}`;
    }
    return `/api-proxy.php?path=${endpoint.substring(1)}`;
  }

  // 取得所有場次日期
  static async getEventDates(): Promise<string[]> {
    try {
      const token = AuthService.getToken();
      const response = await fetch(this.getApiUrl(`/officers/dates`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.dates || [];
    } catch (error) {
      console.error('Error fetching event dates:', error);
      return [];
    }
  }

  // 取得指定日期的官職配置
  static async getAssignments(eventDate: string): Promise<Record<string, any>> {
    try {
      const token = AuthService.getToken();
      console.log('OfficerConfigService.getAssignments - token:', token ? 'exists' : 'null');
      console.log('OfficerConfigService.getAssignments - URL:', this.getApiUrl(`/officers/${eventDate}`));
      const response = await fetch(this.getApiUrl(`/officers/${eventDate}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('OfficerConfigService.getAssignments - response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('OfficerConfigService.getAssignments - error:', errorText);
        return {};
      }

      const data = await response.json();
      console.log('OfficerConfigService.getAssignments - data:', data);
      return data;
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return {};
    }
  }

  // 保存官職配置
  static async saveAssignments(eventDate: string, utcOffset: string, officers: Record<string, any[]>): Promise<boolean> {
    try {
      const token = AuthService.getToken();
      const response = await fetch(this.getApiUrl(`/officers/save`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ eventDate, utcOffset, officers })
      });

      return response.ok;
    } catch (error) {
      console.error('Error saving assignments:', error);
      return false;
    }
  }

  // 刪除指定日期的配置
  static async deleteAssignments(eventDate: string): Promise<boolean> {
    try {
      const token = AuthService.getToken();
      const response = await fetch(this.getApiUrl(`/events/${eventDate}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting assignments:', error);
      return false;
    }
  }
}

// 活動類型定義
export type ActivityType = 'research' | 'training' | 'building';

// 場次管理服務
export interface Event {
  id: string;
  eventDate: string;
  title?: string;
  status: 'open' | 'closed' | 'disabled';
  registrationStart: string;
  registrationEnd: string;
  description?: string;
  dayConfig?: Record<string, ActivityType>;
  createdAt: string;
  updatedAt: string;
}

export class EventService {
  private static getApiUrl(endpoint: string): string {
    // 動態生成 API URL
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return `http://localhost:3001/api${endpoint}`;
    }
    return `/api-proxy.php?path=${endpoint.substring(1)}`;
  }

  // 取得所有場次（管理員用）
  static async getAllEvents(): Promise<Event[]> {
    try {
      const token = AuthService.getToken();
      const response = await fetch(this.getApiUrl(`/events/all`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  // 取得開放報名的場次
  static async getOpenEvents(): Promise<Event[]> {
    try {
      const response = await fetch(this.getApiUrl(`/events/open`));

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error('Error fetching open events:', error);
      return [];
    }
  }

  // 取得所有公開可見的場次（玩家用）
  static async getPublicEvents(): Promise<Event[]> {
    try {
      const response = await fetch(this.getApiUrl(`/events/public`));

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.events || [];
    } catch (error) {
      console.error('Error fetching public events:', error);
      return [];
    }
  }

  // 取得單一場次
  static async getEvent(eventDate: string): Promise<Event | null> {
    try {
      const response = await fetch(this.getApiUrl(`/events/${eventDate}`));

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching event:', error);
      return null;
    }
  }

  // 檢查是否可以報名
  static async canRegister(eventDate: string): Promise<{ canRegister: boolean; reason?: string }> {
    try {
      const response = await fetch(this.getApiUrl(`/events/can-register/${eventDate}`));

      if (!response.ok) {
        return { canRegister: false, reason: '無法檢查報名狀態' };
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking registration:', error);
      return { canRegister: false, reason: '網路錯誤' };
    }
  }

  // 創建場次（管理員用）
  static async createEvent(data: {
    eventDate: string;
    title?: string;
    registrationStart: string;
    registrationEnd: string;
    description?: string;
    dayConfig?: Record<string, ActivityType>;
  }): Promise<{ success: boolean; event?: Event; error?: string }> {
    try {
      const token = AuthService.getToken();
      const response = await fetch(this.getApiUrl(`/events/create`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      if (!response.ok) {
        return { success: false, error: result.error };
      }

      return { success: true, event: result.event };
    } catch (error) {
      console.error('Error creating event:', error);
      return { success: false, error: '網路錯誤' };
    }
  }

  // 更新場次狀態（管理員用）
  static async updateEventStatus(eventDate: string, status: 'open' | 'closed' | 'disabled'): Promise<boolean> {
    try {
      const token = AuthService.getToken();
      const response = await fetch(this.getApiUrl(`/events/${eventDate}/status`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating event status:', error);
      return false;
    }
  }

  // 更新場次（管理員用）
  static async updateEvent(eventDateOrId: string, data: {
    eventDate?: string;
    title?: string;
    status?: 'open' | 'closed' | 'disabled';
    registrationStart?: string;
    registrationEnd?: string;
    description?: string;
    dayConfig?: Record<string, ActivityType>;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const token = AuthService.getToken();
      
      // 使用 eventDate 作為 URL 參數的唯一標識
      const response = await fetch(this.getApiUrl(`/events/${eventDateOrId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, ...result };
      } else {
        const error = await response.json();
        return { success: false, error: error.error || '更新失敗' };
      }
    } catch (error) {
      console.error('Error updating event:', error);
      return { success: false, error: '請求失敗' };
    }
  }

  // 刪除場次（管理員用）
  static async deleteEvent(eventDate: string): Promise<boolean> {
    try {
      const token = AuthService.getToken();
      const response = await fetch(this.getApiUrl(`/events/${eventDate}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting event:', error);
      return false;
    }
  }

  // 取得場次的每日活動配置
  static async getDayConfig(eventDate: string): Promise<Record<string, ActivityType> | null> {
    try {
      const response = await fetch(this.getApiUrl(`/events/${eventDate}/day-config`));

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.dayConfig;
    } catch (error) {
      console.error('Error fetching day config:', error);
      return null;
    }
  }

  // 更新場次的每日活動配置（管理員用）
  static async updateDayConfig(eventDate: string, dayConfig: Record<string, ActivityType>): Promise<boolean> {
    try {
      const token = AuthService.getToken();
      const response = await fetch(this.getApiUrl(`/events/${eventDate}/day-config`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dayConfig })
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating day config:', error);
      return false;
    }
  }

  // 取得預設配置
  static async getDefaultDayConfig(): Promise<Record<string, ActivityType>> {
    try {
      const response = await fetch(this.getApiUrl(`/events/config/default`));

      if (!response.ok) {
        return {
          monday: 'building',
          tuesday: 'research',
          wednesday: 'training',
          thursday: 'training',
          friday: 'building',
          saturday: 'research',
          sunday: 'research'
        };
      }

      const data = await response.json();
      return data.dayConfig;
    } catch (error) {
      console.error('Error fetching default config:', error);
      return {
        monday: 'building',
        tuesday: 'research',
        wednesday: 'training',
        thursday: 'training',
        friday: 'building',
        saturday: 'research',
        sunday: 'research'
      };
    }
  }
}

export class DebugService {
  static clearAll(): void {
    localStorage.clear();
  }

  static exportData(): any {
    return {
      users: localStorage.getItem('wos_users'),
      submissions: localStorage.getItem('wos_submissions')
    };
  }

  static async getAllUsers(): Promise<any[]> {
    return AuthService.getAllUsers();
  }

  static async getAllSubmissions(): Promise<any[]> {
    return FormService.getAllSubmissions();
  }
}

// 地圖相關介面
export interface AllianceMapItem {
  id: string;
  title: string;
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface AllianceMapDetail extends AllianceMapItem {
  alliances: { id: string; name: string; color: string }[];
  gridData: Record<string, string>;
  gridOwners: Record<string, string>;
}

export class MapService {
  private static getApiUrl(endpoint: string): string {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return `http://localhost:3001/api${endpoint}`;
    }
    return `/api-proxy.php?path=${endpoint.substring(1)}`;
  }

  // 獲取所有地圖列表
  static async getAllMaps(): Promise<AllianceMapItem[]> {
    try {
      const token = AuthService.getToken();
      const response = await fetch(this.getApiUrl('/maps'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching maps:', error);
      return [];
    }
  }

  // 獲取單個地圖詳情
  static async getMap(id: string): Promise<AllianceMapDetail | null> {
    try {
      const token = AuthService.getToken();
      const response = await fetch(this.getApiUrl(`/maps/${id}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching map:', error);
      return null;
    }
  }

  // 創建新地圖
  static async createMap(data: {
    title: string;
    alliances?: { id: string; name: string; color: string }[];
    gridData?: Record<string, string>;
    gridOwners?: Record<string, string>;
    status?: 'open' | 'closed';
  }): Promise<AllianceMapDetail | null> {
    try {
      const token = AuthService.getToken();
      const response = await fetch(this.getApiUrl('/maps'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating map:', error);
      return null;
    }
  }

  // 更新地圖
  static async updateMap(id: string, data: {
    title?: string;
    alliances?: { id: string; name: string; color: string }[];
    gridData?: Record<string, string>;
    gridOwners?: Record<string, string>;
    status?: 'open' | 'closed';
  }): Promise<AllianceMapDetail | null> {
    try {
      const token = AuthService.getToken();
      const response = await fetch(this.getApiUrl(`/maps/${id}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating map:', error);
      return null;
    }
  }

  // 更新地圖狀態
  static async updateMapStatus(id: string, status: 'open' | 'closed'): Promise<boolean> {
    try {
      const token = AuthService.getToken();
      const response = await fetch(this.getApiUrl(`/maps/${id}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating map status:', error);
      return false;
    }
  }

  // 刪除地圖
  static async deleteMap(id: string): Promise<boolean> {
    try {
      const token = AuthService.getToken();
      const response = await fetch(this.getApiUrl(`/maps/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting map:', error);
      return false;
    }
  }
}
