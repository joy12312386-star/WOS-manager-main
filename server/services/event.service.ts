import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type EventStatus = 'open' | 'closed' | 'disabled';
export type ActivityType = 'research' | 'training' | 'building';

// 預設每週活動配置
export const DEFAULT_DAY_CONFIG: Record<string, ActivityType> = {
  monday: 'building',
  tuesday: 'research',
  wednesday: 'training',
  thursday: 'training',
  friday: 'building',
  saturday: 'research',
  sunday: 'research'
};

export interface CreateEventData {
  eventDate: string;
  title?: string;
  registrationStart: Date;
  registrationEnd: Date;
  description?: string;
  dayConfig?: Record<string, ActivityType>;
}

export class EventService {
  // 取得所有場次
  static async getAllEvents() {
    const events = await prisma.event.findMany({
      orderBy: { eventDate: 'desc' },
    });
    
    // 自動更新狀態：如果報名結束時間已過，自動設為 closed
    const now = new Date();
    const updatedEvents = [];
    
    for (const event of events) {
      if (event.status === 'open' && new Date(event.registrationEnd) < now) {
        // 自動更新為截止
        const updated = await prisma.event.update({
          where: { id: event.id },
          data: { status: 'closed' },
        });
        updatedEvents.push(this.formatEvent(updated));
      } else {
        updatedEvents.push(this.formatEvent(event));
      }
    }
    
    return updatedEvents;
  }

  // 取得單一場次
  static async getEvent(eventDate: string) {
    const event = await prisma.event.findUnique({
      where: { eventDate },
    });
    
    if (event && event.status === 'open' && new Date(event.registrationEnd) < new Date()) {
      // 自動更新為截止
      return await prisma.event.update({
        where: { id: event.id },
        data: { status: 'closed' },
      });
    }
    
    return event;
  }

  // 取得目前開放報名的場次
  static async getOpenEvents() {
    const now = new Date();
    
    // 先自動更新過期的場次
    await prisma.event.updateMany({
      where: {
        status: 'open',
        registrationEnd: { lt: now },
      },
      data: { status: 'closed' },
    });
    
    // 取得開放報名且在報名時間內的場次
    return await prisma.event.findMany({
      where: {
        status: 'open',
        registrationStart: { lte: now },
        registrationEnd: { gte: now },
      },
      orderBy: { eventDate: 'asc' },
    });
  }

  // 取得所有公開可見的場次（open 和 closed，不包括 disabled）
  static async getPublicEvents() {
    const now = new Date();
    
    // 先自動更新過期的場次
    await prisma.event.updateMany({
      where: {
        status: 'open',
        registrationEnd: { lt: now },
      },
      data: { status: 'closed' },
    });
    
    // 取得所有非 disabled 的場次
    return await prisma.event.findMany({
      where: {
        status: { in: ['open', 'closed'] },
      },
      orderBy: { eventDate: 'asc' },
    });
  }

  // 創建場次
  static async createEvent(data: CreateEventData) {
    return await prisma.event.create({
      data: {
        eventDate: data.eventDate,
        title: data.title,
        registrationStart: data.registrationStart,
        registrationEnd: data.registrationEnd,
        description: data.description,
        status: 'open',
        dayConfig: JSON.stringify(data.dayConfig || DEFAULT_DAY_CONFIG),
      },
    });
  }

  // 更新場次
  static async updateEvent(
    eventDate: string,
    data: {
      title?: string;
      status?: EventStatus;
      registrationStart?: Date;
      registrationEnd?: Date;
      description?: string;
      dayConfig?: Record<string, ActivityType>;
    }
  ) {
    const updateData: any = { ...data };
    if (data.dayConfig) {
      updateData.dayConfig = JSON.stringify(data.dayConfig);
    }
    return await prisma.event.update({
      where: { eventDate },
      data: updateData,
    });
  }

  // 更新場次狀態
  static async updateEventStatus(eventDate: string, status: EventStatus) {
    return await prisma.event.update({
      where: { eventDate },
      data: { status },
    });
  }

  // 刪除場次
  static async deleteEvent(eventDate: string) {
    return await prisma.event.delete({
      where: { eventDate },
    });
  }

  // 檢查是否可以報名
  static async canRegister(eventDate: string): Promise<{ canRegister: boolean; reason?: string }> {
    const event = await this.getEvent(eventDate);
    
    if (!event) {
      return { canRegister: false, reason: '場次不存在' };
    }
    
    if (event.status === 'disabled') {
      return { canRegister: false, reason: '場次已關閉' };
    }
    
    if (event.status === 'closed') {
      return { canRegister: false, reason: '報名已截止' };
    }
    
    const now = new Date();
    
    if (new Date(event.registrationStart) > now) {
      return { canRegister: false, reason: '報名尚未開始' };
    }
    
    if (new Date(event.registrationEnd) < now) {
      return { canRegister: false, reason: '報名已截止' };
    }
    
    return { canRegister: true };
  }

  // 取得場次的每日活動配置
  static async getDayConfig(eventDate: string): Promise<Record<string, ActivityType>> {
    const event = await this.getEvent(eventDate);
    if (event && event.dayConfig) {
      try {
        return JSON.parse(event.dayConfig);
      } catch {
        return DEFAULT_DAY_CONFIG;
      }
    }
    return DEFAULT_DAY_CONFIG;
  }

  // 更新場次的每日活動配置
  static async updateDayConfig(eventDate: string, dayConfig: Record<string, ActivityType>) {
    return await prisma.event.update({
      where: { eventDate },
      data: { dayConfig: JSON.stringify(dayConfig) },
    });
  }

  // 取得預設配置
  static getDefaultDayConfig(): Record<string, ActivityType> {
    return { ...DEFAULT_DAY_CONFIG };
  }

  // 格式化事件回傳（解析 dayConfig JSON）
  static formatEvent(event: any) {
    if (!event) return null;
    return {
      ...event,
      dayConfig: event.dayConfig ? JSON.parse(event.dayConfig) : DEFAULT_DAY_CONFIG,
    };
  }
}
