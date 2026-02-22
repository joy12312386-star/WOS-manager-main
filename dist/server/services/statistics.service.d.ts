export declare class StatisticsService {
    static upsertAllianceStatistic(userId: string, data: {
        allianceId: string;
        allianceName: string;
        totalMembersT11: number;
        totalMembersT10: number;
        totalMembers: number;
        totalFireSparkle: number;
        totalFireGem: number;
        totalResearchAccel: number;
        totalGeneralAccel: number;
        statisticDate: Date;
    }): Promise<import("@prisma/client/runtime/library").GetResult<{
        id: string;
        allianceId: string;
        userId: string;
        allianceName: string;
        totalMembersT11: number;
        totalMembersT10: number;
        totalMembers: number;
        totalFireSparkle: number;
        totalFireGem: number;
        totalResearchAccel: number;
        totalGeneralAccel: number;
        statisticDate: Date;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {}>;
    static getAllianceStatistics(allianceId: string, days?: number): Promise<(import("@prisma/client/runtime/library").GetResult<{
        id: string;
        allianceId: string;
        userId: string;
        allianceName: string;
        totalMembersT11: number;
        totalMembersT10: number;
        totalMembers: number;
        totalFireSparkle: number;
        totalFireGem: number;
        totalResearchAccel: number;
        totalGeneralAccel: number;
        statisticDate: Date;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {})[]>;
    static getUserStatistics(userId: string): Promise<{
        totalSubmissions: number;
        totalFireSparkle: number;
        totalFireGem: number;
        totalResearchAccel: number;
        totalGeneralAccel: number;
        lastSubmission: import("@prisma/client/runtime/library").GetResult<{
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
        }, unknown> & {};
    }>;
    static getAllAllianceStatisticsByDate(statisticDate: Date): Promise<(import("@prisma/client/runtime/library").GetResult<{
        id: string;
        allianceId: string;
        userId: string;
        allianceName: string;
        totalMembersT11: number;
        totalMembersT10: number;
        totalMembers: number;
        totalFireSparkle: number;
        totalFireGem: number;
        totalResearchAccel: number;
        totalGeneralAccel: number;
        statisticDate: Date;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {})[]>;
    static getLeaderboard(allianceId?: string, limit?: number): Promise<(import("@prisma/client/runtime/library").GetResult<{
        id: string;
        allianceId: string;
        userId: string;
        allianceName: string;
        totalMembersT11: number;
        totalMembersT10: number;
        totalMembers: number;
        totalFireSparkle: number;
        totalFireGem: number;
        totalResearchAccel: number;
        totalGeneralAccel: number;
        statisticDate: Date;
        createdAt: Date;
        updatedAt: Date;
    }, unknown> & {})[]>;
}
export default StatisticsService;
