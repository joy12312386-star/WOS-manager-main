import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SubmissionService {
  // 檢查是否已有該使用者、該星期幾的報名
  static async checkExistingSubmission(userId: string, dayKey: string): Promise<{ exists: boolean; submissionId?: string }> {
    // 取得該使用者所有報名
    const submissions = await prisma.timeslotSubmission.findMany({
      where: { userId },
    });
    
    // 檢查是否有相同星期幾的報名
    for (const submission of submissions) {
      const slots = JSON.parse(submission.slotsData);
      if (slots[dayKey] && slots[dayKey].checked) {
        return { exists: true, submissionId: submission.id };
      }
    }
    
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
    }
  ) {
    // 檢查該使用者是否已有相同星期幾的報名
    const dayKeys = Object.keys(data.slots).filter(key => data.slots[key]?.checked);
    
    for (const dayKey of dayKeys) {
      const existing = await this.checkExistingSubmission(userId, dayKey);
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
        throw new Error(`您已經報名過${dayNames[dayKey] || dayKey}，請使用編輯功能修改現有報名`);
      }
    }
    
    return await prisma.timeslotSubmission.create({
      data: {
        userId,
        fid: data.fid,
        gameId: data.gameId,
        playerName: data.playerName,
        alliance: data.alliance,
        eventDate: data.eventDate,
        slotsData: JSON.stringify(data.slots),
      },
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
    }
  ) {
    const updateData: any = {};
    if (data.alliance) updateData.alliance = data.alliance;
    if (data.playerName) updateData.playerName = data.playerName;
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
