import { Router, Request, Response } from 'express';
import { OfficerService } from '../services/officer.service';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// 公開 API：取得最近的場次日期（不需要登入）- 必須放在 /:eventDate 之前
router.get('/public-dates', async (req: Request, res: Response) => {
  try {
    const dates = await OfficerService.getEventDates();
    res.json({ dates });
  } catch (error) {
    console.error('Error fetching public event dates:', error);
    res.status(500).json({ error: 'Failed to fetch event dates' });
  }
});

// 公開 API：取得指定日期的官職配置（不需要登入）- 必須放在 /:eventDate 之前
router.get('/public/:eventDate', async (req: Request, res: Response) => {
  try {
    const eventDate = Array.isArray(req.params.eventDate) ? req.params.eventDate[0] : req.params.eventDate;
    const assignments = await OfficerService.getAssignmentsByDate(eventDate);
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching public assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// 取得所有場次日期
router.get('/dates', authMiddleware, async (req: Request, res: Response) => {
  try {
    const dates = await OfficerService.getEventDates();
    res.json({ dates });
  } catch (error) {
    console.error('Error fetching event dates:', error);
    res.status(500).json({ error: 'Failed to fetch event dates' });
  }
});

// 取得指定日期的官職配置
router.get('/:eventDate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const eventDate = Array.isArray(req.params.eventDate) ? req.params.eventDate[0] : req.params.eventDate;
    const assignments = await OfficerService.getAssignmentsByDate(eventDate);
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// 保存官職配置
router.post('/save', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { eventDate, utcOffset, officers } = req.body;
    
    if (!eventDate) {
      return res.status(400).json({ error: 'Event date is required' });
    }
    
    const results = await OfficerService.saveAllAssignments(
      eventDate,
      utcOffset || '00:00',
      officers || {}
    );
    
    res.json({ success: true, saved: results.length });
  } catch (error) {
    console.error('Error saving assignments:', error);
    res.status(500).json({ error: 'Failed to save assignments' });
  }
});

// 刪除指定日期的配置
router.delete('/:eventDate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const eventDate = Array.isArray(req.params.eventDate) ? req.params.eventDate[0] : req.params.eventDate;
    await OfficerService.deleteByDate(eventDate);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting assignments:', error);
    res.status(500).json({ error: 'Failed to delete assignments' });
  }
});

export default router;
