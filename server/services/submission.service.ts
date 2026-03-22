import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SubmissionService {
  // 檢查是否已有該使用者、該星期幾、該場次的報名
  static async checkExistingSubmission(userId: string, dayKey: string, eventDate?: string): Promise<{ exists: boolean; submissionId?: string }> {
    console.log('🔍 checkExistingSubmission - 開始檢查:', {
      userId,
      dayKey,
      eventDate,
      eventDateExists: !!eventDate
    });

    // 取得該使用者所有報名
    const submissions = await prisma.timeslotSubmission.findMany({
      where: { userId },
    });

    console.log('🔍 checkExistingSubmission - 用戶共有', submissions.length, '個報名');
    
    // 檢查是否有相同星期幾且相同場次的報名
    for (const submission of submissions) {
      const slots = JSON.parse(submission.slotsData);
      console.log('🔍 checkExistingSubmission - 檢查報名:', {
        submissionId: submission.id,
        submissionEventDate: submission.eventDate,
        hasDayKey: !!slots[dayKey],
        dayChecked: slots[dayKey]?.checked
      });

      if (slots[dayKey] && slots[dayKey].checked) {
        // 只有當 eventDate 相同且都不為 null 時，才視為重複報名
        // 如果新報名或舊報名的 eventDate 為 null，不視為重複（因為可能是舊數據）
        const isDuplicate = eventDate && submission.eventDate === eventDate;
        
        console.log('🔍 checkExistingSubmission - 重複檢查:', {
          isDuplicate,
          reason: isDuplicate ? 'eventDate 相同' : `eventDate 不同或為 null (新:${eventDate}, 舊:${submission.eventDate})`
        });

        if (isDuplicate) {
          return { exists: true, submissionId: submission.id };
        }
      }
    }
    
    console.log('🔍 checkExistingSubmission - 檢查完成，無重複報名');
    return { exists: false };
  }

  // 建立報名提交
  static async createSubmission(
    userId: string,
    data: {
      fid: string;
      gameId: string;
      playerName: string;
      alliance: string;
      eventDate?: string;
      slots: any;
      avatarImage?: string;
    }
  ) {
    // 檢查該使用者是否已有相同星期幾且相同場次的報名
    const dayKeys = Object.keys(data.slots).filter(key => data.slots[key]?.checked);
    
    for (const dayKey of dayKeys) {
      const existing = await this.checkExistingSubmission(userId, dayKey, data.eventDate);
      if (existing.exists) {
        const dayNames: Record<string, string> = {
          monday: '週一',
          tuesday: '週二',
          wednesday: '週三',
          thursday: '週四',
          friday: '週五',
          saturday: '週六',
          sunday: '週日'
        };
        throw new Error(`您已經在${data.eventDate || '本場次'}報名過${dayNames[dayKey] || dayKey}，請使用編輯功能修改現有報名`);
      }
    }
    
    // 如果沒有提供 avatarImage，從用戶資料中取得
    let avatarImage = data.avatarImage;
    if (!avatarImage) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      avatarImage = user?.avatarImage || null;
    }
    
    // 構建 create data，條件性地添加 avatarImage（只在有值時）
    const createData: any = {
      userId,
      fid: data.fid,
      gameId: data.gameId,
      playerName: data.playerName,
      alliance: data.alliance,
      eventDate: data.eventDate,
      slotsData: JSON.stringify(data.slots),
    };

    // 只在 avatarImage 存在時才添加
    if (avatarImage) {
      createData.avatarImage = avatarImage;
    }

    return await prisma.timeslotSubmission.create({
      data: createData,
    });
  }

  // 取得使用者提交紀錄
  static async getSubmissionsByUser(userId: string) {
    const submissions = await prisma.timeslotSubmission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    
    return submissions.map(s => ({
      ...s,
      slots: JSON.parse(s.slotsData),
      submittedAt: new Date(s.createdAt).getTime(),
    }));
  }

  // 取得所有提交（管理員用）
  static async getAllSubmissions() {
    const submissions = await prisma.timeslotSubmission.findMany({
      include: {
        user: {
          select: {
            gameId: true,
            nickname: true,
            allianceName: true,
            avatarImage: true,
            stoveLv: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return submissions.map(s => ({
      ...s,
      eventDate: s.eventDate,
      slots: JSON.parse(s.slotsData),
      submittedAt: new Date(s.createdAt).getTime(),
    }));
  }

  // 🔑 按 eventDate 取得提交 - 確保官職管理只顯示該場次的報名
  static async getSubmissionsByEventDate(eventDate: string) {
    const submissions = await prisma.timeslotSubmission.findMany({
      where: {
        eventDate: eventDate,  // 精確匹配 eventDate
      },
      include: {
        user: {
          select: {
            gameId: true,
            nickname: true,
            allianceName: true,
            avatarImage: true,
            stoveLv: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return submissions.map(s => ({
      ...s,
      eventDate: s.eventDate,
      slots: JSON.parse(s.slotsData),
      submittedAt: new Date(s.createdAt).getTime(),
    }));
  }

  // 更新提交
  static async updateSubmission(
    submissionId: string,
    data: {
      alliance?: string;
      slots?: any;
    }
  ) {
    const updateData: any = {};
    if (data.alliance) updateData.alliance = data.alliance;
    if (data.slots) updateData.slotsData = JSON.stringify(data.slots);
    
    const updated = await prisma.timeslotSubmission.update({
      where: { id: submissionId },
      data: updateData,
    });
    
    return {
      ...updated,
      slots: JSON.parse(updated.slotsData),
    };
  }

  // 管理員更新提交（可更新更多欄位）
  static async adminUpdateSubmission(
    submissionId: string,
    data: {
      alliance?: string;
      playerName?: string;
      slots?: any;
      eventDate?: string;
      avatarImage?: string;
    }
  ) {
    const updateData: any = {};
    if (data.alliance) updateData.alliance = data.alliance;
    if (data.playerName) updateData.playerName = data.playerName;
    if (data.slots) updateData.slotsData = JSON.stringify(data.slots);
    if (data.eventDate !== undefined) updateData.eventDate = data.eventDate;
    if (data.avatarImage !== undefined) updateData.avatarImage = data.avatarImage;
    
    const updated = await prisma.timeslotSubmission.update({
      where: { id: submissionId },
      data: updateData,
    });
    
    return {
      ...updated,
      slots: JSON.parse(updated.slotsData),
    };
  }

  // 刪除提交
  static async deleteSubmission(submissionId: string) {
    return await prisma.timeslotSubmission.delete({
      where: { id: submissionId },
    });
  }

  // 取得每日提交摘要
  static async getDailySubmissionSummary(reportDate: Date) {
    const submissions = await prisma.timeslotSubmission.findMany({
      where: {
        createdAt: {
          gte: new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate(), 0, 0, 0, 0),
          lt: new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate(), 23, 59, 59, 999),
        },
      },
    });

    // 計算資源總數
    let totalFireSparkle = 0;
    let totalFireGem = 0;
    let totalResearchAccel = 0;
    let totalGeneralAccel = 0;

    for (const submission of submissions) {
      const slots = JSON.parse(submission.slotsData);
      for (const daySlot of Object.values(slots)) {
        const slot = daySlot as any;
        if (slot?.fireSparkleCount) totalFireSparkle += slot.firㄑnt;
        if (slot?.fireGemCount) totalFireGem += slot.fireGemCount;
        if (slot?.researchAccel) {
          const minutes = (slot.researchAccel.days || 0) * 1440 + (slot.researchAccel.hours || 0) * 60 + (slot.researchAccel.minutes || 0);
          totalResearchAccel += minutes;
        }
        if (slot?.generalAccel) {
          const minutes = (slot.generalAccel.days || 0) * 1440 + (slot.generalAccel.hours || 0) * 60 + (slot.generalAccel.minutes || 0);
          totalGeneralAccel += minutes;
        }
      }
    }

    return {
      date: reportDate,
      totalSubmissions: submissions.length,
      totalFireSparkle,
      totalFireGem,
      totalResearchAccel,
      totalGeneralAccel,
      averageFireSparkle: submissions.length > 0 ? Math.round(totalFireSparkle / submissions.length) : 0,
    };
  }
}

export default SubmissionService;
