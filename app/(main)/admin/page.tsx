import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { fetchPlatformMetrics } from "@/lib/supabase/analytics"
import { mapPostToMobile, POST_SELECTION, type RawPost } from "@/lib/api/posts"
import type { Event, User } from "@/lib/types/database"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Activity,
  ArrowUpRight,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Users as UsersIcon,
  Download as DownloadIcon,
} from "lucide-react"

type EventWithCounts = Event & {
  post_events: { count: number }[] | null
  event_follows: { count: number }[] | null
}

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient()

  const [metrics, usersRes, postsRes, eventsRes] = await Promise.all([
    fetchPlatformMetrics(supabase),
    supabase
      .from("users")
      .select("id, username, email, photographer_status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("posts")
      .select(POST_SELECTION)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("events")
      .select(`
        *,
        post_events(count),
        event_follows(count)
      `)
      .limit(6),
  ])

  if (usersRes.error) {
    console.error("Failed to load recent users", usersRes.error)
  }

  if (postsRes.error) {
    console.error("Failed to load recent posts", postsRes.error)
  }

  if (eventsRes.error) {
    console.error("Failed to load events", eventsRes.error)
  }

  const recentUsers = (usersRes.data as User[] | null) ?? []
  const recentPosts = ((postsRes.data as RawPost[] | null) ?? []).map((post) =>
    mapPostToMobile(post),
  )

  const eventsWithCounts = ((eventsRes.data as EventWithCounts[] | null) ?? []).map((event) => ({
    ...event,
    postCount: event.post_events?.[0]?.count ?? 0,
    followerCount: event.event_follows?.[0]?.count ?? 0,
  }))

  const topEvents = eventsWithCounts
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 5)

  const eventPostVolume = topEvents.reduce((total, event) => total + event.postCount, 0)

  const summaryCards = [
    {
      label: "Active Members",
      value: metrics.totals.users,
      icon: UsersIcon,
      description: `${metrics.weekly.newUsers.toLocaleString()} joined this week`,
    },
    {
      label: "Published Posts",
      value: metrics.totals.posts,
      icon: ImageIcon,
      description: `${metrics.weekly.posts.toLocaleString()} new this week`,
    },
    {
      label: "Total Interactions",
      value: metrics.totals.interactions,
      icon: Activity,
      description: `${metrics.weekly.interactions.toLocaleString()} this week`,
    },
    {
      label: "Live Events",
      value: metrics.totals.events,
      icon: Sparkles,
      description: eventPostVolume
        ? `${eventPostVolume.toLocaleString()} posts shared recently`
        : "No event activity yet",
    },
  ] as const

  return (
    <div className="space-y-8">
      <section>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <card.icon className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {card.value.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recent Posts
            </CardTitle>
            <CardDescription>
              Latest uploads across the community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPosts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No posts have been published yet.
                </p>
              )}
              {recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between gap-4 border-b border-border pb-4 last:border-none last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {post.caption || "Untitled post"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {post.user.username} ·{" "}
                      {formatDistanceToNow(new Date(post.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                    {post.events.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {post.events[0].name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1 font-medium">
                      <Heart className="h-3.5 w-3.5 text-rose-500" />
                      {post.stats.likes}
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <MessageCircle className="h-3.5 w-3.5 text-blue-500" />
                      {post.stats.comments}
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <DownloadIcon className="h-3.5 w-3.5 text-emerald-500" />
                      {post.stats.downloads}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-primary" />
              New Members
            </CardTitle>
            <CardDescription>
              Most recent signups and photographer applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No members have joined yet.
                </p>
              )}
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between border-b border-border pb-4 last:border-none last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {user.username || user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Joined{" "}
                      {formatDistanceToNow(new Date(user.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground border border-border px-2 py-1 rounded-full">
                    {user.photographer_status
                      ? user.photographer_status.replace(/_/g, " ")
                      : "member"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Top Events
            </CardTitle>
            <CardDescription>
              Events ranked by total posts and followers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topEvents.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Create an event to start tracking community activity.
                </p>
              )}
              {topEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between border border-border/60 rounded-lg px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {event.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.postCount.toLocaleString()} posts ·{" "}
                      {event.followerCount.toLocaleString()} followers
                    </p>
                  </div>
                  <Link
                    href={`/events/${event.slug}`}
                    className="text-xs font-medium text-primary flex items-center gap-1 hover:underline"
                  >
                    View
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
