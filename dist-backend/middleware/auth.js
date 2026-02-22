"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.authMiddleware = authMiddleware;
exports.adminMiddleware = adminMiddleware;
const crypto_1 = require("crypto");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
function generateToken(userId, gameId, isAdmin) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        userId,
        gameId,
        isAdmin,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    })).toString('base64url');
    const signature = crypto_1.default
        .createHmac('sha256', JWT_SECRET)
        .update(`${header}.${payload}`)
        .digest('base64url');
    return `${header}.${payload}.${signature}`;
}
function verifyToken(token) {
    try {
        const [header, payload, signature] = token.split('.');
        const expectedSignature = crypto_1.default
            .createHmac('sha256', JWT_SECRET)
            .update(`${header}.${payload}`)
            .digest('base64url');
        if (signature !== expectedSignature) {
            return null;
        }
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
        if (decoded.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }
        return decoded;
    }
    catch (error) {
        return null;
    }
}
function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = {
        id: decoded.userId,
        gameId: decoded.gameId,
        isAdmin: decoded.isAdmin,
    };
    next();
}
async function adminMiddleware(req, res, next) {
    if (!req.user) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    // 從資料庫檢查最新的 isAdmin 狀態（避免舊 token 問題）
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { isAdmin: true }
        });
        if (!user || !user.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        // 更新 req.user 的 isAdmin 狀態
        req.user.isAdmin = user.isAdmin;
        next();
    }
    catch (error) {
        console.error('Error checking admin status:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
