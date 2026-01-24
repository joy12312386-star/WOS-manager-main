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
var officer_service_1 = require("../services/officer.service");
var auth_1 = require("../middleware/auth");
var router = (0, express_1.Router)();
// 取得所有場次日期
router.get('/dates', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var dates, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, officer_service_1.OfficerService.getEventDates()];
            case 1:
                dates = _a.sent();
                res.json({ dates: dates });
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('Error fetching event dates:', error_1);
                res.status(500).json({ error: 'Failed to fetch event dates' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 取得指定日期的官職配置
router.get('/:eventDate', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var eventDate, assignments, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                eventDate = Array.isArray(req.params.eventDate) ? req.params.eventDate[0] : req.params.eventDate;
                return [4 /*yield*/, officer_service_1.OfficerService.getAssignmentsByDate(eventDate)];
            case 1:
                assignments = _a.sent();
                res.json(assignments);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error('Error fetching assignments:', error_2);
                res.status(500).json({ error: 'Failed to fetch assignments' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 保存官職配置
router.post('/save', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, eventDate, utcOffset, officers, results, error_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, eventDate = _a.eventDate, utcOffset = _a.utcOffset, officers = _a.officers;
                if (!eventDate) {
                    return [2 /*return*/, res.status(400).json({ error: 'Event date is required' })];
                }
                return [4 /*yield*/, officer_service_1.OfficerService.saveAllAssignments(eventDate, utcOffset || '00:00', officers || {})];
            case 1:
                results = _b.sent();
                res.json({ success: true, saved: results.length });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _b.sent();
                console.error('Error saving assignments:', error_3);
                res.status(500).json({ error: 'Failed to save assignments' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 刪除指定日期的配置
router.delete('/:eventDate', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var eventDate, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                eventDate = Array.isArray(req.params.eventDate) ? req.params.eventDate[0] : req.params.eventDate;
                return [4 /*yield*/, officer_service_1.OfficerService.deleteByDate(eventDate)];
            case 1:
                _a.sent();
                res.json({ success: true });
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error('Error deleting assignments:', error_4);
                res.status(500).json({ error: 'Failed to delete assignments' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
