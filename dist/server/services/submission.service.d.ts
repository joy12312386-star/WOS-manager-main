export declare class SubmissionService {
    static checkExistingSubmission(userId: string, dayKey: string, eventDate?: string): Promise<{
        exists: boolean;
        submissionId?: string;
    }>;
    static createSubmission(userId: string, data: {
        fid: string;
        gameId: string;
        playerName: string;
        alliance: string;
        eventDate?: string;
        slots: any;
    }): Promise<import("@prisma/client/runtime/library").GetResult<{
        id: string;
        userId: string;
        fid: string;
        gameId: string;
        playerName: string;
        alliance: string;
        eventDate: string | null;
        slotsData: string;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {}>;
    static getSubmissionsByUser(userId: string): Promise<{
        slots: any;
        submittedAt: number;
        id: string;
        gameId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        fid: string;
        playerName: string;
        alliance: string;
        eventDate: string;
        slotsData: string;
    }[]>;
    static getAllSubmissions(): Promise<{
        eventDate: string;
        slots: any;
        submittedAt: number;
        user: {
            gameId: string;
            nickname: string;
            allianceName: string;
            avatarImage: string;
            stoveLv: number;
        };
        id: string;
        gameId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        fid: string;
        playerName: string;
        alliance: string;
        slotsData: string;
    }[]>;
    static updateSubmission(submissionId: string, data: {
        alliance?: string;
        slots?: any;
    }): Promise<{
        slots: any;
        id: string;
        gameId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        fid: string;
        playerName: string;
        alliance: string;
        eventDate: string;
        slotsData: string;
    }>;
    static adminUpdateSubmission(submissionId: string, data: {
        alliance?: string;
        playerName?: string;
        slots?: any;
    }): Promise<{
        slots: any;
        id: string;
        gameId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        fid: string;
        playerName: string;
        alliance: string;
        eventDate: string;
        slotsData: string;
    }>;
    static deleteSubmission(submissionId: string): Promise<import("@prisma/client/runtime/library").GetResult<{
        id: string;
        userId: string;
        fid: string;
        gameId: string;
        playerName: string;
        alliance: string;
        eventDate: string | null;
        slotsData: string;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {}>;
    static getDailySubmissionSummary(reportDate: Date): Promise<{
        date: Date;
        totalSubmissions: number;
        totalFireSparkle: number;
        totalFireGem: number;
        totalResearchAccel: number;
        totalGeneralAccel: number;
        averageFireSparkle: number;
    }>;
}
export default SubmissionService;
