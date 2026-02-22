"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const event_service_1 = require("../services/event.service");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 取得所有場次（管理員用）
router.get('/all', auth_1.authMiddleware, async (req, res) => {
    try {
        const events = await event_service_1.EventService.getAllEvents();
        res.json({ events });
    }
    catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});
// 取得目前開放報名的場次（公開）
router.get('/open', async (req, res) => {
    try {
        const events = await event_service_1.EventService.getOpenEvents();
        res.json({ events });
    }
    catch (error) {
        console.error('Error fetching open events:', error);
        res.status(500).json({ error: 'Failed to fetch open events' });
    }
});
// 取得所有場次（公開，玩家查看用）- 不包括 disabled 狀態的場次
router.get('/public', async (req, res) => {
    try {
        const events = await event_service_1.EventService.getPublicEvents();
        res.json({ events });
    }
    catch (error) {
        console.error('Error fetching public events:', error);
        res.status(500).json({ error: 'Failed to fetch public events' });
    }
});
// 檢查是否可以報名
router.get('/can-register/:eventDate', async (req, res) => {
    try {
        const eventDate = Array.isArray(req.params.eventDate) ? req.params.eventDate[0] : req.params.eventDate;
        const result = await event_service_1.EventService.canRegister(eventDate);
        res.json(result);
    }
    catch (error) {
        console.error('Error checking registration:', error);
        res.status(500).json({ error: 'Failed to check registration status' });
    }
});
// 取得單一場次
router.get('/:eventDate', async (req, res) => {
    try {
        const eventDate = Array.isArray(req.params.eventDate) ? req.params.eventDate[0] : req.params.eventDate;
        const event = await event_service_1.EventService.getEvent(eventDate);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json(event);
    }
    catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ error: 'Failed to fetch event' });
    }
});
// 創建場次（管理員用）
router.post('/create', auth_1.authMiddleware, async (req, res) => {
    try {
        const { eventDate, title, registrationStart, registrationEnd, description, dayConfig } = req.body;
        if (!eventDate || !registrationStart || !registrationEnd) {
            return res.status(400).json({ error: '缺少必要欄位：eventDate, registrationStart, registrationEnd' });
        }
        const event = await event_service_1.EventService.createEvent({
            eventDate,
            title,
            registrationStart: new Date(registrationStart),
            registrationEnd: new Date(registrationEnd),
            description,
            dayConfig,
        });
        res.json({ success: true, event: event_service_1.EventService.formatEvent(event) });
    }
    catch (error) {
        console.error('Error creating event:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: '該日期的場次已存在' });
        }
        res.status(500).json({ error: 'Failed to create event' });
    }
});
// 更新場次（管理員用）
router.put('/:eventDate', auth_1.authMiddleware, async (req, res) => {
    try {
        const eventDate = Array.isArray(req.params.eventDate) ? req.params.eventDate[0] : req.params.eventDate;
        const { title, status, registrationStart, registrationEnd, description, dayConfig } = req.body;
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (status !== undefined)
            updateData.status = status;
        if (registrationStart)
            updateData.registrationStart = new Date(registrationStart);
        if (registrationEnd)
            updateData.registrationEnd = new Date(registrationEnd);
        if (description !== undefined)
            updateData.description = description;
        if (dayConfig !== undefined)
            updateData.dayConfig = dayConfig;
        const event = await event_service_1.EventService.updateEvent(eventDate, updateData);
        res.json({ success: true, event: event_service_1.EventService.formatEvent(event) });
    }
    catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ error: 'Failed to update event' });
    }
});
// 更新場次狀態（管理員用）
router.patch('/:eventDate/status', auth_1.authMiddleware, async (req, res) => {
    try {
        const eventDate = Array.isArray(req.params.eventDate) ? req.params.eventDate[0] : req.params.eventDate;
        const { status } = req.body;
        if (!['open', 'closed', 'disabled'].includes(status)) {
            return res.status(400).json({ error: '無效的狀態值' });
        }
        const event = await event_service_1.EventService.updateEventStatus(eventDate, status);
        res.json({ success: true, event });
    }
    catch (error) {
        console.error('Error updating event status:', error);
        res.status(500).json({ error: 'Failed to update event status' });
    }
});
// 刪除場次（管理員用）
router.delete('/:eventDate', auth_1.authMiddleware, async (req, res) => {
    try {
        const eventDate = Array.isArray(req.params.eventDate) ? req.params.eventDate[0] : req.params.eventDate;
        await event_service_1.EventService.deleteEvent(eventDate);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});
// 取得場次的每日活動配置
router.get('/:eventDate/day-config', async (req, res) => {
    try {
        const eventDate = Array.isArray(req.params.eventDate) ? req.params.eventDate[0] : req.params.eventDate;
        const dayConfig = await event_service_1.EventService.getDayConfig(eventDate);
        res.json({ dayConfig });
    }
    catch (error) {
        console.error('Error fetching day config:', error);
        res.status(500).json({ error: 'Failed to fetch day config' });
    }
});
// 更新場次的每日活動配置（管理員用）
router.put('/:eventDate/day-config', auth_1.authMiddleware, async (req, res) => {
    try {
        const eventDate = Array.isArray(req.params.eventDate) ? req.params.eventDate[0] : req.params.eventDate;
        const { dayConfig } = req.body;
        if (!dayConfig || typeof dayConfig !== 'object') {
            return res.status(400).json({ error: '無效的活動配置' });
        }
        const event = await event_service_1.EventService.updateDayConfig(eventDate, dayConfig);
        res.json({ success: true, event: event_service_1.EventService.formatEvent(event) });
    }
    catch (error) {
        console.error('Error updating day config:', error);
        res.status(500).json({ error: 'Failed to update day config' });
    }
});
// 取得預設配置
router.get('/config/default', async (_req, res) => {
    try {
        const defaultConfig = event_service_1.EventService.getDefaultDayConfig();
        res.json({ dayConfig: defaultConfig });
    }
    catch (error) {
        console.error('Error fetching default config:', error);
        res.status(500).json({ error: 'Failed to fetch default config' });
    }
});
exports.default = router;
//# sourceMappingURL=events.js.map