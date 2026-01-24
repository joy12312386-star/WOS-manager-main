import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
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

export async function getConnection() {
  return await pool.getConnection();
}

export async function query(sql: string, values?: any[]) {
  const connection = await pool.getConnection();
  try {
    const [results] = await connection.query(sql, values);
    return results;
  } finally {
    connection.release();
  }
}

export async function queryOne(sql: string, values?: any[]) {
  const results = await query(sql, values);
  return Array.isArray(results) ? results[0] : null;
}

export async function execute(sql: string, values?: any[]) {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(sql, values);
    return result;
  } finally {
    connection.release();
  }
}

export default pool;
