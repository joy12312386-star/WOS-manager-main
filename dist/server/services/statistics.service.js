"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticsService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class StatisticsService {
    // 建立或更新聯盟統計
    static async upsertAllianceStatistic(userId, data) {
        const existing = await prisma.allianceStatistic.findFirst({
            where: {
                userId,
                allianceId: data.allianceId,
                statisticDate: {
                    gte: new Date(data.statisticDate.setHours(0, 0, 0, 0)),
                    lt: new Date(data.statisticDate.setHours(23, 59, 59, 999)),
                },
            },
        });
        if (existing) {
            return await prisma.allianceStatistic.update({
                where: { id: existing.id },
                data,
            });
        }
        else {
            return await prisma.allianceStatistic.create({
                data: {
                    userId,
                    ...data,
                },
            });
        }
    }
    // 取得聯盟統計歷史
    static async getAllianceStatistics(allianceId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        return await prisma.allianceStatistic.findMany({
            where: {
                allianceId,
                statisticDate: {
                    gte: startDate,
                },
            },
            orderBy: { statisticDate: 'desc' },
        });
    }
    // 取得使用者統計
    static async getUserStatistics(userId) {
        const submissions = await prisma.timeslotSubmission.findMany({
            where: { userId },
        });
        return {
            totalSubmissions: submissions.length,
            totalFireSparkle: 0,
            totalFireGem: 0,
            totalResearchAccel: 0,
            totalGeneralAccel: 0,
            lastSubmission: submissions[0] || null,
        };
    }
    // 取得全體聯盟統計 (按日期)
    static async getAllAllianceStatisticsByDate(statisticDate) {
        return await prisma.allianceStatistic.findMany({
            where: {
                statisticDate: {
                    gte: new Date(statisticDate.setHours(0, 0, 0, 0)),
                    lt: new Date(statisticDate.setHours(23, 59, 59, 999)),
                },
            },
            orderBy: { totalFireSparkle: 'desc' },
        });
    }
    // 取得排行榜
    static async getLeaderboard(allianceId, limit = 20) {
        const where = allianceId ? { allianceId } : {};
        return await prisma.allianceStatistic.findMany({
            where,
            orderBy: { totalFireSparkle: 'desc' },
            take: limit,
        });
    }
}
exports.StatisticsService = StatisticsService;
exports.default = StatisticsService;
//# sourceMappingURL=statistics.service.js.map