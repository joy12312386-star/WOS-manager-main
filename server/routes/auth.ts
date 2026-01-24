import { Router } from 'express';
import { generateToken } from '../middleware/auth';
import UserService from '../services/user.service';
import { AuthRequest, authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

// 檢查用戶是否已存在
router.get('/check-user/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    if (!gameId) {
      return res.status(400).json({ error: 'gameId is required' });
    }

    const exists = await UserService.userExists(gameId);

    res.json({ exists });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 登入
router.post('/login', async (req, res) => {
  try {
    const { gameId, password } = req.body;

    if (!gameId || !password) {
      return res.status(400).json({ error: 'gameId and password are required' });
    }

    const user = await UserService.login(gameId, password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.gameId, user.isAdmin);

    res.json({
      token,
      user: {
        id: user.id,
        gameId: user.gameId,
        allianceName: user.allianceName,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 註冊
router.post('/register', async (req, res) => {
  try {
    const { gameId, password, allianceName, playerData } = req.body;

    if (!gameId || !password || !allianceName) {
      return res
        .status(400)
        .json({ error: 'gameId, password, and allianceName are required' });
    }

    const user = await UserService.register(gameId, password, allianceName, playerData);

    const token = generateToken(user.id, user.gameId, user.isAdmin);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        gameId: user.gameId,
        allianceName: user.allianceName,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 更新玩家遊戲資料（從遊戲 API 獲取的資料）
router.put('/player-data', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { nickname, kid, stoveLv, avatarImage } = req.body;

    const updated = await UserService.updatePlayerData(req.user!.gameId, {
      nickname,
      kid,
      stoveLv,
      avatarImage,
    });

    res.json({ success: true, user: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 取得當前使用者資料
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await UserService.getUserById(req.user!.id);
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 更新使用者資料
router.put('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { allianceName, allianceId, coordinateX, coordinateY, powerPoints, T11Status } = req.body;

    const updated = await UserService.updateUserProfile(req.user!.id, {
      allianceName,
      allianceId,
      coordinateX,
      coordinateY,
      powerPoints,
      T11Status,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ======== 管理員 API ========

// 取得所有管理員
router.get('/admins', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const admins = await UserService.getAllAdmins();
    res.json(admins);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 設定管理員 (支持 POST /admins/:userId 和 PUT /users/:userId/admin)
router.post('/admins/:userId', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { isAdmin } = req.body;

    const userIdStr = Array.isArray(userId) ? userId[0] : userId;
    const updated = await UserService.setAdminByGameId(userIdStr, isAdmin);

    res.json({
      message: isAdmin ? 'User promoted to admin' : 'Admin role removed',
      user: {
        id: updated.id,
        gameId: updated.gameId,
        allianceName: updated.allianceName,
        isAdmin: updated.isAdmin,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 設定管理員 (PUT 路由 - 前端使用)
router.put('/users/:userId/admin', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    const { isAdmin } = req.body;

    const userIdStr = Array.isArray(userId) ? userId[0] : userId;
    const updated = await UserService.setAdminByGameId(userIdStr, isAdmin);

    res.json({
      message: isAdmin ? 'User promoted to admin' : 'Admin role removed',
      user: {
        id: updated.id,
        gameId: updated.gameId,
        allianceName: updated.allianceName,
        isAdmin: updated.isAdmin,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 取得所有使用者 (僅管理員)
router.get('/users', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const users = await UserService.getAllUsers();
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 刪除使用者 (僅管理員)
router.delete('/users/:userId', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const userIdStr = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    
    await UserService.deleteUserByGameId(userIdStr);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ======== 子帳號管理 API ========

// 新增子帳號
router.post('/sub-accounts', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { gameId, playerData } = req.body;
    
    if (!gameId) {
      return res.status(400).json({ error: 'gameId is required' });
    }

    const currentUser = await UserService.getUserById(req.user!.id);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 確定主帳號 ID（如果當前用戶是子帳號，使用其主帳號 ID）
    const parentUserId = currentUser.parentUserId || currentUser.id;

    const result = await UserService.addSubAccount(parentUserId, gameId, currentUser.password, playerData);
    
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 獲取關聯帳號列表
router.get('/sub-accounts', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const currentUser = await UserService.getUserById(req.user!.id);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 確定主帳號 ID
    const parentUserId = currentUser.parentUserId || currentUser.id;
    
    const accounts = await UserService.getLinkedAccounts(parentUserId);
    
    res.json({ 
      accounts, 
      currentAccountId: req.user!.id,
      parentUserId 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 切換到子帳號
router.post('/switch-account', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { targetGameId } = req.body;
    
    if (!targetGameId) {
      return res.status(400).json({ error: 'targetGameId is required' });
    }

    const currentUser = await UserService.getUserById(req.user!.id);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 確定主帳號 ID
    const parentUserId = currentUser.parentUserId || currentUser.id;
    
    // 驗證目標帳號是否屬於同一個帳號群組
    const targetUser = await UserService.getUserByGameId(targetGameId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target account not found' });
    }

    const targetParentId = targetUser.parentUserId || targetUser.id;
    if (targetParentId !== parentUserId && targetUser.id !== parentUserId) {
      return res.status(403).json({ error: 'Target account is not linked' });
    }

    // 生成新 token
    const token = generateToken(targetUser.id, targetUser.gameId, targetUser.isAdmin);

    res.json({
      token,
      user: {
        id: targetUser.id,
        gameId: targetUser.gameId,
        allianceName: targetUser.allianceName,
        isAdmin: targetUser.isAdmin,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 移除子帳號綁定
router.delete('/sub-accounts/:gameId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const gameId = Array.isArray(req.params.gameId) ? req.params.gameId[0] : req.params.gameId;
    
    const currentUser = await UserService.getUserById(req.user!.id);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 確定主帳號 ID
    const parentUserId = currentUser.parentUserId || currentUser.id;
    
    await UserService.removeSubAccount(parentUserId, gameId);
    
    res.json({ success: true, message: 'Sub-account unlinked' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
