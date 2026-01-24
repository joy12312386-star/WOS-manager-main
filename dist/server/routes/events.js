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
var event_service_1 = require("../services/event.service");
var auth_1 = require("../middleware/auth");
var router = (0, express_1.Router)();
// 取得所有場次（管理員用）
router.get('/all', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var events, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, event_service_1.EventService.getAllEvents()];
            case 1:
                events = _a.sent();
                res.json({ events: events });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('Error fetching events:', error_1);
                res.status(500).json({ error: 'Failed to fetch events' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 取得目前開放報名的場次（公開）
router.get('/open', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var events, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, event_service_1.EventService.getOpenEvents()];
            case 1:
                events = _a.sent();
                res.json({ events: events });
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('Error fetching open events:', error_2);
                res.status(500).json({ error: 'Failed to fetch open events' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 取得所有場次（公開，玩家查看用）- 不包括 disabled 狀態的場次
router.get('/public', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var events, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, event_service_1.EventService.getPublicEvents()];
            case 1:
                events = _a.sent();
                res.json({ events: events });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error('Error fetching public events:', error_3);
                res.status(500).json({ error: 'Failed to fetch public events' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 檢查是否可以報名
router.get('/can-register/:eventDate', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var eventDate, result, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                eventDate = Array.isArray(req.params.eventDate) ? req.params.eventDate[0] : req.params.eventDate;
                return [4 /*yield*/, event_service_1.EventService.canRegister(eventDate)];
            case 1:
                result = _a.sent();
                res.json(result);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error('Error checking registration:', error_4);
                res.status(500).json({ error: 'Failed to check registration status' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 取得單一場次
router.get('/:eventDate', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var eventDate, event_1, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                eventDate = Array.isArray(req.params.eventDate) ? req.params.eventDate[0] : req.params.eventDate;
                return [4 /*yield*/, event_service_1.EventService.getEvent(eventDate)];
            case 1:
                event_1 = _a.sent();
                if (!event_1) {
                    return [2 /*return*/, res.status(404).json({ error: 'Event not found' })];
                }
                res.json(event_1);
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                console.error('Error fetching event:', error_5);
                res.status(500).json({ error: 'Failed to fetch event' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 創建場次（管理員用）
router.post('/create', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, eventDate, title, registrationStart, registrationEnd, description, dayConfig, event_2, error_6;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, eventDate = _a.eventDate, title = _a.title, registrationStart = _a.registrationStart, registrationEnd = _a.registrationEnd, description = _a.description, dayConfig = _a.dayConfig;
                if (!eventDate || !registrationStart || !registrationEnd) {
                    return [2 /*return*/, res.status(400).json({ error: '缺少必要欄位：eventDate, registrationStart, registrationEnd' })];
                }
                return [4 /*yield*/, event_service_1.EventService.createEvent({
                        eventDate: eventDate,
                        title: title,
                        registrationStart: new Date(registrationStart),
                        registrationEnd: new Date(registrationEnd),
                        description: description,
                        dayConfig: dayConfig,
                    })];
            case 1:
                event_2 = _b.sent();
                res.json({ success: true, event: event_service_1.EventService.formatEvent(event_2) });
                return [3 /*break*/, 3];
            case 2:
                error_6 = _b.sent();
                console.error('Error creating event:', error_6);
                if (error_6.code === 'P2002') {
                    return [2 /*return*/, res.status(400).json({ error: '該日期的場次已存在' })];
                }
                res.status(500).json({ error: 'Failed to create event' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 更新場次（管理員用）
router.put('/:eventDate', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var eventDate, _a, title, status_1, registrationStart, registrationEnd, description, dayConfig, updateData, event_3, error_7;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                eventDate = Array.isArray(req.params.eventDate) ? req.params.eventDate[0] : req.params.eventDate;
                _a = req.body, title = _a.title, status_1 = _a.status, registrationStart = _a.registrationStart, registrationEnd = _a.registrationEnd, description = _a.description, dayConfig = _a.dayConfig;
                updateData = {};
                if (title !== undefined)
                    updateData.title = title;
                if (status_1 !== undefined)
                    updateData.status = status_1;
                if (registrationStart)
                    updateData.registrationStart = new Date(registrationStart);
                if (registrationEnd)
                    updateData.registrationEnd = new Date(registrationEnd);
                if (description !== undefined)
                    updateData.description = description;
                if (dayConfig !== undefined)
                    updateData.dayConfig = dayConfig;
                return [4 /*yield*/, event_service_1.EventService.updateEvent(eventDate, updateData)];
            case 1:
                event_3 = _b.sent();
                res.json({ success: true, event: event_service_1.EventService.formatEvent(event_3) });
                return [3 /*break*/, 3];
            case 2:
                error_7 = _b.sent();
                console.error('Error updating event:', error_7);
                res.status(500).json({ error: 'Failed to update event' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 更新場次狀態（管理員用）
router.patch('/:eventDate/status', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var eventDate, status_2, event_4, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                eventDate = Array.isArray(req.params.eventDate) ? req.params.eventDate[0] : req.params.eventDate;
                status_2 = req.body.status;
                if (!['open', 'closed', 'disabled'].includes(status_2)) {
                    return [2 /*return*/, res.status(400).json({ error: '無效的狀態值' })];
                }
                return [4 /*yield*/, event_service_1.EventService.updateEventStatus(eventDate, status_2)];
            case 1:
                event_4 = _a.sent();
                res.json({ success: true, event: event_4 });
                return [3 /*break*/, 3];
            case 2:
                error_8 = _a.sent();
                console.error('Error updating event status:', error_8);
                res.status(500).json({ error: 'Failed to update event status' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 刪除場次（管理員用）
router.delete('/:eventDate', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var eventDate, error_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                eventDate = Array.isArray(req.params.eventDate) ? req.params.eventDate[0] : req.params.eventDate;
                return [4 /*yield*/, event_service_1.EventService.deleteEvent(eventDate)];
            case 1:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 3];
            case 2:
                error_9 = _a.sent();
                console.error('Error deleting event:', error_9);
                res.status(500).json({ error: 'Failed to delete event' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 取得場次的每日活動配置
router.get('/:eventDate/day-config', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var eventDate, dayConfig, error_10;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                eventDate = Array.isArray(req.params.eventDate) ? req.params.eventDate[0] : req.params.eventDate;
                return [4 /*yield*/, event_service_1.EventService.getDayConfig(eventDate)];
            case 1:
                dayConfig = _a.sent();
                res.json({ dayConfig: dayConfig });
                return [3 /*break*/, 3];
            case 2:
                error_10 = _a.sent();
                console.error('Error fetching day config:', error_10);
                res.status(500).json({ error: 'Failed to fetch day config' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 更新場次的每日活動配置（管理員用）
router.put('/:eventDate/day-config', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var eventDate, dayConfig, event_5, error_11;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                eventDate = Array.isArray(req.params.eventDate) ? req.params.eventDate[0] : req.params.eventDate;
                dayConfig = req.body.dayConfig;
                if (!dayConfig || typeof dayConfig !== 'object') {
                    return [2 /*return*/, res.status(400).json({ error: '無效的活動配置' })];
                }
                return [4 /*yield*/, event_service_1.EventService.updateDayConfig(eventDate, dayConfig)];
            case 1:
                event_5 = _a.sent();
                res.json({ success: true, event: event_service_1.EventService.formatEvent(event_5) });
                return [3 /*break*/, 3];
            case 2:
                error_11 = _a.sent();
                console.error('Error updating day config:', error_11);
                res.status(500).json({ error: 'Failed to update day config' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 取得預設配置
router.get('/config/default', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var defaultConfig;
    return __generator(this, function (_a) {
        try {
            defaultConfig = event_service_1.EventService.getDefaultDayConfig();
            res.json({ dayConfig: defaultConfig });
        }
        catch (error) {
            console.error('Error fetching default config:', error);
            res.status(500).json({ error: 'Failed to fetch default config' });
        }
        return [2 /*return*/];
    });
}); });
exports.default = router;
