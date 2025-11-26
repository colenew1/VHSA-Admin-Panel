// Load environment variables first
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Import dependencies
import express from 'express';
import cors from 'cors';
import dashboardRoutes from './routes/dashboard.js';
import studentRoutes from './routes/students.js';
import schoolRoutes from './routes/schools.js';
import screenerRoutes from './routes/screeners.js';
import adminUserRoutes from './routes/adminUsers.js';
import exportRoutes from './routes/exports.js';
import screeningRoutes from './routes/screening.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Allowed origins for CORS
const allowedOrigins = [
  'https://vhsa-admin-panel.netlify.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

// CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // Allow localhost in development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }

    // Allow any Netlify domain
    if (origin.includes('.netlify.app') || origin.includes('.netlify.com')) {
      return callback(null, true);
    }

    // Check against allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow all origins with a warning
    if (!isProduction) {
      console.log('CORS: Allowing unregistered origin in development:', origin);
      return callback(null, true);
    }

    // In production, reject unknown origins
    console.warn('CORS: Blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Middleware
app.use(express.json());

// Root route - API information
app.get('/', (req, res) => {
  res.json({
    name: 'VHSA Screening API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      dashboard: '/api/dashboard',
      students: '/api/students/incomplete',
      schools: '/api/schools',
      exports: {
        state: '/api/exports/state?school=SCHOOL_NAME&year=YEAR',
        stickers: '/api/exports/stickers?school=SCHOOL_NAME'
      },
      screening: {
        data: '/api/screening/data?school=all&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&limit=50&offset=0',
        update: '/api/screening/:student_id (PUT)'
      }
    }
  });
});

// API Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/screeners', screenerRoutes);
app.use('/api/admin-users', adminUserRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/screening', screeningRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: `Route ${req.method}:${req.path} not found`,
    error: 'Not Found',
    statusCode: 404
  });
});

// Error handling
app.use(errorHandler);

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  if (!isProduction) {
    console.log('  Mode: Development');
  }
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});
