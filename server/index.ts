import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import UserService from './services/user.service';

// Routes
import authRoutes from './routes/auth';
import submissionRoutes from './routes/submissions';
import statisticsRoutes from './routes/statistics';
import officerRoutes from './routes/officers';
import eventRoutes from './routes/events';

dotenv.config();

const app: Express = express();
const prisma = new PrismaClient();
const PORT = parseInt(process.env.SERVER_PORT || process.env.PORT || '3001', 10);

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static('dist'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/officers', officerRoutes);
app.use('/api/events', eventRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Fallback for SPA - serve index.html for all requests that are not API routes
app.use((req: Request, res: Response) => {
  // If it's not an API route, serve the frontend
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Start server
async function main() {
  try {
    // Initialize super admin
    await UserService.initializeSuperAdmin();

    const HOST = process.env.HOST || 'localhost';
    app.listen(PORT, HOST, () => {
      console.log(`🚀 Server is running at http://${HOST}:${PORT}`);
      console.log(`📊 Database: ${process.env.DATABASE_URL}`);
      console.log(`🔗 Frontend: ${process.env.FRONTEND_URL}`);
    });
  } catch (error) {
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

export default app;
