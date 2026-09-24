import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, getDBStatus } from './config/db.js';
import { verifySmtpConnection } from './services/emailService.js';

// Route imports
import authRoutes from './routes/auth.js';
import vocabularyRoutes from './routes/vocabulary.js';
import kanjiRoutes from './routes/kanji.js';
import userVocabularyRoutes from './routes/userVocabulary.js';
import userKanjiRoutes from './routes/userKanji.js';
import progressRoutes from './routes/progress.js';
import notesRoutes from './routes/notes.js';
import quizResultsRoutes from './routes/quizResults.js';
import adminRoutes from './routes/admin.js';
import customChaptersRoutes from './routes/customChapters.js';
import patternsRoutes from './routes/patterns.js';
import readingsRoutes from './routes/readings.js';
import listeningRoutes from './routes/listening.js';
import notificationsRoutes from './routes/notifications.js';
import testsRoutes from './routes/tests.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Configured origins for local dev and production
const allowedLocalOrigins = [
  'http://localhost:5174',
  'http://localhost:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5173',
  'http://localhost:5001',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const getFrontendOrigins = () => {
  const envUrl = process.env.FRONTEND_URL;
  if (!envUrl) return [];
  return envUrl
    .split(',')
    .map(url => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);
};

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);

    const configuredOrigins = getFrontendOrigins();
    const isAllowed = 
      allowedLocalOrigins.includes(origin) ||
      configuredOrigins.includes(origin) ||
      (configuredOrigins.length === 0);

    if (isAllowed) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads directory (for temporary files)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

import { protect } from './middleware/auth.js';

// Health check endpoint (Requirement 11)
app.get('/api/health', (req, res) => {
  const db = getDBStatus();
  res.json({
    success: true,
    message: 'NihongoHub API is healthy',
    mongodb: db.isConnected ? 'connected' : 'disconnected',
    database: db.database || 'nihongohub'
  });
});

// Protected health/debug endpoint (Requirement 11)
app.get('/api/health/debug', protect, (req, res) => {
  const db = getDBStatus();
  res.json({
    success: true,
    mongodb: db.isConnected ? 'connected' : 'disconnected',
    database: db.database || 'nihongohub',
    userId: req.user.id,
    role: req.user.role
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vocabulary', vocabularyRoutes);
app.use('/api/kanji', kanjiRoutes);
app.use('/api/user-vocabulary', userVocabularyRoutes);
app.use('/api/user-kanji', userKanjiRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/quiz-results', quizResultsRoutes);
app.use('/api/custom-chapters', customChaptersRoutes);
app.use('/api/patterns', patternsRoutes);
app.use('/api/readings', readingsRoutes);
app.use('/api/listening', listeningRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/tests', testsRoutes);
app.use('/api/admin', adminRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[API Error]:', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// 404 Route Catch-all
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `API endpoint not found: ${req.method} ${req.originalUrl}`
    });
  }
  return res.status(404).send('Not Found');
});

// Start Express server and connect to MongoDB Atlas
async function startServer() {
  await connectDB();
  await verifySmtpConnection();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
=============================================================
  🏮 NihongoHub Backend Server running on port ${PORT}
  API Base:   http://localhost:${PORT}/api
  Health:     http://localhost:${PORT}/api/health
=============================================================
`);
  });
}

startServer();

export default app;
