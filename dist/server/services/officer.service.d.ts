export declare class OfficerService {
    static getAssignment(eventDate: string, officerType: string): Promise<import("@prisma/client/runtime/library").GetResult<{
        id: string;
        eventDate: string;
        officerType: string;
        utcOffset: string;
        slotsData: string;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {}>;
    static getAssignmentsByDate(eventDate: string): Promise<Record<string, any>>;
    static saveAssignment(eventDate: string, officerType: string, utcOffset: string, slotsData: any[]): Promise<import("@prisma/client/runtime/library").GetResult<{
        id: string;
        eventDate: string;
        officerType: string;
        utcOffset: string;
        slotsData: string;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {}>;
    static saveAllAssignments(eventDate: string, utcOffset: string, officers: Record<string, any[]>): Promise<any[]>;
    static getEventDates(): Promise<string[]>;
    static deleteByDate(eventDate: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
