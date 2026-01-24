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
var submission_service_1 = require("../services/submission.service");
var event_service_1 = require("../services/event.service");
var auth_1 = require("../middleware/auth");
var router = (0, express_1.Router)();
// 建立新提交
router.post('/', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, fid, gameId, playerName, alliance, slots, eventDate, finalEventDate, openEvents, submission, error_1;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 4, , 5]);
                _a = req.body, fid = _a.fid, gameId = _a.gameId, playerName = _a.playerName, alliance = _a.alliance, slots = _a.slots, eventDate = _a.eventDate;
                if (!fid || !gameId || !playerName || !alliance || !slots) {
                    return [2 /*return*/, res.status(400).json({ error: 'Missing required fields' })];
                }
                finalEventDate = eventDate;
                if (!!finalEventDate) return [3 /*break*/, 2];
                return [4 /*yield*/, event_service_1.EventService.getOpenEvents()];
            case 1:
                openEvents = _c.sent();
                if (openEvents.length > 0) {
                    finalEventDate = openEvents[0].eventDate;
                }
                _c.label = 2;
            case 2: return [4 /*yield*/, submission_service_1.SubmissionService.createSubmission(req.user.id, {
                    fid: fid,
                    gameId: gameId,
                    playerName: playerName,
                    alliance: alliance,
                    slots: slots,
                    eventDate: finalEventDate,
                })];
            case 3:
                submission = _c.sent();
                res.status(201).json(submission);
                return [3 /*break*/, 5];
            case 4:
                error_1 = _c.sent();
                // 如果是重複報名的錯誤，返回 400
                if ((_b = error_1.message) === null || _b === void 0 ? void 0 : _b.includes('已經報名過')) {
                    return [2 /*return*/, res.status(400).json({ error: error_1.message })];
                }
                res.status(500).json({ error: error_1.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// 管理員代用戶建立提交
router.post('/admin-submit', auth_1.authMiddleware, auth_1.adminMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, userId, fid, gameId, playerName, alliance, slots, eventDate, finalEventDate, openEvents, submission, error_2;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 4, , 5]);
                _a = req.body, userId = _a.userId, fid = _a.fid, gameId = _a.gameId, playerName = _a.playerName, alliance = _a.alliance, slots = _a.slots, eventDate = _a.eventDate;
                if (!userId || !fid || !gameId || !playerName || !alliance || !slots) {
                    return [2 /*return*/, res.status(400).json({ error: 'Missing required fields' })];
                }
                finalEventDate = eventDate;
                if (!!finalEventDate) return [3 /*break*/, 2];
                return [4 /*yield*/, event_service_1.EventService.getOpenEvents()];
            case 1:
                openEvents = _c.sent();
                if (openEvents.length > 0) {
                    finalEventDate = openEvents[0].eventDate;
                }
                _c.label = 2;
            case 2: return [4 /*yield*/, submission_service_1.SubmissionService.createSubmission(userId, {
                    fid: fid,
                    gameId: gameId,
                    playerName: playerName,
                    alliance: alliance,
                    slots: slots,
                    eventDate: finalEventDate,
                })];
            case 3:
                submission = _c.sent();
                res.status(201).json(submission);
                return [3 /*break*/, 5];
            case 4:
                error_2 = _c.sent();
                // 如果是重複報名的錯誤，返回 400
                if ((_b = error_2.message) === null || _b === void 0 ? void 0 : _b.includes('已經報名過')) {
                    return [2 /*return*/, res.status(400).json({ error: error_2.message })];
                }
                res.status(500).json({ error: error_2.message });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// 取得我的提交紀錄
router.get('/my', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var submissions, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, submission_service_1.SubmissionService.getSubmissionsByUser(req.user.id)];
            case 1:
                submissions = _a.sent();
                res.json(submissions);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                res.status(500).json({ error: error_3.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 取得所有提交 (管理員)
router.get('/all', auth_1.authMiddleware, auth_1.adminMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var submissions, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, submission_service_1.SubmissionService.getAllSubmissions()];
            case 1:
                submissions = _a.sent();
                res.json(submissions);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                res.status(500).json({ error: error_4.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 更新提交
router.put('/:id', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, idStr, _a, alliance, slots, updated, error_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                id = req.params.id;
                idStr = Array.isArray(id) ? id[0] : id;
                _a = req.body, alliance = _a.alliance, slots = _a.slots;
                return [4 /*yield*/, submission_service_1.SubmissionService.updateSubmission(idStr, {
                        alliance: alliance,
                        slots: slots,
                    })];
            case 1:
                updated = _b.sent();
                res.json(updated);
                return [3 /*break*/, 3];
            case 2:
                error_5 = _b.sent();
                res.status(500).json({ error: error_5.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 刪除提交
router.delete('/:id', auth_1.authMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, idStr, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                idStr = Array.isArray(id) ? id[0] : id;
                return [4 /*yield*/, submission_service_1.SubmissionService.deleteSubmission(idStr)];
            case 1:
                _a.sent();
                res.json({ message: 'Submission deleted' });
                return [3 /*break*/, 3];
            case 2:
                error_6 = _a.sent();
                res.status(500).json({ error: error_6.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// 取得每日摘要 (管理員)
router.get('/summary/:date', auth_1.authMiddleware, auth_1.adminMiddleware, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var date, dateStr, summary, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                date = req.params.date;
                dateStr = Array.isArray(date) ? date[0] : date;
                return [4 /*yield*/, submission_service_1.SubmissionService.getDailySubmissionSummary(new Date(dateStr))];
            case 1:
                summary = _a.sent();
                res.json(summary);
                return [3 /*break*/, 3];
            case 2:
                error_7 = _a.sent();
                res.status(500).json({ error: error_7.message });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
