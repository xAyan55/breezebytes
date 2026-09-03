import express from 'express';
import http from 'http';
import cors from 'cors';
import { runMigrations } from './db/migrations.js';
import { schedulerWorker } from './daemon/schedulerWorker.js';
import { processManager } from './daemon/processManager.js';
import { setupWebSocketGateway } from './ws/gateway.js';
import { playitService } from './services/playit/playitService.js';

import authRouter from './routes/auth.js';
import serversRouter from './routes/servers.js';
import powerRouter from './routes/power.js';
import consoleRouter from './routes/console.js';
import filesRouter from './routes/files.js';
import backupsRouter from './routes/backups.js';
import schedulesRouter from './routes/schedules.js';
import playersRouter from './routes/players.js';
import startupRouter from './routes/startup.js';
import networkRouter from './routes/network.js';
import databasesRouter from './routes/databases.js';
import subusersRouter from './routes/subusers.js';
import accountRouter from './routes/account.js';
import adminRouter from './routes/admin.js';

import { statusPingServer } from './daemon/statusPingServer.js';

// 1. Run migrations and seed data
runMigrations();

// 2. Initialize background scheduler, Playit control plane & fallback status ping server
schedulerWorker.init();
playitService.init();
statusPingServer.initialize();

const app = express();
const server = http.createServer(app);

// 3. Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 4. API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/servers', serversRouter);
app.use('/api/v1/servers', powerRouter);
app.use('/api/v1/servers', consoleRouter);
app.use('/api/v1/servers', filesRouter);
app.use('/api/v1/servers', backupsRouter);
app.use('/api/v1/servers', schedulesRouter);
app.use('/api/v1/servers', playersRouter);
app.use('/api/v1/servers', startupRouter);
app.use('/api/v1/servers', networkRouter);
app.use('/api/v1/servers', databasesRouter);
app.use('/api/v1/servers', subusersRouter);
app.use('/api/v1/account', accountRouter);
app.use('/api/v1/admin', adminRouter);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BreezeBytes Control Plane',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[API ERROR]', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected server error occurred.'
    }
  });
});

// 5. WebSocket Gateway
setupWebSocketGateway(server);

// 6. Listen
const PORT = process.env.PORT || 3001;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[BreezeBytes API] Control plane server listening on http://127.0.0.1:${PORT}`);
});

// 7. Graceful Shutdown
const handleShutdown = (signal) => {
  console.log(`[API] Received ${signal}. Shutting down cleanly...`);
  try {
    playitService.shutdown();
    processManager.shutdownAll();
  } catch (err) {
    console.error('[API] Error during shutdown:', err);
  }
  process.exit(0);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
