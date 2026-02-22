"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const client_1 = require("@prisma/client");
const user_service_1 = __importDefault(require("./services/user.service"));
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const submissions_1 = __importDefault(require("./routes/submissions"));
const statistics_1 = __importDefault(require("./routes/statistics"));
const officers_1 = __importDefault(require("./routes/officers"));
const events_1 = __importDefault(require("./routes/events"));
const maps_1 = __importDefault(require("./routes/maps"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const PORT = parseInt(process.env.SERVER_PORT || process.env.PORT || '3001', 10);
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
// Static files
app.use(express_1.default.static('dist'));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/submissions', submissions_1.default);
app.use('/api/statistics', statistics_1.default);
app.use('/api/officers', officers_1.default);
app.use('/api/events', events_1.default);
app.use('/api/maps', maps_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});
// Fallback for SPA - serve index.html for all requests that are not API routes
app.use((req, res) => {
    // If it's not an API route, serve the frontend
    if (!req.path.startsWith('/api')) {
        res.sendFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
    else {
        res.status(404).json({ error: 'API endpoint not found' });
    }
});
// Start server
async function main() {
    try {
        // Initialize super admin
        await user_service_1.default.initializeSuperAdmin();
        const HOST = process.env.HOST || '0.0.0.0';
        app.listen(PORT, HOST, () => {
            console.log(`🚀 Server is running at http://${HOST}:${PORT}`);
            console.log(`📊 Database: ${process.env.DATABASE_URL}`);
            console.log(`🔗 Frontend: ${process.env.FRONTEND_URL}`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await prisma.$disconnect();
    process.exit(0);
});
main();
exports.default = app;
//# sourceMappingURL=index.js.map