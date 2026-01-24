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
exports.SubmissionService = void 0;
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
var SubmissionService = /** @class */ (function () {
    function SubmissionService() {
    }
    // 檢查是否已有該使用者、該星期幾的報名
    SubmissionService.checkExistingSubmission = function (userId, dayKey) {
        return __awaiter(this, void 0, void 0, function () {
            var submissions, _i, submissions_1, submission, slots;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.timeslotSubmission.findMany({
                            where: { userId: userId },
                        })];
                    case 1:
                        submissions = _a.sent();
                        // 檢查是否有相同星期幾的報名
                        for (_i = 0, submissions_1 = submissions; _i < submissions_1.length; _i++) {
                            submission = submissions_1[_i];
                            slots = JSON.parse(submission.slotsData);
                            if (slots[dayKey] && slots[dayKey].checked) {
                                return [2 /*return*/, { exists: true, submissionId: submission.id }];
                            }
                        }
                        return [2 /*return*/, { exists: false }];
                }
            });
        });
    };
    // 建立報名提交
    SubmissionService.createSubmission = function (userId, data) {
        return __awaiter(this, void 0, void 0, function () {
            var dayKeys, _i, dayKeys_1, dayKey, existing, dayNames;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        dayKeys = Object.keys(data.slots).filter(function (key) { var _a; return (_a = data.slots[key]) === null || _a === void 0 ? void 0 : _a.checked; });
                        _i = 0, dayKeys_1 = dayKeys;
                        _a.label = 1;
                    case 1:
                        if (!(_i < dayKeys_1.length)) return [3 /*break*/, 4];
                        dayKey = dayKeys_1[_i];
                        return [4 /*yield*/, this.checkExistingSubmission(userId, dayKey)];
                    case 2:
                        existing = _a.sent();
                        if (existing.exists) {
                            dayNames = {
                                monday: '週一',
                                tuesday: '週二',
                                wednesday: '週三',
                                thursday: '週四',
                                friday: '週五',
                                saturday: '週六',
                                sunday: '週日'
                            };
                            throw new Error("\u60A8\u5DF2\u7D93\u5831\u540D\u904E".concat(dayNames[dayKey] || dayKey, "\uFF0C\u8ACB\u4F7F\u7528\u7DE8\u8F2F\u529F\u80FD\u4FEE\u6539\u73FE\u6709\u5831\u540D"));
                        }
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [4 /*yield*/, prisma.timeslotSubmission.create({
                            data: {
                                userId: userId,
                                fid: data.fid,
                                gameId: data.gameId,
                                playerName: data.playerName,
                                alliance: data.alliance,
                                eventDate: data.eventDate,
                                slotsData: JSON.stringify(data.slots),
                            },
                        })];
                    case 5: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 取得使用者提交紀錄
    SubmissionService.getSubmissionsByUser = function (userId) {
        return __awaiter(this, void 0, void 0, function () {
            var submissions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.timeslotSubmission.findMany({
                            where: { userId: userId },
                            orderBy: { createdAt: 'desc' },
                        })];
                    case 1:
                        submissions = _a.sent();
                        return [2 /*return*/, submissions.map(function (s) { return (__assign(__assign({}, s), { slots: JSON.parse(s.slotsData), submittedAt: new Date(s.createdAt).getTime() })); })];
                }
            });
        });
    };
    // 取得所有提交（管理員用）
    SubmissionService.getAllSubmissions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var submissions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.timeslotSubmission.findMany({
                            include: {
                                user: {
                                    select: {
                                        gameId: true,
                                        nickname: true,
                                        allianceName: true,
                                        avatarImage: true,
                                        stoveLv: true,
                                    },
                                },
                            },
                            orderBy: { createdAt: 'desc' },
                        })];
                    case 1:
                        submissions = _a.sent();
                        return [2 /*return*/, submissions.map(function (s) { return (__assign(__assign({}, s), { eventDate: s.eventDate, slots: JSON.parse(s.slotsData), submittedAt: new Date(s.createdAt).getTime() })); })];
                }
            });
        });
    };
    // 更新提交
    SubmissionService.updateSubmission = function (submissionId, data) {
        return __awaiter(this, void 0, void 0, function () {
            var updateData, updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        updateData = {};
                        if (data.alliance)
                            updateData.alliance = data.alliance;
                        if (data.slots)
                            updateData.slotsData = JSON.stringify(data.slots);
                        return [4 /*yield*/, prisma.timeslotSubmission.update({
                                where: { id: submissionId },
                                data: updateData,
                            })];
                    case 1:
                        updated = _a.sent();
                        return [2 /*return*/, __assign(__assign({}, updated), { slots: JSON.parse(updated.slotsData) })];
                }
            });
        });
    };
    // 刪除提交
    SubmissionService.deleteSubmission = function (submissionId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.timeslotSubmission.delete({
                            where: { id: submissionId },
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 取得每日提交摘要
    SubmissionService.getDailySubmissionSummary = function (reportDate) {
        return __awaiter(this, void 0, void 0, function () {
            var submissions, totalFireSparkle, totalFireGem, totalResearchAccel, totalGeneralAccel, _i, submissions_2, submission, slots, _a, _b, daySlot, slot, minutes, minutes;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, prisma.timeslotSubmission.findMany({
                            where: {
                                createdAt: {
                                    gte: new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate(), 0, 0, 0, 0),
                                    lt: new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate(), 23, 59, 59, 999),
                                },
                            },
                        })];
                    case 1:
                        submissions = _c.sent();
                        totalFireSparkle = 0;
                        totalFireGem = 0;
                        totalResearchAccel = 0;
                        totalGeneralAccel = 0;
                        for (_i = 0, submissions_2 = submissions; _i < submissions_2.length; _i++) {
                            submission = submissions_2[_i];
                            slots = JSON.parse(submission.slotsData);
                            for (_a = 0, _b = Object.values(slots); _a < _b.length; _a++) {
                                daySlot = _b[_a];
                                slot = daySlot;
                                if (slot === null || slot === void 0 ? void 0 : slot.fireSparkleCount)
                                    totalFireSparkle += slot.fireSparkleCount;
                                if (slot === null || slot === void 0 ? void 0 : slot.fireGemCount)
                                    totalFireGem += slot.fireGemCount;
                                if (slot === null || slot === void 0 ? void 0 : slot.researchAccel) {
                                    minutes = (slot.researchAccel.days || 0) * 1440 + (slot.researchAccel.hours || 0) * 60 + (slot.researchAccel.minutes || 0);
                                    totalResearchAccel += minutes;
                                }
                                if (slot === null || slot === void 0 ? void 0 : slot.generalAccel) {
                                    minutes = (slot.generalAccel.days || 0) * 1440 + (slot.generalAccel.hours || 0) * 60 + (slot.generalAccel.minutes || 0);
                                    totalGeneralAccel += minutes;
                                }
                            }
                        }
                        return [2 /*return*/, {
                                date: reportDate,
                                totalSubmissions: submissions.length,
                                totalFireSparkle: totalFireSparkle,
                                totalFireGem: totalFireGem,
                                totalResearchAccel: totalResearchAccel,
                                totalGeneralAccel: totalGeneralAccel,
                                averageFireSparkle: submissions.length > 0 ? Math.round(totalFireSparkle / submissions.length) : 0,
                            }];
                }
            });
        });
    };
    return SubmissionService;
}());
exports.SubmissionService = SubmissionService;
exports.default = SubmissionService;
