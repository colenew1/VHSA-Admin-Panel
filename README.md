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

## License

MIT
