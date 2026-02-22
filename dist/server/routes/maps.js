"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// 公開查看地圖（不需要登入）
router.get('/public/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const map = await prisma.allianceMap.findUnique({
            where: { id }
        });
        if (!map) {
            return res.status(404).json({ error: 'Map not found' });
        }
        // 只有開放狀態的地圖可以公開查看
        if (map.status !== 'open') {
            return res.status(403).json({ error: 'This map is not publicly available' });
        }
        // 解析 JSON 欄位
        res.json({
            id: map.id,
            title: map.title,
            status: map.status,
            alliances: JSON.parse(map.alliances || '[]'),
            gridData: JSON.parse(map.gridData || '{}'),
            gridOwners: JSON.parse(map.gridOwners || '{}'),
        });
    }
    catch (error) {
        console.error('Error fetching public map:', error);
        res.status(500).json({ error: error.message });
    }
});
// 獲取所有地圖列表
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const maps = await prisma.allianceMap.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            }
        });
        res.json(maps);
    }
    catch (error) {
        console.error('Error fetching maps:', error);
        res.status(500).json({ error: error.message });
    }
});
// 獲取單個地圖詳情
router.get('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const map = await prisma.allianceMap.findUnique({
            where: { id }
        });
        if (!map) {
            return res.status(404).json({ error: 'Map not found' });
        }
        // 解析 JSON 欄位
        res.json({
            ...map,
            alliances: JSON.parse(map.alliances || '[]'),
            gridData: JSON.parse(map.gridData || '{}'),
            gridOwners: JSON.parse(map.gridOwners || '{}'),
        });
    }
    catch (error) {
        console.error('Error fetching map:', error);
        res.status(500).json({ error: error.message });
    }
});
// 創建新地圖
router.post('/', auth_1.authMiddleware, auth_1.adminMiddleware, async (req, res) => {
    try {
        const { title, alliances, gridData, gridOwners, status } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        const map = await prisma.allianceMap.create({
            data: {
                title,
                status: status || 'open',
                alliances: JSON.stringify(alliances || []),
                gridData: JSON.stringify(gridData || {}),
                gridOwners: JSON.stringify(gridOwners || {}),
            }
        });
        res.json({
            ...map,
            alliances: JSON.parse(map.alliances),
            gridData: JSON.parse(map.gridData),
            gridOwners: JSON.parse(map.gridOwners),
        });
    }
    catch (error) {
        console.error('Error creating map:', error);
        res.status(500).json({ error: error.message });
    }
});
// 更新地圖
router.put('/:id', auth_1.authMiddleware, auth_1.adminMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const { title, alliances, gridData, gridOwners, status } = req.body;
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (status !== undefined)
            updateData.status = status;
        if (alliances !== undefined)
            updateData.alliances = JSON.stringify(alliances);
        if (gridData !== undefined)
            updateData.gridData = JSON.stringify(gridData);
        if (gridOwners !== undefined)
            updateData.gridOwners = JSON.stringify(gridOwners);
        const map = await prisma.allianceMap.update({
            where: { id },
            data: updateData,
        });
        res.json({
            ...map,
            alliances: JSON.parse(map.alliances),
            gridData: JSON.parse(map.gridData),
            gridOwners: JSON.parse(map.gridOwners),
        });
    }
    catch (error) {
        console.error('Error updating map:', error);
        res.status(500).json({ error: error.message });
    }
});
// 刪除地圖
router.delete('/:id', auth_1.authMiddleware, auth_1.adminMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        await prisma.allianceMap.delete({
            where: { id }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting map:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=maps.js.map