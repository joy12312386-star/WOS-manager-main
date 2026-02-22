export type EventStatus = 'open' | 'closed' | 'disabled';
export type ActivityType = 'research' | 'training' | 'building';
export declare const DEFAULT_DAY_CONFIG: Record<string, ActivityType>;
export interface CreateEventData {
    eventDate: string;
    title?: string;
    registrationStart: Date;
    registrationEnd: Date;
    description?: string;
    dayConfig?: Record<string, ActivityType>;
}
export declare class EventService {
    static getAllEvents(): Promise<any[]>;
    static getEvent(eventDate: string): Promise<import("@prisma/client/runtime/library").GetResult<{
        id: string;
        eventDate: string;
        title: string | null;
        status: string;
        registrationStart: Date;
        registrationEnd: Date;
        description: string | null;
        dayConfig: string | null;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {}>;
    static getOpenEvents(): Promise<(import("@prisma/client/runtime/library").GetResult<{
        id: string;
        eventDate: string;
        title: string | null;
        status: string;
        registrationStart: Date;
        registrationEnd: Date;
        description: string | null;
        dayConfig: string | null;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {})[]>;
    static getPublicEvents(): Promise<(import("@prisma/client/runtime/library").GetResult<{
        id: string;
        eventDate: string;
        title: string | null;
        status: string;
        registrationStart: Date;
        registrationEnd: Date;
        description: string | null;
        dayConfig: string | null;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {})[]>;
    static createEvent(data: CreateEventData): Promise<import("@prisma/client/runtime/library").GetResult<{
        id: string;
        eventDate: string;
        title: string | null;
        status: string;
        registrationStart: Date;
        registrationEnd: Date;
        description: string | null;
        dayConfig: string | null;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {}>;
    static updateEvent(eventDate: string, data: {
        title?: string;
        status?: EventStatus;
        registrationStart?: Date;
        registrationEnd?: Date;
        description?: string;
        dayConfig?: Record<string, ActivityType>;
    }): Promise<import("@prisma/client/runtime/library").GetResult<{
        id: string;
        eventDate: string;
        title: string | null;
        status: string;
        registrationStart: Date;
        registrationEnd: Date;
        description: string | null;
        dayConfig: string | null;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {}>;
    static updateEventStatus(eventDate: string, status: EventStatus): Promise<import("@prisma/client/runtime/library").GetResult<{
        id: string;
        eventDate: string;
        title: string | null;
        status: string;
        registrationStart: Date;
        registrationEnd: Date;
        description: string | null;
        dayConfig: string | null;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {}>;
    static deleteEvent(eventDate: string): Promise<import("@prisma/client/runtime/library").GetResult<{
        id: string;
        eventDate: string;
        title: string | null;
        status: string;
        registrationStart: Date;
        registrationEnd: Date;
        description: string | null;
        dayConfig: string | null;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {}>;
    static canRegister(eventDate: string): Promise<{
        canRegister: boolean;
        reason?: string;
    }>;
    static getDayConfig(eventDate: string): Promise<Record<string, ActivityType>>;
    static updateDayConfig(eventDate: string, dayConfig: Record<string, ActivityType>): Promise<import("@prisma/client/runtime/library").GetResult<{
        id: string;
        eventDate: string;
        title: string | null;
        status: string;
        registrationStart: Date;
        registrationEnd: Date;
        description: string | null;
        dayConfig: string | null;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {}>;
    static getDefaultDayConfig(): Record<string, ActivityType>;
    static formatEvent(event: any): any;
}
