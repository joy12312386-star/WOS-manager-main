import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class UserService {
  // Hash password using SHA256
  private static hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  // 初始化超級管理員 (380768429)
  static async initializeSuperAdmin() {
    try {
      const superAdminId = '380768429';
      const existing = await prisma.user.findUnique({
        where: { gameId: superAdminId },
      });

      if (!existing) {
        await prisma.user.create({
          data: {
            gameId: superAdminId,
            password: this.hashPassword('admin@123'),
            allianceName: 'Admin Alliance',
            isAdmin: true,
          },
        });
        console.log('✅ Super admin created: 380768429');
      }
    } catch (error) {
      console.error('Error initializing super admin:', error);
    }
  }

  // 檢查用戶是否存在
  static async userExists(gameId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { gameId },
    });
    return !!user;
  }

  // 登入
  static async login(gameId: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { gameId },
    });

    if (!user || user.password !== this.hashPassword(password)) {
      return null;
    }

    return user;
  }

  // 註冊
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
  ) {
    const existing = await prisma.user.findUnique({
      where: { gameId },
    });

    if (existing) {
      throw new Error('User already exists');
    }

    return await prisma.user.create({
      data: {
        gameId,
        password: this.hashPassword(password),
        allianceName,
        nickname: playerData?.nickname,
        kid: playerData?.kid,
        stoveLv: playerData?.stoveLv,
        avatarImage: playerData?.avatarImage,
        isAdmin: false,
      },
    });
  }

  // 更新玩家遊戲資料（從遊戲 API 獲取的資料）
  static async updatePlayerData(
    gameId: string,
    playerData: {
      nickname?: string;
      kid?: number;
      stoveLv?: number;
      avatarImage?: string;
    }
  ) {
    return await prisma.user.update({
      where: { gameId },
      data: {
        nickname: playerData.nickname,
        kid: playerData.kid,
        stoveLv: playerData.stoveLv,
        avatarImage: playerData.avatarImage,
      },
    });
  }

  // 設定管理員 (by id)
  static async setAdmin(userId: string, isAdmin: boolean) {
    return await prisma.user.update({
      where: { id: userId },
      data: { isAdmin },
    });
  }

  // 設定管理員 (by gameId)
  static async setAdminByGameId(
    gameId: string, 
    isAdmin: boolean, 
    managedAlliances?: string[] | null,
    canAssignOfficers?: boolean,
    canManageEvents?: boolean
  ) {
    const data: any = { isAdmin };
    // 如果傳入 managedAlliances，設定管理的聯盟
    // null 表示可管理所有聯盟，空陣列表示不能管理任何聯盟
    if (managedAlliances !== undefined) {
      data.managedAlliances = managedAlliances === null ? null : JSON.stringify(managedAlliances);
    }
    // 設定權限
    if (canAssignOfficers !== undefined) {
      data.canAssignOfficers = canAssignOfficers;
    }
    if (canManageEvents !== undefined) {
      data.canManageEvents = canManageEvents;
    }
    // 如果取消管理員權限，清除管理的聯盟和權限
    if (!isAdmin) {
      data.managedAlliances = null;
      data.canAssignOfficers = true;
      data.canManageEvents = true;
    }
    return await prisma.user.update({
      where: { gameId },
      data,
    });
  }

  // 獲取管理員可管理的聯盟列表
  static getManagedAlliances(user: any): string[] | null {
    if (!user.managedAlliances) return null; // null 表示可管理所有聯盟
    try {
      return JSON.parse(user.managedAlliances);
    } catch {
      return null;
    }
  }

  // 重設密碼 (管理員功能)
  static async resetPassword(gameId: string, newPassword: string) {
    return await prisma.user.update({
      where: { gameId },
      data: { password: this.hashPassword(newPassword) },
    });
  }

  // 會員自行變更密碼 (需驗證舊密碼)
  static async changePassword(gameId: string, oldPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { gameId },
    });

    if (!user || user.password !== this.hashPassword(oldPassword)) {
      throw new Error('Current password is incorrect');
    }

    return await prisma.user.update({
      where: { gameId },
      data: { password: this.hashPassword(newPassword) },
    });
  }

  // 取得所有管理員
  static async getAllAdmins() {
    return await prisma.user.findMany({
      where: { isAdmin: true },
      select: {
        id: true,
        gameId: true,
        allianceName: true,
        isAdmin: true,
        createdAt: true,
      },
    });
  }

  // 取得使用者資料
  static async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        gameId: true,
        password: true,
        allianceName: true,
        allianceId: true,
        coordinateX: true,
        coordinateY: true,
        powerPoints: true,
        isAdmin: true,
        managedAlliances: true,
        canAssignOfficers: true,
        canManageEvents: true,
        parentUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    // 解析 managedAlliances JSON 字串
    return user ? {
      ...user,
      managedAlliances: this.getManagedAlliances(user),
    } : null;
  }

  // 透過 gameId 取得使用者
  static async getUserByGameId(gameId: string) {
    return await prisma.user.findUnique({
      where: { gameId },
      select: {
        id: true,
        gameId: true,
        password: true,
        nickname: true,
        allianceName: true,
        allianceId: true,
        isAdmin: true,
        parentUserId: true,
        avatarImage: true,
        stoveLv: true,
      },
    });
  }

  // 更新使用者資料
  static async updateUserProfile(
    userId: string,
    data: {
      allianceName?: string;
      allianceId?: string;
      coordinateX?: number;
      coordinateY?: number;
      powerPoints?: number;
      T11Status?: string;
    }
  ) {
    return await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        gameId: true,
        allianceName: true,
        allianceId: true,
        coordinateX: true,
        coordinateY: true,
        powerPoints: true,
        isAdmin: true,
      },
    });
  }

  // 取得所有使用者 (僅管理員)
  static async getAllUsers() {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        gameId: true,
        nickname: true,
        allianceName: true,
        isAdmin: true,
        managedAlliances: true,
        canAssignOfficers: true,
        canManageEvents: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    // 解析 managedAlliances JSON 字串
    return users.map(user => ({
      ...user,
      managedAlliances: this.getManagedAlliances(user),
    }));
  }

  // ======== 子帳號管理 ========

  // 新增子帳號
  static async addSubAccount(
    parentUserId: string, 
    subGameId: string, 
    parentPassword: string,
    playerData?: {
      nickname?: string;
      kid?: number;
      stoveLv?: number;
      avatarImage?: string;
    }
  ) {
    // 檢查子帳號是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { gameId: subGameId },
    });

    if (existingUser) {
      // 如果已存在，檢查是否已經綁定到其他主帳號
      if (existingUser.parentUserId && existingUser.parentUserId !== parentUserId) {
        throw new Error('此帳號已綁定到其他主帳號');
      }
      if (existingUser.id === parentUserId) {
        throw new Error('不能將主帳號添加為子帳號');
      }
      // 如果已經綁定到當前主帳號
      if (existingUser.parentUserId === parentUserId) {
        throw new Error('此帳號已經是您的子帳號');
      }
      
      // 更新為子帳號，使用主帳號的密碼，並更新玩家資料
      const updated = await prisma.user.update({
        where: { gameId: subGameId },
        data: { 
          parentUserId,
          password: parentPassword, // 使用主帳號密碼
          ...(playerData && {
            nickname: playerData.nickname,
            kid: playerData.kid,
            stoveLv: playerData.stoveLv,
            avatarImage: playerData.avatarImage,
          }),
        },
        select: {
          id: true,
          gameId: true,
          nickname: true,
          allianceName: true,
          avatarImage: true,
          stoveLv: true,
        },
      });
      
      return { success: true, account: updated, message: '已綁定現有帳號' };
    }

    // 創建新的子帳號
    const newSubAccount = await prisma.user.create({
      data: {
        gameId: subGameId,
        password: parentPassword, // 使用主帳號密碼
        parentUserId,
        allianceName: '',
        ...(playerData && {
          nickname: playerData.nickname,
          kid: playerData.kid,
          stoveLv: playerData.stoveLv,
          avatarImage: playerData.avatarImage,
        }),
      },
      select: {
        id: true,
        gameId: true,
        nickname: true,
        allianceName: true,
        avatarImage: true,
        stoveLv: true,
      },
    });

    return { success: true, account: newSubAccount, message: '已創建新子帳號' };
  }

  // 獲取關聯帳號列表（主帳號 + 所有子帳號）
  static async getLinkedAccounts(parentUserId: string) {
    // 獲取主帳號
    const parentAccount = await prisma.user.findUnique({
      where: { id: parentUserId },
      select: {
        id: true,
        gameId: true,
        nickname: true,
        allianceName: true,
        avatarImage: true,
        stoveLv: true,
        isAdmin: true,
        parentUserId: true,
      },
    });

    if (!parentAccount) {
      throw new Error('主帳號不存在');
    }

    // 獲取所有子帳號
    const subAccounts = await prisma.user.findMany({
      where: { parentUserId },
      select: {
        id: true,
        gameId: true,
        nickname: true,
        allianceName: true,
        avatarImage: true,
        stoveLv: true,
        isAdmin: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // 主帳號標記為 isParent
    return [
      { ...parentAccount, isParent: true },
      ...subAccounts.map(acc => ({ ...acc, isParent: false })),
    ];
  }

  // 移除子帳號綁定
  static async removeSubAccount(parentUserId: string, subGameId: string) {
    const subAccount = await prisma.user.findUnique({
      where: { gameId: subGameId },
    });

    if (!subAccount) {
      throw new Error('子帳號不存在');
    }

    if (subAccount.parentUserId !== parentUserId) {
      throw new Error('此帳號不是您的子帳號');
    }

    // 將子帳號的 parentUserId 設為 null（解除綁定，但保留帳號）
    await prisma.user.update({
      where: { gameId: subGameId },
      data: { parentUserId: null },
    });

    return { success: true };
  }

  // 刪除用戶（管理員功能）
  static async deleteUserByGameId(gameId: string) {
    // 先檢查用戶是否存在
    const user = await prisma.user.findUnique({
      where: { gameId },
    });

    if (!user) {
      throw new Error('用戶不存在');
    }

    // 不能刪除超級管理員
    if (gameId === '380768429') {
      throw new Error('無法刪除超級管理員');
    }

    // 如果該用戶有子帳號，先解除所有子帳號的綁定
    await prisma.user.updateMany({
      where: { parentUserId: user.id },
      data: { parentUserId: null },
    });

    // 刪除用戶
    await prisma.user.delete({
      where: { gameId },
    });

    return { success: true };
  }
}

export default UserService;
