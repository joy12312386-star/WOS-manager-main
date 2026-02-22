#!/usr/bin/env node

/**
 * 后端服务器启动脚本
 * 可通过 npm run dev:server 或直接运行此脚本
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import UserService from './services/user.service';

// Routes
import authRoutes from './routes/auth';
import submissionRoutes from './routes/submissions';
import statisticsRoutes from './routes/statistics';
import officerRoutes from './routes/officers';
import eventRoutes from './routes/events';
import mapRoutes from './routes/maps';

// 加载环境变量
dotenv.config({ path: '.env.production' });
dotenv.config(); // 作为备份

const app: Express = express();
const prisma = new PrismaClient();
const PORT = parseInt(process.env.PORT || process.env.SERVER_PORT || '3001', 10);
const HOST = process.env.HOST || 'localhost';

// Middleware
app.use(
  cors({
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
      } else {
        callback(null, true); // Allow all for now
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查路由
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend server is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/officers', officerRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/maps', mapRoutes);

// 错误处理
app.use((err: any, req: Request, res: Response, next: Function) => {
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
