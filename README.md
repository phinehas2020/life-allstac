# Life.Allstac - Community Photo Sharing Platform

A modern photo and video sharing platform for your church/community that combines Instagram-style social features with Unsplash-like free downloads.

## Features

- **User Authentication**: Sign up, login, and profile management
- **Photo & Video Upload**: Support for images (JPG, PNG, GIF, WebP) and videos (up to 10 seconds)
- **Events System**: Admins can create events/categories for organized photo sharing
- **Social Features**: Like, comment, follow users and events
- **Discovery**: Browse everything feed, following feed, and event-specific galleries
- **Download**: Free downloads with resolution options
- **Responsive Design**: Works beautifully on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14+ with App Router, React 18, TypeScript
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
git clone <your-repo-url>
cd life.allstac
npm install
```

### 2. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor in your Supabase dashboard
3. Run the SQL from `supabase-schema.sql` to create all tables and policies
4. Go to Storage and create these buckets:
   - `avatars` (public)
   - `posts` (public)
   - `events` (public)

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Get these from your Supabase project settings
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
4. Now you can create and manage events

## Deployment to Vercel

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Add environment variables in Vercel project settings
4. Configure custom domain (life.allstac.com):
   - Add domain in Vercel project settings
   - Update DNS records with your domain provider

## Project Structure

```
life.allstac/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── (main)/            # Main app pages
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Custom components
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

### For Admins
1. Create events from the Events page
2. Manage event details and featured status
3. Monitor community content
4. Delete inappropriate content

## Admin Dashboard

- Visit `/admin` (admin accounts only) to see platform health at a glance.
- Metrics include total members, published posts, cumulative interactions (likes/comments/downloads), and event activity.
- Recent activity cards surface the latest uploads, new signups, and top-performing events so you can act quickly.
- Admin navigation also links straight to photographer approvals at `/admin/photographers`.

## Mobile API for Native Clients

Build native apps (Swift/iOS, Android, etc.) against a stable JSON layer without duplicating frontend logic.

### Authentication & Headers

- Authenticate with Supabase as usual on-device and send the access token on every request: `Authorization: Bearer <access_token>`.
- All responses include CORS headers (`Access-Control-Allow-Origin: *`), so direct calls from simulators or devices just work.

### Available Endpoints

- `GET /api/mobile/posts` – Feed data with author, event, and engagement counts. Query params:
  - `page` (default `0`) and `limit` (default `20`, max `50`)
  - `view=everything|following|event|user`
  - `eventSlug` / `username` when filtering by event or user
  - `sort=quality|latest`
- `GET /api/mobile/posts/:id` – Detailed payload for a single post.
- `GET /api/mobile/events` – Event summaries with follower counts and whether the current user follows each one (`isFollowing`).
- `GET /api/mobile/users/:username` – Profile info, follower/following counts, and recent posts.
- `GET /api/mobile/metrics` – High-level totals and 7‑day deltas for users, posts, and interactions (ideal for in-app dashboards).

Response schemas are described in `lib/types/api.ts` (`MobilePostPayload`, `MobileEventsResponse`, etc.) so TypeScript and Swift models stay in sync. Example request:

```bash
curl -H "Authorization: Bearer <token>" \
     https://your-domain.com/api/mobile/posts?view=everything&limit=10
```

## Database Schema

- **users**: User profiles and authentication
- **events**: Community events/categories
- **posts**: Uploaded photos and videos
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
- Secure file storage with Supabase Storage

## Performance Optimizations

- Lazy loading images
- Masonry grid layout
- Optimistic UI updates
- CDN delivery via Supabase
- Next.js image optimization

## Future Enhancements

- Mobile app (React Native)
- Advanced search and filters
- User notifications
- Private messaging
- Analytics dashboard
- Content moderation tools

## Support

For issues or questions, please create an issue in the GitHub repository.

## License

MIT License - feel free to use this project for your community!
