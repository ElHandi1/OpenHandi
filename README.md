# OpenHandi Personal Assistant

A sophisticated, persistent personal AI assistant and autonomous cron workload manager.

## Architecture Highlights
- **Frontend**: React, Vite, Tailwind CSS, built with a refined SaaS Glassmorphism architecture. Real-time connections to your databases.
- **Backend**: Node.js, Express, `node-cron` memory-resilient schedulers.
- **Database**: Supabase (Postgres).
- **Intelligence**: OpenRouter dynamically routing between `minimax-m2.5:free` and `llama-3.1-nemotron-ultra-253b-v1:free` via custom LLM orchestration with rate-limit handling.

## Deployment & Setup

### 1. Database (Supabase)
Run the SQL migration script from `supabase/migrations/00_init.sql` on your Supabase SQL editor.

### 2. Rendering Backend
Prepare a Web Service on Render (Free Tier supported).
Set these Environment Variables in your Render Dashboard:
```
PORT=3000
OPENROUTER_API_KEY=your_key
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CONTEXT_WINDOW=20
ASSISTANT_TOKEN=your_secret_password
```

Inside the `backend` folder:
- Run `npm install`
- Start server with `npm start`

> Note: Configure a free UptimeRobot ping pointing to `https://your-backend.onrender.com/health` every 10 minutes to prevent the backend from sleeping.

### 3. Vercel Frontend
Deploy the `frontend` folder using Vercel. 
Environment Variables:
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=https://your-backend.onrender.com
VITE_ASSISTANT_TOKEN=your_secret_password
```

Inside the `frontend` folder:
- Run `npm install`
- Run `npm run dev` to serve locally.
