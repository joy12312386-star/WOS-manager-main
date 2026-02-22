#!/usr/bin/env node
"use strict";
/**
 * 后端服务器启动脚本
 * 可通过 npm run dev:server 或直接运行此脚本
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const submissions_1 = __importDefault(require("./routes/submissions"));
const statistics_1 = __importDefault(require("./routes/statistics"));
const officers_1 = __importDefault(require("./routes/officers"));
const events_1 = __importDefault(require("./routes/events"));
const maps_1 = __importDefault(require("./routes/maps"));
// 加载环境变量
dotenv_1.default.config({ path: '.env.production' });
dotenv_1.default.config(); // 作为备份
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const PORT = parseInt(process.env.PORT || process.env.SERVER_PORT || '3001', 10);
const HOST = process.env.HOST || 'localhost';
// Middleware
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:3000',
            'https://wos-2438.site',
            'https://www.wos-2438.site',
            process.env.FRONTEND_URL,
        ].filter(Boolean);
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(null, true); // Allow all for now
        }
    },
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// 健康检查路由
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend server is running' });
});
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/submissions', submissions_1.default);
app.use('/api/statistics', statistics_1.default);
app.use('/api/officers', officers_1.default);
app.use('/api/events', events_1.default);
app.use('/api/maps', maps_1.default);
// 错误处理
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
    });
});
// 启动服务器
const server = app.listen(PORT, HOST, () => {
    console.log(`✓ Backend server running on http://${HOST}:${PORT}`);
    console.log(`✓ Frontend URL: ${process.env.FRONTEND_URL}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});
// 优雅关闭
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(async () => {
        console.log('HTTP server closed');
        await prisma.$disconnect();
        process.exit(0);
    });
});
process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(async () => {
        console.log('HTTP server closed');
        await prisma.$disconnect();
        process.exit(0);
    });
});
// 未捕获的异常
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});
//# sourceMappingURL=index-standalone.js.map