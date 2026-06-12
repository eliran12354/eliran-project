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
import urbanRenewalRouter from './routes/urbanRenewal.js';
import authRouter from './routes/auth.js';
import meRouter from './routes/me.js';
import adminRouter from './routes/admin.js';
import portfolioRouter from './routes/portfolio.js';
import notificationsRouter from './routes/notifications.js';
import contactRouter from './routes/contact.js';
import taxRouter from './routes/tax.js';
import internalRouter from './routes/internal.js';
import featuredProfessionalsPublicRouter from './routes/featuredProfessionalsPublic.js';
import hotInvestorBoardsPublicRouter from './routes/hotInvestorBoardsPublic.js';
import mavatRouter from './routes/mavat.js';
import tenderAnalysisRouter from './routes/tenderAnalysis.js';
import tendersRouter from './routes/tenders.js';
import plansRouter from './routes/plans.js';
import dealsRouter from './routes/deals.js';
import telegramDocumentsRouter from './routes/telegramDocuments.js';
import constructionProgressRouter from './routes/constructionProgress.js';
import urbanRenewalDataRouter from './routes/urbanRenewalData.js';
import tama70Router from './routes/tama70.js';
import dangerousBuildingsRouter from './routes/dangerousBuildings.js';
import tabuRequestsRouter from './routes/tabuRequests.js';
import landCheckRouter from './routes/landCheck.js';
import billingRouter from './routes/billing.js';

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
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Global JSON parser with the default 100KB limit. Two route groups opt out:
// tender-analysis parses its own JSON with a much larger limit (base64 PDF/DOCX
// uploads), and billing needs the raw body for webhook signature verification.
const defaultJsonParser = express.json();
app.use((req, res, next) => {
  if (req.path.startsWith('/api/tender-analysis') || req.path.startsWith('/api/billing')) {
    return next();
  }
  return defaultJsonParser(req, res, next);
});

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
app.use('/api/urban-renewal', urbanRenewalRouter);
app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);
app.use('/api/admin', adminRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/contact', contactRouter);
app.use('/api/tax', taxRouter);
app.use('/api/internal', internalRouter);
app.use('/api/featured-professionals', featuredProfessionalsPublicRouter);
app.use('/api/hot-investor-boards', hotInvestorBoardsPublicRouter);
app.use('/api/mavat-search', mavatRouter);
app.use('/api/tender-analysis', tenderAnalysisRouter);
app.use('/api/tenders', tendersRouter);
app.use('/api/plans', plansRouter);
app.use('/api/deals', dealsRouter);
app.use('/api/telegram-documents', telegramDocumentsRouter);
app.use('/api/construction-progress', constructionProgressRouter);
app.use('/api/urban-renewal-data', urbanRenewalDataRouter);
app.use('/api/tama70', tama70Router);
app.use('/api/dangerous-buildings', dangerousBuildingsRouter);
app.use('/api/tabu-requests', tabuRequestsRouter);
app.use('/api/land-check', landCheckRouter);
app.use('/api/billing', billingRouter);

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