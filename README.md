# VHSA Admin Panel

Full-stack admin panel for health screening data management and reporting.

## Project Structure

- **Backend**: Express API server (`/backend`)
- **Frontend**: React + Vite admin panel (`/admin-panel`)

## Features

- Real-time dashboard with screening progress statistics
- School-wise screening breakdown
- Incomplete student tracking
- CSV export for state reports and sticker labels
- Dynamic school dropdown population
- Date filtering (today, yesterday, this week, this month, custom range)

## Tech Stack

**Backend:**
- Node.js + Express
- Supabase (PostgreSQL)
- REST API

**Frontend:**
- React + Vite
- Tailwind CSS
- React Router
- React Query (TanStack Query)
- Axios

## Setup

### Prerequisites
- Node.js 18+
- npm
- Supabase account with project URL and API key

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` and add your Supabase credentials:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3001
```

5. Start the backend server:
```bash
npm run dev
```

Backend runs on http://localhost:3001

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd admin-panel
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env.local
```

4. Edit `.env.local` and set the API URL:
```
VITE_API_URL=http://localhost:3001
```

5. Start the development server:
```bash
npm run dev
```

Frontend runs on http://localhost:5173

## Database Schema

This application reads from the following Supabase tables/views:

- `students` - Student information
- `screening_results` - Screening test results
- `schools` - School information (active status)
- `screeners` - Screener information
- `todays_progress` - View for today's screening progress
- `incomplete_students` - View for students with incomplete screenings
- `state_export` - View for state report CSV export
- `sticker_labels` - View for sticker label CSV export

## API Endpoints

- `GET /api/dashboard` - Dashboard statistics and school breakdown
- `GET /api/students/incomplete` - List incomplete students
- `GET /api/schools` - List active schools
- `GET /api/exports/state` - Export state report CSV
- `GET /api/exports/stickers` - Export sticker labels CSV
- `GET /health` - Health check endpoint

## Running in Production

### Backend
```bash
npm start
```

### Frontend
```bash
npm run build
npm run preview
```

## Deployment

### Backend Deployment

The backend needs to be deployed to a hosting service that supports Node.js. Recommended options:

- **Railway** (https://railway.app)
- **Render** (https://render.com)
- **Heroku** (https://heroku.com)
- **Fly.io** (https://fly.io)

**Steps:**
1. Push your backend code to GitHub
2. Connect your repository to your hosting service
3. Set environment variables in your hosting service:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_ANON_KEY` - Your Supabase anon key
   - `PORT` - Usually auto-set by hosting service (default: 3001)
   - `FRONTEND_URL` - Your frontend URL (e.g., `https://vhsa-admin-panel.netlify.app`)
4. Deploy and note your backend URL (e.g., `https://your-backend.railway.app`)

### Frontend Deployment (Netlify)

1. Connect your GitHub repository to Netlify
2. Set build settings:
   - **Base directory**: `admin-panel`
   - **Build command**: `npm run build`
   - **Publish directory**: `admin-panel/dist`
3. **Set environment variables in Netlify:**
   - `VITE_API_URL` - Your deployed backend URL (e.g., `https://your-backend.railway.app`)
4. Deploy

**Important:** After deploying the backend, update the `VITE_API_URL` in Netlify to point to your production backend URL, not `localhost:3001`.

### CORS Configuration

The backend is configured to allow requests from:
- `http://localhost:5173` (local development)
- `http://localhost:3000` (alternative local port)
- `https://vhsa-admin-panel.netlify.app` (production frontend)
- Any URL set in `FRONTEND_URL` environment variable

If you deploy to a different frontend URL, add it to the `allowedOrigins` array in `backend/server.js` or set it via the `FRONTEND_URL` environment variable.

## License

MIT
