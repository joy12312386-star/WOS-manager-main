import { Router } from 'express';
import { SubmissionService } from '../services/submission.service';
import { EventService } from '../services/event.service';
import { AuthRequest, authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

// 建立新提交
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { fid, gameId, playerName, alliance, slots, eventDate } = req.body;

    if (!fid || !gameId || !playerName || !alliance || !slots) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 如果沒有提供 eventDate，嘗試獲取當前開放的場次
    let finalEventDate = eventDate;
    if (!finalEventDate) {
      const openEvents = await EventService.getOpenEvents();
      if (openEvents.length > 0) {
        // 選擇最新的開放場次（而非最舊的）
        finalEventDate = openEvents[openEvents.length - 1].eventDate;
      }
    }

    const submission = await SubmissionService.createSubmission(req.user!.id, {
      fid,
      gameId,
      playerName,
      alliance,
      slots,
      eventDate: finalEventDate,
    });

    res.status(201).json(submission);
  } catch (error: any) {
    // 如果是重複報名的錯誤，返回 400
    if (error.message?.includes('已經報名過')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// 管理員代用戶建立提交
router.post('/admin-submit', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId, fid, gameId, playerName, alliance, slots, eventDate } = req.body;

    if (!userId || !fid || !gameId || !playerName || !alliance || !slots) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 如果沒有提供 eventDate，嘗試獲取當前開放的場次
    let finalEventDate = eventDate;
    if (!finalEventDate) {
      const openEvents = await EventService.getOpenEvents();
      if (openEvents.length > 0) {
        // 選擇最新的開放場次（而非最舊的）
        finalEventDate = openEvents[openEvents.length - 1].eventDate;
      }
    }

    const submission = await SubmissionService.createSubmission(userId, {
      fid,
      gameId,
      playerName,
      alliance,
      slots,
      eventDate: finalEventDate,
    });

    res.status(201).json(submission);
  } catch (error: any) {
    // 如果是重複報名的錯誤，返回 400
    if (error.message?.includes('已經報名過')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// 取得我的提交紀錄
router.get('/my', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const submissions = await SubmissionService.getSubmissionsByUser(req.user!.id);
    res.json(submissions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 取得所有提交 (管理員)
router.get('/all', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const submissions = await SubmissionService.getAllSubmissions();
    res.json(submissions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 更新提交
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    const { alliance, slots } = req.body;

    const updated = await SubmissionService.updateSubmission(idStr, {
      alliance,
      slots,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 管理員更新提交（可更新更多欄位）
router.put('/admin/:id', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    const { alliance, playerName, slots } = req.body;

    const updated = await SubmissionService.adminUpdateSubmission(idStr, {
      alliance,
      playerName,
      slots,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 刪除提交
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    await SubmissionService.deleteSubmission(idStr);
    res.json({ message: 'Submission deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 取得每日摘要 (管理員)
router.get('/summary/:date', authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    const { date } = req.params;
    const dateStr = Array.isArray(date) ? date[0] : date;
    const summary = await SubmissionService.getDailySubmissionSummary(new Date(dateStr));
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
