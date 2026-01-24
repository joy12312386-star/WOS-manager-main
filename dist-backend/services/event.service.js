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
exports.EventService = exports.DEFAULT_DAY_CONFIG = void 0;
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
// 預設每週活動配置
exports.DEFAULT_DAY_CONFIG = {
    monday: 'building',
    tuesday: 'research',
    wednesday: 'training',
    thursday: 'training',
    friday: 'building',
    saturday: 'research',
    sunday: 'research'
};
var EventService = /** @class */ (function () {
    function EventService() {
    }
    // 取得所有場次
    EventService.getAllEvents = function () {
        return __awaiter(this, void 0, void 0, function () {
            var events, now, updatedEvents, _i, events_1, event_1, updated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.event.findMany({
                            orderBy: { eventDate: 'desc' },
                        })];
                    case 1:
                        events = _a.sent();
                        now = new Date();
                        updatedEvents = [];
                        _i = 0, events_1 = events;
                        _a.label = 2;
                    case 2:
                        if (!(_i < events_1.length)) return [3 /*break*/, 6];
                        event_1 = events_1[_i];
                        if (!(event_1.status === 'open' && new Date(event_1.registrationEnd) < now)) return [3 /*break*/, 4];
                        return [4 /*yield*/, prisma.event.update({
                                where: { id: event_1.id },
                                data: { status: 'closed' },
                            })];
                    case 3:
                        updated = _a.sent();
                        updatedEvents.push(this.formatEvent(updated));
                        return [3 /*break*/, 5];
                    case 4:
                        updatedEvents.push(this.formatEvent(event_1));
                        _a.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 2];
                    case 6: return [2 /*return*/, updatedEvents];
                }
            });
        });
    };
    // 取得單一場次
    EventService.getEvent = function (eventDate) {
        return __awaiter(this, void 0, void 0, function () {
            var event;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.event.findUnique({
                            where: { eventDate: eventDate },
                        })];
                    case 1:
                        event = _a.sent();
                        if (!(event && event.status === 'open' && new Date(event.registrationEnd) < new Date())) return [3 /*break*/, 3];
                        return [4 /*yield*/, prisma.event.update({
                                where: { id: event.id },
                                data: { status: 'closed' },
                            })];
                    case 2: 
                    // 自動更新為截止
                    return [2 /*return*/, _a.sent()];
                    case 3: return [2 /*return*/, event];
                }
            });
        });
    };
    // 取得目前開放報名的場次
    EventService.getOpenEvents = function () {
        return __awaiter(this, void 0, void 0, function () {
            var now;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        now = new Date();
                        // 先自動更新過期的場次
                        return [4 /*yield*/, prisma.event.updateMany({
                                where: {
                                    status: 'open',
                                    registrationEnd: { lt: now },
                                },
                                data: { status: 'closed' },
                            })];
                    case 1:
                        // 先自動更新過期的場次
                        _a.sent();
                        return [4 /*yield*/, prisma.event.findMany({
                                where: {
                                    status: 'open',
                                    registrationStart: { lte: now },
                                    registrationEnd: { gte: now },
                                },
                                orderBy: { eventDate: 'asc' },
                            })];
                    case 2: 
                    // 取得開放報名且在報名時間內的場次
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 取得所有公開可見的場次（open 和 closed，不包括 disabled）
    EventService.getPublicEvents = function () {
        return __awaiter(this, void 0, void 0, function () {
            var now;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        now = new Date();
                        // 先自動更新過期的場次
                        return [4 /*yield*/, prisma.event.updateMany({
                                where: {
                                    status: 'open',
                                    registrationEnd: { lt: now },
                                },
                                data: { status: 'closed' },
                            })];
                    case 1:
                        // 先自動更新過期的場次
                        _a.sent();
                        return [4 /*yield*/, prisma.event.findMany({
                                where: {
                                    status: { in: ['open', 'closed'] },
                                },
                                orderBy: { eventDate: 'asc' },
                            })];
                    case 2: 
                    // 取得所有非 disabled 的場次
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 創建場次
    EventService.createEvent = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.event.create({
                            data: {
                                eventDate: data.eventDate,
                                title: data.title,
                                registrationStart: data.registrationStart,
                                registrationEnd: data.registrationEnd,
                                description: data.description,
                                status: 'open',
                                dayConfig: JSON.stringify(data.dayConfig || exports.DEFAULT_DAY_CONFIG),
                            },
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 更新場次
    EventService.updateEvent = function (eventDate, data) {
        return __awaiter(this, void 0, void 0, function () {
            var updateData;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        updateData = __assign({}, data);
                        if (data.dayConfig) {
                            updateData.dayConfig = JSON.stringify(data.dayConfig);
                        }
                        return [4 /*yield*/, prisma.event.update({
                                where: { eventDate: eventDate },
                                data: updateData,
                            })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 更新場次狀態
    EventService.updateEventStatus = function (eventDate, status) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.event.update({
                            where: { eventDate: eventDate },
                            data: { status: status },
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 刪除場次
    EventService.deleteEvent = function (eventDate) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.event.delete({
                            where: { eventDate: eventDate },
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 檢查是否可以報名
    EventService.canRegister = function (eventDate) {
        return __awaiter(this, void 0, void 0, function () {
            var event, now;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getEvent(eventDate)];
                    case 1:
                        event = _a.sent();
                        if (!event) {
                            return [2 /*return*/, { canRegister: false, reason: '場次不存在' }];
                        }
                        if (event.status === 'disabled') {
                            return [2 /*return*/, { canRegister: false, reason: '場次已關閉' }];
                        }
                        if (event.status === 'closed') {
                            return [2 /*return*/, { canRegister: false, reason: '報名已截止' }];
                        }
                        now = new Date();
                        if (new Date(event.registrationStart) > now) {
                            return [2 /*return*/, { canRegister: false, reason: '報名尚未開始' }];
                        }
                        if (new Date(event.registrationEnd) < now) {
                            return [2 /*return*/, { canRegister: false, reason: '報名已截止' }];
                        }
                        return [2 /*return*/, { canRegister: true }];
                }
            });
        });
    };
    // 取得場次的每日活動配置
    EventService.getDayConfig = function (eventDate) {
        return __awaiter(this, void 0, void 0, function () {
            var event;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getEvent(eventDate)];
                    case 1:
                        event = _a.sent();
                        if (event && event.dayConfig) {
                            try {
                                return [2 /*return*/, JSON.parse(event.dayConfig)];
                            }
                            catch (_b) {
                                return [2 /*return*/, exports.DEFAULT_DAY_CONFIG];
                            }
                        }
                        return [2 /*return*/, exports.DEFAULT_DAY_CONFIG];
                }
            });
        });
    };
    // 更新場次的每日活動配置
    EventService.updateDayConfig = function (eventDate, dayConfig) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.event.update({
                            where: { eventDate: eventDate },
                            data: { dayConfig: JSON.stringify(dayConfig) },
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    // 取得預設配置
    EventService.getDefaultDayConfig = function () {
        return __assign({}, exports.DEFAULT_DAY_CONFIG);
    };
    // 格式化事件回傳（解析 dayConfig JSON）
    EventService.formatEvent = function (event) {
        if (!event)
            return null;
        return __assign(__assign({}, event), { dayConfig: event.dayConfig ? JSON.parse(event.dayConfig) : exports.DEFAULT_DAY_CONFIG });
    };
    return EventService;
}());
exports.EventService = EventService;
