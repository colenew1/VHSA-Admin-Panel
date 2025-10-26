# VHSA Admin Panel - Deployment Guide

This guide will walk you through deploying the VHSA Admin Panel to production.

## Architecture

- **Frontend**: React + Vite → Netlify
- **Backend**: Express + Node.js → Render (or similar)
- **Database**: Supabase (already set up)

---

## Part 1: Deploy Backend to Render

### Step 1: Create Render Account
1. Go to https://render.com and sign up (free tier available)
2. Connect your GitHub account

### Step 2: Create New Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: `vhsa-backend`
   - **Root Directory**: `backend`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### Step 3: Add Environment Variables
In Render dashboard, add these environment variables:
```
SUPABASE_URL=https://dnmxhlkjrjzcfwuoxfcy.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRubXhobGtqcmp6Y2Z3dW94ZmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzMzMjAsImV4cCI6MjA3NDc0OTMyMH0.wsp1uqLSXD7eZ_mtqSjwWRaeW1ME0QrMawhNSJgCU9Y
PORT=3001
```

### Step 4: Deploy
1. Click "Create Web Service"
2. Wait for deployment to complete
3. Copy your backend URL (e.g., `https://vhsa-backend.onrender.com`)

---

## Part 2: Deploy Frontend to Netlify

### Step 1: Create Netlify Account
1. Go to https://netlify.com and sign up (free tier available)
2. Connect your GitHub account

### Step 2: Create New Site
1. Click "Add new site" → "Import an existing project"
2. Choose your GitHub repository
3. Configure build settings:
   - **Base directory**: `admin-panel`
   - **Build command**: `npm run build`
   - **Publish directory**: `admin-panel/dist`

### Step 3: Add Environment Variables
In Netlify dashboard → Site settings → Environment variables:
```
VITE_API_URL=https://vhsa-backend.onrender.com
```
(Replace with your actual backend URL from Render)

### Step 4: Deploy
1. Click "Deploy site"
2. Wait for build to complete
3. Your site will be live at a Netlify URL (e.g., `https://vhsa-admin.netlify.app`)

---

## Part 3: Update CORS Settings

After deployment, update your backend's CORS configuration:

**File**: `backend/server.js`

```javascript
// Update CORS to allow your Netlify domain
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://vhsa-admin.netlify.app', // Add your Netlify URL here
  ]
}));
```

Commit and push this change to trigger a new deployment on Render.

---

## Alternative: Deploy Backend to Railway

If you prefer Railway over Render:

1. Go to https://railway.app
2. Sign up and connect GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select `backend` folder
5. Add environment variables (same as Render)
6. Deploy

---

## Troubleshooting

### Backend Issues
- **500 errors**: Check Render logs for Supabase connection errors
- **CORS errors**: Ensure your Netlify URL is in the CORS whitelist
- **Port errors**: Render automatically assigns a port; make sure your app uses `process.env.PORT`

### Frontend Issues
- **API not connecting**: Verify `VITE_API_URL` environment variable in Netlify
- **Blank page**: Check browser console for errors
- **Build fails**: Ensure all dependencies are in `package.json`

### Database Issues
- **Connection timeout**: Verify Supabase credentials are correct
- **No data**: Check Supabase dashboard to ensure tables exist and have data

---

## Custom Domain (Optional)

### Netlify
1. Go to Site settings → Domain management
2. Click "Add custom domain"
3. Follow DNS configuration instructions

### Render
1. Go to Settings → Custom Domain
2. Add your domain and update DNS records

---

## Post-Deployment Checklist

- [ ] Backend is running on Render/Railway
- [ ] Frontend is deployed on Netlify
- [ ] Environment variables are set correctly
- [ ] CORS is configured for production domain
- [ ] Test all API endpoints
- [ ] Test data loading in frontend
- [ ] Test export functionality
- [ ] Monitor for errors in dashboards

---

## Monitoring

### Render Dashboard
- View logs in real-time
- Monitor resource usage
- Set up email alerts for crashes

### Netlify Dashboard
- View build logs
- Monitor bandwidth usage
- Check deploy history

### Supabase Dashboard
- Monitor database queries
- Check API usage
- View error logs

---

## Security Notes

1. **Never commit `.env` files** - they're already in `.gitignore`
2. **Use environment variables** for all sensitive data
3. **Rotate API keys** regularly in Supabase dashboard
4. **Enable HTTPS only** - both Netlify and Render provide this by default
5. **Monitor logs** for suspicious activity

---

## Support

If you encounter issues:
- Check deployment logs in Render/Netlify dashboards
- Verify all environment variables are set
- Test API endpoints directly using curl or Postman
- Check Supabase connection in the Supabase dashboard
