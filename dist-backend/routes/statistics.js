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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var statistics_service_1 = __importDefault(require("../services/statistics.service"));
var auth_1 = require("../middleware/auth");
var router = (0, express_1.Router)();
// 取得我的統計
router.get('/me', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var stats, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, statistics_service_1.default.getUserStatistics(req.user.id)];
            case 1:
                stats = _a.sent();
                res.json(stats);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                res.status(500).json({ error: error_1.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 建立/更新聯盟統計 (管理員)
router.post('/alliance', auth_1.authMiddleware, auth_1.adminMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, allianceId, allianceName, totalMembersT11, totalMembersT10, totalMembers, totalFireSparkle, totalFireGem, totalResearchAccel, totalGeneralAccel, statisticDate, statistic, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, allianceId = _a.allianceId, allianceName = _a.allianceName, totalMembersT11 = _a.totalMembersT11, totalMembersT10 = _a.totalMembersT10, totalMembers = _a.totalMembers, totalFireSparkle = _a.totalFireSparkle, totalFireGem = _a.totalFireGem, totalResearchAccel = _a.totalResearchAccel, totalGeneralAccel = _a.totalGeneralAccel, statisticDate = _a.statisticDate;
                return [4 /*yield*/, statistics_service_1.default.upsertAllianceStatistic(req.user.id, {
                        allianceId: allianceId,
                        allianceName: allianceName,
                        totalMembersT11: totalMembersT11,
                        totalMembersT10: totalMembersT10,
                        totalMembers: totalMembers,
                        totalFireSparkle: totalFireSparkle,
                        totalFireGem: totalFireGem,
                        totalResearchAccel: totalResearchAccel,
                        totalGeneralAccel: totalGeneralAccel,
                        statisticDate: new Date(statisticDate),
                    })];
            case 1:
                statistic = _b.sent();
                res.json(statistic);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _b.sent();
                res.status(500).json({ error: error_2.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 取得聯盟統計歷史
router.get('/alliance/:allianceId', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var allianceId, allianceIdStr, days, stats, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                allianceId = req.params.allianceId;
                allianceIdStr = Array.isArray(allianceId) ? allianceId[0] : allianceId;
                days = req.query.days ? parseInt(req.query.days) : 30;
                return [4 /*yield*/, statistics_service_1.default.getAllianceStatistics(allianceIdStr, days)];
            case 1:
                stats = _a.sent();
                res.json(stats);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                res.status(500).json({ error: error_3.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 取得所有聯盟統計 (按日期)
router.get('/date/:date', auth_1.authMiddleware, auth_1.adminMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var date, dateStr, stats, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                date = req.params.date;
                dateStr = Array.isArray(date) ? date[0] : date;
                return [4 /*yield*/, statistics_service_1.default.getAllAllianceStatisticsByDate(new Date(dateStr))];
            case 1:
                stats = _a.sent();
                res.json(stats);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                res.status(500).json({ error: error_4.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 取得排行榜
router.get('/leaderboard', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var allianceId, limit, stats, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                allianceId = req.query.allianceId;
                limit = req.query.limit ? parseInt(req.query.limit) : 20;
                return [4 /*yield*/, statistics_service_1.default.getLeaderboard(allianceId, limit)];
            case 1:
                stats = _a.sent();
                res.json(stats);
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                res.status(500).json({ error: error_5.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
