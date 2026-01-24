"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var auth_1 = require("../middleware/auth");
var user_service_1 = require("../services/user.service");
var auth_2 = require("../middleware/auth");
var router = (0, express_1.Router)();
// 檢查用戶是否已存在
router.get('/check-user/:gameId', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var gameId, exists, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                gameId = req.params.gameId;
                if (!gameId) {
                    return [2 /*return*/, res.status(400).json({ error: 'gameId is required' })];
                }
                return [4 /*yield*/, user_service_1.default.userExists(gameId)];
            case 1:
                exists = _a.sent();
                res.json({ exists: exists });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                res.status(500).json({ error: error_1.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 登入
router.post('/login', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, gameId, password, user, token, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, gameId = _a.gameId, password = _a.password;
                if (!gameId || !password) {
                    return [2 /*return*/, res.status(400).json({ error: 'gameId and password are required' })];
                }
                return [4 /*yield*/, user_service_1.default.login(gameId, password)];
            case 1:
                user = _b.sent();
                if (!user) {
                    return [2 /*return*/, res.status(401).json({ error: 'Invalid credentials' })];
                }
                token = (0, auth_1.generateToken)(user.id, user.gameId, user.isAdmin);
                res.json({
                    token: token,
                    user: {
                        id: user.id,
                        gameId: user.gameId,
                        allianceName: user.allianceName,
                        isAdmin: user.isAdmin,
                    },
                });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _b.sent();
                res.status(500).json({ error: error_2.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 註冊
router.post('/register', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, gameId, password, allianceName, playerData, user, token, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, gameId = _a.gameId, password = _a.password, allianceName = _a.allianceName, playerData = _a.playerData;
                if (!gameId || !password || !allianceName) {
                    return [2 /*return*/, res
                            .status(400)
                            .json({ error: 'gameId, password, and allianceName are required' })];
                }
                return [4 /*yield*/, user_service_1.default.register(gameId, password, allianceName, playerData)];
            case 1:
                user = _b.sent();
                token = (0, auth_1.generateToken)(user.id, user.gameId, user.isAdmin);
                res.status(201).json({
                    token: token,
                    user: {
                        id: user.id,
                        gameId: user.gameId,
                        allianceName: user.allianceName,
                        isAdmin: user.isAdmin,
                    },
                });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _b.sent();
                res.status(400).json({ error: error_3.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 更新玩家遊戲資料（從遊戲 API 獲取的資料）
router.put('/player-data', auth_2.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, nickname, kid, stoveLv, avatarImage, updated, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, nickname = _a.nickname, kid = _a.kid, stoveLv = _a.stoveLv, avatarImage = _a.avatarImage;
                return [4 /*yield*/, user_service_1.default.updatePlayerData(req.user.gameId, {
                        nickname: nickname,
                        kid: kid,
                        stoveLv: stoveLv,
                        avatarImage: avatarImage,
                    })];
            case 1:
                updated = _b.sent();
                res.json({ success: true, user: updated });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _b.sent();
                res.status(500).json({ error: error_4.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 取得當前使用者資料
router.get('/me', auth_2.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, user_service_1.default.getUserById(req.user.id)];
            case 1:
                user = _a.sent();
                res.json(user);
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                res.status(500).json({ error: error_5.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 更新使用者資料
router.put('/profile', auth_2.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, allianceName, allianceId, coordinateX, coordinateY, powerPoints, T11Status, updated, error_6;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, allianceName = _a.allianceName, allianceId = _a.allianceId, coordinateX = _a.coordinateX, coordinateY = _a.coordinateY, powerPoints = _a.powerPoints, T11Status = _a.T11Status;
                return [4 /*yield*/, user_service_1.default.updateUserProfile(req.user.id, {
                        allianceName: allianceName,
                        allianceId: allianceId,
                        coordinateX: coordinateX,
                        coordinateY: coordinateY,
                        powerPoints: powerPoints,
                        T11Status: T11Status,
                    })];
            case 1:
                updated = _b.sent();
                res.json(updated);
                return [3 /*break*/, 3];
            case 2:
                error_6 = _b.sent();
                res.status(500).json({ error: error_6.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ======== 管理員 API ========
// 取得所有管理員
router.get('/admins', auth_2.authMiddleware, auth_2.adminMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var admins, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, user_service_1.default.getAllAdmins()];
            case 1:
                admins = _a.sent();
                res.json(admins);
                return [3 /*break*/, 3];
            case 2:
                error_7 = _a.sent();
                res.status(500).json({ error: error_7.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 設定管理員 (支持 POST /admins/:userId 和 PUT /users/:userId/admin)
router.post('/admins/:userId', auth_2.authMiddleware, auth_2.adminMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, isAdmin, userIdStr, updated, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                userId = req.params.userId;
                isAdmin = req.body.isAdmin;
                userIdStr = Array.isArray(userId) ? userId[0] : userId;
                return [4 /*yield*/, user_service_1.default.setAdminByGameId(userIdStr, isAdmin)];
            case 1:
                updated = _a.sent();
                res.json({
                    message: isAdmin ? 'User promoted to admin' : 'Admin role removed',
                    user: {
                        id: updated.id,
                        gameId: updated.gameId,
                        allianceName: updated.allianceName,
                        isAdmin: updated.isAdmin,
                    },
                });
                return [3 /*break*/, 3];
            case 2:
                error_8 = _a.sent();
                res.status(500).json({ error: error_8.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 設定管理員 (PUT 路由 - 前端使用)
router.put('/users/:userId/admin', auth_2.authMiddleware, auth_2.adminMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, isAdmin, userIdStr, updated, error_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                userId = req.params.userId;
                isAdmin = req.body.isAdmin;
                userIdStr = Array.isArray(userId) ? userId[0] : userId;
                return [4 /*yield*/, user_service_1.default.setAdminByGameId(userIdStr, isAdmin)];
            case 1:
                updated = _a.sent();
                res.json({
                    message: isAdmin ? 'User promoted to admin' : 'Admin role removed',
                    user: {
                        id: updated.id,
                        gameId: updated.gameId,
                        allianceName: updated.allianceName,
                        isAdmin: updated.isAdmin,
                    },
                });
                return [3 /*break*/, 3];
            case 2:
                error_9 = _a.sent();
                res.status(500).json({ error: error_9.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 取得所有使用者 (僅管理員)
router.get('/users', auth_2.authMiddleware, auth_2.adminMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var users, error_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, user_service_1.default.getAllUsers()];
            case 1:
                users = _a.sent();
                res.json({ users: users });
                return [3 /*break*/, 3];
            case 2:
                error_10 = _a.sent();
                res.status(500).json({ error: error_10.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 刪除使用者 (僅管理員)
router.delete('/users/:userId', auth_2.authMiddleware, auth_2.adminMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userIdStr, error_11;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                userIdStr = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
                return [4 /*yield*/, user_service_1.default.deleteUserByGameId(userIdStr)];
            case 1:
                _a.sent();
                res.json({ message: 'User deleted successfully' });
                return [3 /*break*/, 3];
            case 2:
                error_11 = _a.sent();
                res.status(500).json({ error: error_11.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ======== 子帳號管理 API ========
// 新增子帳號
router.post('/sub-accounts', auth_2.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, gameId, playerData, currentUser, parentUserId, result, error_12;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                _a = req.body, gameId = _a.gameId, playerData = _a.playerData;
                if (!gameId) {
                    return [2 /*return*/, res.status(400).json({ error: 'gameId is required' })];
                }
                return [4 /*yield*/, user_service_1.default.getUserById(req.user.id)];
            case 1:
                currentUser = _b.sent();
                if (!currentUser) {
                    return [2 /*return*/, res.status(404).json({ error: 'User not found' })];
                }
                parentUserId = currentUser.parentUserId || currentUser.id;
                return [4 /*yield*/, user_service_1.default.addSubAccount(parentUserId, gameId, currentUser.password, playerData)];
            case 2:
                result = _b.sent();
                res.status(201).json(result);
                return [3 /*break*/, 4];
            case 3:
                error_12 = _b.sent();
                res.status(400).json({ error: error_12.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 獲取關聯帳號列表
router.get('/sub-accounts', auth_2.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var currentUser, parentUserId, accounts, error_13;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, user_service_1.default.getUserById(req.user.id)];
            case 1:
                currentUser = _a.sent();
                if (!currentUser) {
                    return [2 /*return*/, res.status(404).json({ error: 'User not found' })];
                }
                parentUserId = currentUser.parentUserId || currentUser.id;
                return [4 /*yield*/, user_service_1.default.getLinkedAccounts(parentUserId)];
            case 2:
                accounts = _a.sent();
                res.json({
                    accounts: accounts,
                    currentAccountId: req.user.id,
                    parentUserId: parentUserId
                });
                return [3 /*break*/, 4];
            case 3:
                error_13 = _a.sent();
                res.status(500).json({ error: error_13.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 切換到子帳號
router.post('/switch-account', auth_2.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var targetGameId, currentUser, parentUserId, targetUser, targetParentId, token, error_14;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                targetGameId = req.body.targetGameId;
                if (!targetGameId) {
                    return [2 /*return*/, res.status(400).json({ error: 'targetGameId is required' })];
                }
                return [4 /*yield*/, user_service_1.default.getUserById(req.user.id)];
            case 1:
                currentUser = _a.sent();
                if (!currentUser) {
                    return [2 /*return*/, res.status(404).json({ error: 'User not found' })];
                }
                parentUserId = currentUser.parentUserId || currentUser.id;
                return [4 /*yield*/, user_service_1.default.getUserByGameId(targetGameId)];
            case 2:
                targetUser = _a.sent();
                if (!targetUser) {
                    return [2 /*return*/, res.status(404).json({ error: 'Target account not found' })];
                }
                targetParentId = targetUser.parentUserId || targetUser.id;
                if (targetParentId !== parentUserId && targetUser.id !== parentUserId) {
                    return [2 /*return*/, res.status(403).json({ error: 'Target account is not linked' })];
                }
                token = (0, auth_1.generateToken)(targetUser.id, targetUser.gameId, targetUser.isAdmin);
                res.json({
                    token: token,
                    user: {
                        id: targetUser.id,
                        gameId: targetUser.gameId,
                        allianceName: targetUser.allianceName,
                        isAdmin: targetUser.isAdmin,
                    },
                });
                return [3 /*break*/, 4];
            case 3:
                error_14 = _a.sent();
                res.status(500).json({ error: error_14.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// 移除子帳號綁定
router.delete('/sub-accounts/:gameId', auth_2.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var gameId, currentUser, parentUserId, error_15;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                gameId = Array.isArray(req.params.gameId) ? req.params.gameId[0] : req.params.gameId;
                return [4 /*yield*/, user_service_1.default.getUserById(req.user.id)];
            case 1:
                currentUser = _a.sent();
                if (!currentUser) {
                    return [2 /*return*/, res.status(404).json({ error: 'User not found' })];
                }
                parentUserId = currentUser.parentUserId || currentUser.id;
                return [4 /*yield*/, user_service_1.default.removeSubAccount(parentUserId, gameId)];
            case 2:
                _a.sent();
                res.json({ success: true, message: 'Sub-account unlinked' });
                return [3 /*break*/, 4];
            case 3:
                error_15 = _a.sent();
                res.status(400).json({ error: error_15.message });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
