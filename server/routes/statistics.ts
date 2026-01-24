import { Router } from 'express';
import StatisticsService from '../services/statistics.service';
import { AuthRequest, authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

// 取得我的統計
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const stats = await StatisticsService.getUserStatistics(req.user!.id);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 建立/更新聯盟統計 (管理員)
router.post('/alliance', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      allianceId,
      allianceName,
      totalMembersT11,
      totalMembersT10,
      totalMembers,
      totalFireSparkle,
      totalFireGem,
      totalResearchAccel,
      totalGeneralAccel,
      statisticDate,
    } = req.body;

    const statistic = await StatisticsService.upsertAllianceStatistic(req.user!.id, {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 取得聯盟統計歷史
router.get('/alliance/:allianceId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { allianceId } = req.params;
    const allianceIdStr = Array.isArray(allianceId) ? allianceId[0] : allianceId;
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const stats = await StatisticsService.getAllianceStatistics(allianceIdStr, days);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 取得所有聯盟統計 (按日期)
router.get('/date/:date', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { date } = req.params;
    const dateStr = Array.isArray(date) ? date[0] : date;
    const stats = await StatisticsService.getAllAllianceStatisticsByDate(new Date(dateStr));
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 取得排行榜
router.get('/leaderboard', async (req, res) => {
  try {
    const allianceId = req.query.allianceId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const stats = await StatisticsService.getLeaderboard(allianceId, limit);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
