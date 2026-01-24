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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticsService = void 0;
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
var StatisticsService = /** @class */ (function () {
    function StatisticsService() {
    }
    // 建立或更新聯盟統計
    StatisticsService.upsertAllianceStatistic = function (userId, data) {
        return __awaiter(this, void 0, void 0, function () {
            var existing;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.allianceStatistic.findFirst({
                            where: {
                                userId: userId,
                                allianceId: data.allianceId,
                                statisticDate: {
                                    gte: new Date(data.statisticDate.setHours(0, 0, 0, 0)),
                                    lt: new Date(data.statisticDate.setHours(23, 59, 59, 999)),
                                },
                            },
                        })];
                    case 1:
                        existing = _a.sent();
                        if (!existing) return [3 /*break*/, 3];
                        return [4 /*yield*/, prisma.allianceStatistic.update({
                                where: { id: existing.id },
                                data: data,
                            })];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3: return [4 /*yield*/, prisma.allianceStatistic.create({
                            data: __assign({ userId: userId }, data),
                        })];
                    case 4: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 取得聯盟統計歷史
    StatisticsService.getAllianceStatistics = function (allianceId_1) {
        return __awaiter(this, arguments, void 0, function (allianceId, days) {
            var startDate;
            if (days === void 0) { days = 30; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startDate = new Date();
                        startDate.setDate(startDate.getDate() - days);
                        return [4 /*yield*/, prisma.allianceStatistic.findMany({
                                where: {
                                    allianceId: allianceId,
                                    statisticDate: {
                                        gte: startDate,
                                    },
                                },
                                orderBy: { statisticDate: 'desc' },
                            })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 取得使用者統計
    StatisticsService.getUserStatistics = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var submissions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.timeslotSubmission.findMany({
                            where: { userId: userId },
                        })];
                    case 1:
                        submissions = _a.sent();
                        return [2 /*return*/, {
                                totalSubmissions: submissions.length,
                                totalFireSparkle: 0,
                                totalFireGem: 0,
                                totalResearchAccel: 0,
                                totalGeneralAccel: 0,
                                lastSubmission: submissions[0] || null,
                            }];
                }
            });
        });
    };
    // 取得全體聯盟統計 (按日期)
    StatisticsService.getAllAllianceStatisticsByDate = function (statisticDate) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.allianceStatistic.findMany({
                            where: {
                                statisticDate: {
                                    gte: new Date(statisticDate.setHours(0, 0, 0, 0)),
                                    lt: new Date(statisticDate.setHours(23, 59, 59, 999)),
                                },
                            },
                            orderBy: { totalFireSparkle: 'desc' },
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 取得排行榜
    StatisticsService.getLeaderboard = function (allianceId_1) {
        return __awaiter(this, arguments, void 0, function (allianceId, limit) {
            var where;
            if (limit === void 0) { limit = 20; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        where = allianceId ? { allianceId: allianceId } : {};
                        return [4 /*yield*/, prisma.allianceStatistic.findMany({
                                where: where,
                                orderBy: { totalFireSparkle: 'desc' },
                                take: limit,
                            })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return StatisticsService;
}());
exports.StatisticsService = StatisticsService;
exports.default = StatisticsService;
