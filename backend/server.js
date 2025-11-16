// MUST load dotenv FIRST
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// NOW import everything else
import express from 'express';
import cors from 'cors';
import dashboardRoutes from './routes/dashboard.js';
import studentRoutes from './routes/students.js';
import schoolRoutes from './routes/schools.js';
import screenerRoutes from './routes/screeners.js';
import exportRoutes from './routes/exports.js';
import screeningRoutes from './routes/screening.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS Configuration
const allowedOrigins = [
  'https://vhsa-admin-panel.netlify.app',
  process.env.FRONTEND_URL, // Additional frontend URL from environment
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      console.log('CORS: No origin, allowing');
      return callback(null, true);
    }

    console.log('CORS: Checking origin:', origin);

    // Allow all localhost origins for local development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      console.log('CORS: Localhost origin allowed');
      return callback(null, true);
    }

    // Check against allowed production origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('CORS: Production origin allowed');
      callback(null, true);
    } else {
      // Log the origin for debugging
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Middleware
app.use(express.json());

// Root route - API information
app.get('/', (req, res) => {
  console.log('Root route hit');
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

// Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/screeners', screenerRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/screening', screeningRoutes);

console.log('✓ Routes registered: /, /health, /api/dashboard, /api/students, /api/schools, /api/screeners, /api/exports, /api/screening');

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler for unknown routes
app.use((req, res, next) => {
  res.status(404).json({
    message: `Route ${req.method}:${req.path} not found`,
    error: 'Not Found',
    statusCode: 404
  });
});

// Error handling
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  // Don't crash the server, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Exit gracefully on uncaught exceptions
  process.exit(1);
});

const server = app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
});

// Handle server errors (like EADDRINUSE)
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use.`);
    console.error('   Try killing the existing process or use a different port.');
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});
