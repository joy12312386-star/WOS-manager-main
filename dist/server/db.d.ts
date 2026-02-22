import mysql from 'mysql2/promise';
declare const pool: mysql.Pool;
export declare function getConnection(): Promise<mysql.PoolConnection>;
export declare function query(sql: string, values?: any[]): Promise<mysql.QueryResult>;
export declare function queryOne(sql: string, values?: any[]): Promise<mysql.OkPacket | mysql.ResultSetHeader | mysql.RowDataPacket | mysql.RowDataPacket[]>;
export declare function execute(sql: string, values?: any[]): Promise<mysql.QueryResult>;
export default pool;
