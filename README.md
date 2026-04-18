# 🚚 SwiftLogistics — Production Deploy Guide

A full-stack logistics dashboard built with React + Supabase, deployable to Netlify in minutes.

---

## Stack

- **Frontend**: React 18 + Vite
- **Backend / DB**: Supabase (Postgres + Auth + Realtime)
- **Hosting**: Netlify
- **Auth**: Supabase Auth (email/password + password reset)

---

## Folder Structure

```
swiftlog/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── ChatPanel.jsx    # Real-time chat (Supabase)
│   │   ├── Sidebar.jsx      # Collapsible + mobile-responsive
│   │   └── UI.jsx           # Shared base components
│   ├── lib/
│   │   ├── supabase.js      # Supabase client
│   │   └── theme.js         # Design tokens + global CSS
│   ├── pages/
│   │   ├── Auth.jsx         # Login / Signup / Password reset
│   │   ├── UserDash.jsx     # Customer dashboard
│   │   └── AdminDash.jsx    # Admin dashboard
│   ├── App.jsx              # Root with session management
│   └── main.jsx             # Vite entry
├── supabase_setup.sql       # Run this in Supabase SQL Editor
├── netlify.toml             # Netlify build config
├── .env.example             # Copy to .env and fill in
└── package.json
```

---

## Step 1 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account + new project
2. Wait for the project to be ready (~1 min)
3. Go to **SQL Editor** and paste + run the entire `supabase_setup.sql` file
4. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://abcdef.supabase.co`)
   - **anon public** key (long JWT string)

---

## Step 2 — Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Step 3 — Install and run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

---

## Step 4 — Create the admin account

1. Open the app and sign up with `admin@swiftlog.com` (or whatever email you want)
2. Go to Supabase **SQL Editor** and run:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'admin@swiftlog.com'
);
```

3. Sign in — you'll now see the Admin Dashboard

---

## Step 5 — Deploy to Netlify

### Option A — Drag and drop (fastest)

```bash
npm run build
```

Then drag the `dist/` folder to [app.netlify.com/drop](https://app.netlify.com/drop)

**Important**: After drag-drop, go to Site Settings → Environment Variables and add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Then trigger a redeploy.

### Option B — GitHub (recommended for ongoing use)

1. Push this project to a GitHub repo
2. Go to [app.netlify.com](https://app.netlify.com) → Add new site → Import from Git
3. Connect your repo
4. Build settings are auto-detected from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables under **Site Settings → Environment Variables**
6. Deploy

Every `git push` will auto-deploy.

---

## Step 6 — Configure Supabase Auth (email confirmation)

By default Supabase requires email confirmation. For testing you can disable it:

**Supabase Dashboard → Authentication → Settings → Email Auth**  
→ Toggle off "Confirm email"

For production, leave it on and configure your SMTP settings.

---

## Features

### User side
- Sign up / login / forgot password
- Submit delivery requests
- View all deliveries with status tracking
- Real-time support chat with admin
- Profile page

### Admin side
- Overview dashboard with stats
- Assign riders to pending deliveries
- Update delivery statuses
- Sanction / suspend / reinstate users
- Real-time chat with all customers (split view: chat top, delivery info bottom)
- Collapsible sidebar

### Technical
- Collapsible sidebar (desktop) + drawer (mobile)
- Supabase Realtime subscriptions on deliveries, messages, profiles
- Row Level Security (RLS) on all tables
- Password reset via email link
- Session persistence (auto-login on refresh)

---

## Troubleshooting

**"Missing Supabase env vars"** — Make sure `.env` is filled in and you restarted `npm run dev`

**Users can't see their deliveries** — Check RLS policies ran correctly in `supabase_setup.sql`

**Admin can't update deliveries** — Make sure your account's `role` is `'admin'` in the profiles table

**Realtime not working** — Make sure you ran the `alter publication supabase_realtime` lines in the SQL setup

**Netlify 404 on refresh** — The `netlify.toml` redirect handles this; make sure it's in your repo root
