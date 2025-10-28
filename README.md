# Life. - Community Photo Sharing Platform

A modern photo and video sharing platform for your church/community with a sophisticated photographer rating system.

## Features

- **User Authentication**: Sign up, login, and profile management
- **Photo & Video Upload**: Support for images (JPG, PNG, GIF, WebP) and videos (up to 10 seconds)
- **Events System**: Admins can create events/categories for organized photo sharing
- **Social Features**: Like, comment, follow users and events
- **Photographer Rating System**: Merit-based photo quality ratings with dynamic influence weights
- **Discovery**: Browse everything feed, following feed, and event-specific galleries
- **Download**: Free downloads with resolution options
- **Responsive Design**: Works beautifully on desktop and mobile devices

## Photographer Rating System

### How It Works

Our unique time-weighted predictive accuracy system rewards photographers who can identify quality early:

**Influence Scoring:**
- All photographers start with 1.0x influence
- Early accurate ratings earn more influence (up to 1.5x bonus)
- Late or inaccurate ratings earn less or lose influence
- Maximum influence: 5.0x (Master level)

**Time Bonuses:**
- Rate within 2 hours: 1.5x multiplier
- Rate within 24 hours: 1.0x multiplier
- Rate within 3 days: 0.5x multiplier
- After 3 days: 0.2x multiplier

**Accuracy Evaluation (after 7 days):**
- System checks if photographer's rating matched actual community engagement
- Accurate predictions increase influence
- Inaccurate predictions decrease influence

**Photographer Levels:**
- Beginner: 1.0-1.49x
- Intermediate: 1.5-1.99x
- Advanced: 2.0-2.99x
- Expert: 3.0-3.99x
- Master: 4.0-5.0x

## Tech Stack

- **Frontend**: Next.js 14 with App Router, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Deployment**: Vercel

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Vercel account (for deployment)

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/phinehas2020/life-allstac.git
cd life-allstac
npm install
```

### 2. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor in your Supabase dashboard
3. Run the SQL from `supabase-schema.sql` to create all tables and policies
4. Run the SQL from `supabase-migration-photographer-system.sql` to add photographer features
5. Go to Storage and create these buckets:
   - `avatars` (public)
   - `posts` (public)
   - `events` (public)

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 5. Create Admin User

1. Sign up for a new account
2. In Supabase dashboard, go to Table Editor > users
3. Find your user and set `is_admin` to `true`
4. Now you can create events and approve photographers

### 6. Maintain Photographer Influence (Optional)

Set up a daily cron job to evaluate photographer accuracy:

```sql
SELECT * FROM evaluate_rating_accuracy();
```

This function checks ratings that are 7+ days old and updates photographer influence based on accuracy.

## Deployment to Vercel

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Add environment variables in Vercel project settings
4. Configure custom domain (life.allstac.com)

## Project Structure

```
life.allstac/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── (main)/            # Main app pages
│   │   ├── admin/         # Admin pages
│   │   ├── events/        # Events and event detail pages
│   │   ├── photographers/ # Photographer leaderboard
│   │   └── ...
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── photographer-badge.tsx
│   ├── photo-rating.tsx
│   └── ...
├── lib/                   # Utilities and configurations
│   ├── supabase/         # Supabase clients
│   ├── types/            # TypeScript types
│   └── utils/            # Helper functions
└── public/               # Static assets
```

## Usage Guide

### For Regular Users
1. Sign up or log in
2. Browse photos in the home feed
3. Upload your own photos/videos
4. Like, comment, and follow other users
5. Join events to share event-specific photos
6. Apply to become a photographer to rate photos

### For Photographers
1. Apply via your profile page
2. Once approved, rate photos with 1-5 stars
3. Rate early for maximum influence bonus
4. Build your influence through accurate predictions
5. View your stats on the leaderboard

### For Admins
1. Create events from the Events page
2. Approve/deny photographer applications
3. Monitor photographer performance
4. Manage community content

## Database Schema

- **users**: User profiles, authentication, and photographer data
- **events**: Community events/categories
- **posts**: Uploaded photos and videos with quality scores
- **photo_ratings**: Photographer ratings with influence tracking
- **post_events**: Links posts to events
- **likes**: User likes on posts
- **comments**: Comments on posts
- **follows**: User-to-user following
- **event_follows**: User following events
- **downloads**: Track downloads

## Security

- Row Level Security (RLS) enabled on all tables
- Authentication required for uploads and social features
- Admin-only event management
- Photographer-only rating permissions
- Secure file storage with Supabase Storage

## Performance Optimizations

- Lazy loading images
- Masonry grid layout
- Optimistic UI updates
- CDN delivery via Supabase
- Next.js image optimization
- Quality-weighted feed algorithm

## License

MIT License - feel free to use this project for your community!