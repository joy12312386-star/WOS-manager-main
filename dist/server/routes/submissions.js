"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const submission_service_1 = require("../services/submission.service");
const event_service_1 = require("../services/event.service");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 建立新提交
router.post('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { fid, gameId, playerName, alliance, slots, eventDate } = req.body;
        if (!fid || !gameId || !playerName || !alliance || !slots) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // 如果沒有提供 eventDate，嘗試獲取當前開放的場次
        let finalEventDate = eventDate;
        if (!finalEventDate) {
            const openEvents = await event_service_1.EventService.getOpenEvents();
            if (openEvents.length > 0) {
                // 選擇最新的開放場次（而非最舊的）
                finalEventDate = openEvents[openEvents.length - 1].eventDate;
            }
        }
        const submission = await submission_service_1.SubmissionService.createSubmission(req.user.id, {
            fid,
            gameId,
            playerName,
            alliance,
            slots,
            eventDate: finalEventDate,
        });
        res.status(201).json(submission);
    }
    catch (error) {
        // 如果是重複報名的錯誤，返回 400
        if (error.message?.includes('已經報名過')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});
// 管理員代用戶建立提交
router.post('/admin-submit', auth_1.authMiddleware, auth_1.adminMiddleware, async (req, res) => {
    try {
        const { userId, fid, gameId, playerName, alliance, slots, eventDate } = req.body;
        if (!userId || !fid || !gameId || !playerName || !alliance || !slots) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        // 如果沒有提供 eventDate，嘗試獲取當前開放的場次
        let finalEventDate = eventDate;
        if (!finalEventDate) {
            const openEvents = await event_service_1.EventService.getOpenEvents();
            if (openEvents.length > 0) {
                // 選擇最新的開放場次（而非最舊的）
                finalEventDate = openEvents[openEvents.length - 1].eventDate;
            }
        }
        const submission = await submission_service_1.SubmissionService.createSubmission(userId, {
            fid,
            gameId,
            playerName,
            alliance,
            slots,
            eventDate: finalEventDate,
        });
        res.status(201).json(submission);
    }
    catch (error) {
        // 如果是重複報名的錯誤，返回 400
        if (error.message?.includes('已經報名過')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});
// 取得我的提交紀錄
router.get('/my', auth_1.authMiddleware, async (req, res) => {
    try {
        const submissions = await submission_service_1.SubmissionService.getSubmissionsByUser(req.user.id);
        res.json(submissions);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 取得所有提交 (管理員)
router.get('/all', auth_1.authMiddleware, auth_1.adminMiddleware, async (req, res) => {
    try {
        const submissions = await submission_service_1.SubmissionService.getAllSubmissions();
        res.json(submissions);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 更新提交
router.put('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const idStr = Array.isArray(id) ? id[0] : id;
        const { alliance, slots } = req.body;
        const updated = await submission_service_1.SubmissionService.updateSubmission(idStr, {
            alliance,
            slots,
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 管理員更新提交（可更新更多欄位）
router.put('/admin/:id', auth_1.authMiddleware, auth_1.adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const idStr = Array.isArray(id) ? id[0] : id;
        const { alliance, playerName, slots } = req.body;
        const updated = await submission_service_1.SubmissionService.adminUpdateSubmission(idStr, {
            alliance,
            playerName,
            slots,
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 刪除提交
router.delete('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const idStr = Array.isArray(id) ? id[0] : id;
        await submission_service_1.SubmissionService.deleteSubmission(idStr);
        res.json({ message: 'Submission deleted' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 取得每日摘要 (管理員)
router.get('/summary/:date', auth_1.authMiddleware, auth_1.adminMiddleware, async (req, res) => {
    try {
        const { date } = req.params;
        const dateStr = Array.isArray(date) ? date[0] : date;
        const summary = await submission_service_1.SubmissionService.getDailySubmissionSummary(new Date(dateStr));
        res.json(summary);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=submissions.js.map