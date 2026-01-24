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
exports.OfficerService = void 0;
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
var OfficerService = /** @class */ (function () {
    function OfficerService() {
    }
    // 取得指定日期的官職配置
    OfficerService.getAssignment = function (eventDate, officerType) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.officerAssignment.findUnique({
                            where: {
                                eventDate_officerType: {
                                    eventDate: eventDate,
                                    officerType: officerType,
                                },
                            },
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 取得指定日期的所有官職配置
    OfficerService.getAssignmentsByDate = function (eventDate) {
        return __awaiter(this, void 0, void 0, function () {
            var assignments, result, _i, assignments_1, assignment;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.officerAssignment.findMany({
                            where: { eventDate: eventDate },
                        })];
                    case 1:
                        assignments = _a.sent();
                        result = {};
                        for (_i = 0, assignments_1 = assignments; _i < assignments_1.length; _i++) {
                            assignment = assignments_1[_i];
                            result["".concat(assignment.officerType, "_slots")] = JSON.parse(assignment.slotsData);
                            result["".concat(assignment.officerType, "_utcOffset")] = assignment.utcOffset;
                        }
                        return [2 /*return*/, result];
                }
            });
        });
    };
    // 保存官職配置
    OfficerService.saveAssignment = function (eventDate, officerType, utcOffset, slotsData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.officerAssignment.upsert({
                            where: {
                                eventDate_officerType: {
                                    eventDate: eventDate,
                                    officerType: officerType,
                                },
                            },
                            update: {
                                utcOffset: utcOffset,
                                slotsData: JSON.stringify(slotsData),
                            },
                            create: {
                                eventDate: eventDate,
                                officerType: officerType,
                                utcOffset: utcOffset,
                                slotsData: JSON.stringify(slotsData),
                            },
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 保存所有官職配置（批量）
    OfficerService.saveAllAssignments = function (eventDate, utcOffset, officers) {
        return __awaiter(this, void 0, void 0, function () {
            var types, results, _i, types_1, type, key, slotsData, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        types = ['research', 'training', 'building'];
                        results = [];
                        _i = 0, types_1 = types;
                        _a.label = 1;
                    case 1:
                        if (!(_i < types_1.length)) return [3 /*break*/, 4];
                        type = types_1[_i];
                        key = "".concat(type, "_slots");
                        slotsData = officers[key] || [];
                        return [4 /*yield*/, this.saveAssignment(eventDate, type, utcOffset, slotsData)];
                    case 2:
                        result = _a.sent();
                        results.push(result);
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, results];
                }
            });
        });
    };
    // 取得所有場次日期列表
    OfficerService.getEventDates = function () {
        return __awaiter(this, void 0, void 0, function () {
            var assignments;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.officerAssignment.findMany({
                            select: { eventDate: true },
                            distinct: ['eventDate'],
                            orderBy: { eventDate: 'desc' },
                        })];
                    case 1:
                        assignments = _a.sent();
                        return [2 /*return*/, assignments.map(function (a) { return a.eventDate; })];
                }
            });
        });
    };
    // 刪除指定日期的所有配置
    OfficerService.deleteByDate = function (eventDate) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.officerAssignment.deleteMany({
                            where: { eventDate: eventDate },
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return OfficerService;
}());
exports.OfficerService = OfficerService;
