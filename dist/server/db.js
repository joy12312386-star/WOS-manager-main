"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnection = getConnection;
exports.query = query;
exports.queryOne = queryOne;
exports.execute = execute;
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pool = promise_1.default.createPool({
    host: process.env.DB_HOST || '172.105.217.161',
    user: process.env.DB_USER || 'vwwwhgqshd',
    password: process.env.DB_PASSWORD || 'S7BsSNaG74',
    database: process.env.DB_NAME || 'vwwwhgqshd',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
});
async function getConnection() {
    return await pool.getConnection();
}
async function query(sql, values) {
    const connection = await pool.getConnection();
    try {
        const [results] = await connection.query(sql, values);
        return results;
    }
    finally {
        connection.release();
    }
}
async function queryOne(sql, values) {
    const results = await query(sql, values);
    return Array.isArray(results) ? results[0] : null;
}
async function execute(sql, values) {
    const connection = await pool.getConnection();
    try {
        const [result] = await connection.execute(sql, values);
        return result;
    }
    finally {
        connection.release();
    }
}
exports.default = pool;
//# sourceMappingURL=db.js.map