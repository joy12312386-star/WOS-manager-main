"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
var client_1 = require("@prisma/client");
var crypto_1 = __importDefault(require("crypto"));
var prisma = new client_1.PrismaClient();
var UserService = /** @class */ (function () {
    function UserService() {
    }
    // Hash password using SHA256
    UserService.hashPassword = function (password) {
        return crypto_1.default.createHash('sha256').update(password).digest('hex');
    };
    // 初始化超級管理員 (380768429)
    UserService.initializeSuperAdmin = function () {
        return __awaiter(this, void 0, void 0, function () {
            var superAdminId, existing, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        superAdminId = '380768429';
                        return [4 /*yield*/, prisma.user.findUnique({
                                where: { gameId: superAdminId },
                            })];
                    case 1:
                        existing = _a.sent();
                        if (!!existing) return [3 /*break*/, 3];
                        return [4 /*yield*/, prisma.user.create({
                                data: {
                                    gameId: superAdminId,
                                    password: this.hashPassword('admin@123'),
                                    allianceName: 'Admin Alliance',
                                    isAdmin: true,
                                },
                            })];
                    case 2:
                        _a.sent();
                        console.log('✅ Super admin created: 380768429');
                        _a.label = 3;
                    case 3: return [3 /*break*/, 5];
                    case 4:
                        error_1 = _a.sent();
                        console.error('Error initializing super admin:', error_1);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // 檢查用戶是否存在
    UserService.userExists = function (gameId) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.user.findUnique({
                            where: { gameId: gameId },
                        })];
                    case 1:
                        user = _a.sent();
                        return [2 /*return*/, !!user];
                }
            });
        });
    };
    // 登入
    UserService.login = function (gameId, password) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.user.findUnique({
                            where: { gameId: gameId },
                        })];
                    case 1:
                        user = _a.sent();
                        if (!user || user.password !== this.hashPassword(password)) {
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/, user];
                }
            });
        });
    };
    // 註冊
    UserService.register = function (gameId, password, allianceName, playerData) {
        return __awaiter(this, void 0, void 0, function () {
            var existing;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.user.findUnique({
                            where: { gameId: gameId },
                        })];
                    case 1:
                        existing = _a.sent();
                        if (existing) {
                            throw new Error('User already exists');
                        }
                        return [4 /*yield*/, prisma.user.create({
                                data: {
                                    gameId: gameId,
                                    password: this.hashPassword(password),
                                    allianceName: allianceName,
                                    nickname: playerData === null || playerData === void 0 ? void 0 : playerData.nickname,
                                    kid: playerData === null || playerData === void 0 ? void 0 : playerData.kid,
                                    stoveLv: playerData === null || playerData === void 0 ? void 0 : playerData.stoveLv,
                                    avatarImage: playerData === null || playerData === void 0 ? void 0 : playerData.avatarImage,
                                    isAdmin: false,
                                },
                            })];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 更新玩家遊戲資料（從遊戲 API 獲取的資料）
    UserService.updatePlayerData = function (gameId, playerData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.user.update({
                            where: { gameId: gameId },
                            data: {
                                nickname: playerData.nickname,
                                kid: playerData.kid,
                                stoveLv: playerData.stoveLv,
                                avatarImage: playerData.avatarImage,
                            },
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 設定管理員 (by id)
    UserService.setAdmin = function (userId, isAdmin) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.user.update({
                            where: { id: userId },
                            data: { isAdmin: isAdmin },
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 設定管理員 (by gameId)
    UserService.setAdminByGameId = function (gameId, isAdmin) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.user.update({
                            where: { gameId: gameId },
                            data: { isAdmin: isAdmin },
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 取得所有管理員
    UserService.getAllAdmins = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.user.findMany({
                            where: { isAdmin: true },
                            select: {
                                id: true,
                                gameId: true,
                                allianceName: true,
                                isAdmin: true,
                                createdAt: true,
                            },
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 取得使用者資料
    UserService.getUserById = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.user.findUnique({
                            where: { id: id },
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
                                parentUserId: true,
                                createdAt: true,
                                updatedAt: true,
                            },
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 透過 gameId 取得使用者
    UserService.getUserByGameId = function (gameId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.user.findUnique({
                            where: { gameId: gameId },
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
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 更新使用者資料
    UserService.updateUserProfile = function (userId, data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.user.update({
                            where: { id: userId },
                            data: data,
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
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 取得所有使用者 (僅管理員)
    UserService.getAllUsers = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.user.findMany({
                            select: {
                                id: true,
                                gameId: true,
                                nickname: true,
                                allianceName: true,
                                isAdmin: true,
                                createdAt: true,
                            },
                            orderBy: { createdAt: 'desc' },
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // ======== 子帳號管理 ========
    // 新增子帳號
    UserService.addSubAccount = function (parentUserId, subGameId, parentPassword, playerData) {
        return __awaiter(this, void 0, void 0, function () {
            var existingUser, updated, newSubAccount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.user.findUnique({
                            where: { gameId: subGameId },
                        })];
                    case 1:
                        existingUser = _a.sent();
                        if (!existingUser) return [3 /*break*/, 3];
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
                        return [4 /*yield*/, prisma.user.update({
                                where: { gameId: subGameId },
                                data: __assign({ parentUserId: parentUserId, password: parentPassword }, (playerData && {
                                    nickname: playerData.nickname,
                                    kid: playerData.kid,
                                    stoveLv: playerData.stoveLv,
                                    avatarImage: playerData.avatarImage,
                                })),
                                select: {
                                    id: true,
                                    gameId: true,
                                    nickname: true,
                                    allianceName: true,
                                    avatarImage: true,
                                    stoveLv: true,
                                },
                            })];
                    case 2:
                        updated = _a.sent();
                        return [2 /*return*/, { success: true, account: updated, message: '已綁定現有帳號' }];
                    case 3: return [4 /*yield*/, prisma.user.create({
                            data: __assign({ gameId: subGameId, password: parentPassword, // 使用主帳號密碼
                                parentUserId: parentUserId, allianceName: '' }, (playerData && {
                                nickname: playerData.nickname,
                                kid: playerData.kid,
                                stoveLv: playerData.stoveLv,
                                avatarImage: playerData.avatarImage,
                            })),
                            select: {
                                id: true,
                                gameId: true,
                                nickname: true,
                                allianceName: true,
                                avatarImage: true,
                                stoveLv: true,
                            },
                        })];
                    case 4:
                        newSubAccount = _a.sent();
                        return [2 /*return*/, { success: true, account: newSubAccount, message: '已創建新子帳號' }];
                }
            });
        });
    };
    // 獲取關聯帳號列表（主帳號 + 所有子帳號）
    UserService.getLinkedAccounts = function (parentUserId) {
        return __awaiter(this, void 0, void 0, function () {
            var parentAccount, subAccounts;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.user.findUnique({
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
                        })];
                    case 1:
                        parentAccount = _a.sent();
                        if (!parentAccount) {
                            throw new Error('主帳號不存在');
                        }
                        return [4 /*yield*/, prisma.user.findMany({
                                where: { parentUserId: parentUserId },
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
                            })];
                    case 2:
                        subAccounts = _a.sent();
                        // 主帳號標記為 isParent
                        return [2 /*return*/, __spreadArray([
                                __assign(__assign({}, parentAccount), { isParent: true })
                            ], subAccounts.map(function (acc) { return (__assign(__assign({}, acc), { isParent: false })); }), true)];
                }
            });
        });
    };
    // 移除子帳號綁定
    UserService.removeSubAccount = function (parentUserId, subGameId) {
        return __awaiter(this, void 0, void 0, function () {
            var subAccount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.user.findUnique({
                            where: { gameId: subGameId },
                        })];
                    case 1:
                        subAccount = _a.sent();
                        if (!subAccount) {
                            throw new Error('子帳號不存在');
                        }
                        if (subAccount.parentUserId !== parentUserId) {
                            throw new Error('此帳號不是您的子帳號');
                        }
                        // 將子帳號的 parentUserId 設為 null（解除綁定，但保留帳號）
                        return [4 /*yield*/, prisma.user.update({
                                where: { gameId: subGameId },
                                data: { parentUserId: null },
                            })];
                    case 2:
                        // 將子帳號的 parentUserId 設為 null（解除綁定，但保留帳號）
                        _a.sent();
                        return [2 /*return*/, { success: true }];
                }
            });
        });
    };
    // 刪除用戶（管理員功能）
    UserService.deleteUserByGameId = function (gameId) {
        return __awaiter(this, void 0, void 0, function () {
            var user;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.user.findUnique({
                            where: { gameId: gameId },
                        })];
                    case 1:
                        user = _a.sent();
                        if (!user) {
                            throw new Error('用戶不存在');
                        }
                        // 不能刪除超級管理員
                        if (gameId === '380768429') {
                            throw new Error('無法刪除超級管理員');
                        }
                        // 如果該用戶有子帳號，先解除所有子帳號的綁定
                        return [4 /*yield*/, prisma.user.updateMany({
                                where: { parentUserId: user.id },
                                data: { parentUserId: null },
                            })];
                    case 2:
                        // 如果該用戶有子帳號，先解除所有子帳號的綁定
                        _a.sent();
                        // 刪除用戶
                        return [4 /*yield*/, prisma.user.delete({
                                where: { gameId: gameId },
                            })];
                    case 3:
                        // 刪除用戶
                        _a.sent();
                        return [2 /*return*/, { success: true }];
                }
            });
        });
    };
    return UserService;
}());
exports.UserService = UserService;
exports.default = UserService;
