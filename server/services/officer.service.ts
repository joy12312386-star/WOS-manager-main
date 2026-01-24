import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class OfficerService {
  // 取得指定日期的官職配置
  static async getAssignment(eventDate: string, officerType: string) {
    return await prisma.officerAssignment.findUnique({
      where: {
        eventDate_officerType: {
          eventDate,
          officerType,
        },
      },
    });
  }

  // 取得指定日期的所有官職配置
  static async getAssignmentsByDate(eventDate: string) {
    const assignments = await prisma.officerAssignment.findMany({
      where: { eventDate },
    });
    
    // 轉換成前端需要的格式
    const result: Record<string, any> = {};
    for (const assignment of assignments) {
      result[`${assignment.officerType}_slots`] = JSON.parse(assignment.slotsData);
      result[`${assignment.officerType}_utcOffset`] = assignment.utcOffset;
    }
    return result;
  }

  // 保存官職配置
  static async saveAssignment(
    eventDate: string,
    officerType: string,
    utcOffset: string,
    slotsData: any[]
  ) {
    return await prisma.officerAssignment.upsert({
      where: {
        eventDate_officerType: {
          eventDate,
          officerType,
        },
      },
      update: {
        utcOffset,
        slotsData: JSON.stringify(slotsData),
      },
      create: {
        eventDate,
        officerType,
        utcOffset,
        slotsData: JSON.stringify(slotsData),
      },
    });
  }

  // 保存所有官職配置（批量）
  static async saveAllAssignments(
    eventDate: string,
    utcOffset: string,
    officers: Record<string, any[]>
  ) {
    const types = ['research', 'training', 'building'];
    const results = [];
    
    for (const type of types) {
      const key = `${type}_slots`;
      const slotsData = officers[key] || [];
      
      const result = await this.saveAssignment(eventDate, type, utcOffset, slotsData);
      results.push(result);
    }
    
    return results;
  }

  // 取得所有場次日期列表
  static async getEventDates() {
    const assignments = await prisma.officerAssignment.findMany({
      select: { eventDate: true },
      distinct: ['eventDate'],
      orderBy: { eventDate: 'desc' },
    });
    return assignments.map(a => a.eventDate);
  }

  // 刪除指定日期的所有配置
  static async deleteByDate(eventDate: string) {
    return await prisma.officerAssignment.deleteMany({
      where: { eventDate },
    });
  }
}
