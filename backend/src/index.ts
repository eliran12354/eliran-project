import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import parcelsRouter from './routes/parcels.js';
import gushimRouter from './routes/gushim.js';
import govmapRouter from './routes/govmap.js';
import landUseMavatRouter from './routes/landUseMavat.js';
import nadlanRouter from './routes/nadlan.js';
import datagovRouter from './routes/datagov.js';
import tabaRouter from './routes/taba.js';

const app = express();

// Middleware
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost on any port
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    
    // Allow configured origin
    if (origin === config.cors.origin) {
      return callback(null, true);
    }
    
    callback(null, true); // Allow all origins for now (can be restricted later)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
  });
});

// API Routes
app.use('/api/parcels', parcelsRouter);
app.use('/api/gushim', gushimRouter);
app.use('/api/govmap', govmapRouter);
app.use('/api/land-use-mavat', landUseMavatRouter);
app.use('/api/nadlan', nadlanRouter);
app.use('/api/datagov', datagovRouter);
app.use('/api/taba', tabaRouter);

// Start server
const PORT = config.server.port;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${config.server.nodeEnv}`);
  console.log(`📍 API available at http://localhost:${PORT}/api`);
});

// הגדלת timeouts ל-5 דקות
// זה timeout של שרת Node (ברמת http server), לא של Express
server.headersTimeout = 6 * 60 * 1000; // חייב להיות > requestTimeout
server.requestTimeout = 5 * 60 * 1000; // 5 דקות
server.keepAliveTimeout = 65 * 1000; // 65 שניות

