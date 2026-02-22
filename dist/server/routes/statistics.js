"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const statistics_service_1 = __importDefault(require("../services/statistics.service"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 取得我的統計
router.get('/me', auth_1.authMiddleware, async (req, res) => {
    try {
        const stats = await statistics_service_1.default.getUserStatistics(req.user.id);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 建立/更新聯盟統計 (管理員)
router.post('/alliance', auth_1.authMiddleware, auth_1.adminMiddleware, async (req, res) => {
    try {
        const { allianceId, allianceName, totalMembersT11, totalMembersT10, totalMembers, totalFireSparkle, totalFireGem, totalResearchAccel, totalGeneralAccel, statisticDate, } = req.body;
        const statistic = await statistics_service_1.default.upsertAllianceStatistic(req.user.id, {
            allianceId,
            allianceName,
            totalMembersT11,
            totalMembersT10,
            totalMembers,
            totalFireSparkle,
            totalFireGem,
            totalResearchAccel,
            totalGeneralAccel,
            statisticDate: new Date(statisticDate),
        });
        res.json(statistic);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 取得聯盟統計歷史
router.get('/alliance/:allianceId', auth_1.authMiddleware, async (req, res) => {
    try {
        const { allianceId } = req.params;
        const allianceIdStr = Array.isArray(allianceId) ? allianceId[0] : allianceId;
        const days = req.query.days ? parseInt(req.query.days) : 30;
        const stats = await statistics_service_1.default.getAllianceStatistics(allianceIdStr, days);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 取得所有聯盟統計 (按日期)
router.get('/date/:date', auth_1.authMiddleware, auth_1.adminMiddleware, async (req, res) => {
    try {
        const { date } = req.params;
        const dateStr = Array.isArray(date) ? date[0] : date;
        const stats = await statistics_service_1.default.getAllAllianceStatisticsByDate(new Date(dateStr));
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 取得排行榜
router.get('/leaderboard', async (req, res) => {
    try {
        const allianceId = req.query.allianceId;
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;
        const stats = await statistics_service_1.default.getLeaderboard(allianceId, limit);
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=statistics.js.map