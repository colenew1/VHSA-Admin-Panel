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
import exportRoutes from './routes/exports.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL, // Add your Netlify URL as environment variable
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
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
      }
    }
  });
});

// Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/exports', exportRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
