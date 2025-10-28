import type { MobileEventSummary, MobilePostPayload } from "@/lib/types/api"
import type { Event, Like, Post, User } from "@/lib/types/database"

export type RawPostEventEntry =
  | { event: Pick<Event, "id" | "name" | "slug" | "cover_image"> | null }
  | { event_id: string }

export type RawPost = Post & {
  user: Pick<User, "id" | "username" | "avatar_url" | "photographer_status" | "photographer_influence"> | null
  likes: Pick<Like, "user_id">[] | null
  comments: { id: string }[] | null
  downloads: { id: string }[] | null
  post_events: RawPostEventEntry[] | null
}

export const POST_SELECTION = `
  *,
  user:users!posts_user_id_fkey(id, username, avatar_url, photographer_status, photographer_influence),
  likes(user_id),
  comments(id),
  downloads(id),
  post_events(
    event:events(id, name, slug, cover_image)
  )
`

export const POST_SELECTION_EVENT_FILTER = `
  *,
  user:users!posts_user_id_fkey(id, username, avatar_url, photographer_status, photographer_influence),
  likes(user_id),
  comments(id),
  downloads(id),
  post_events!inner(event_id)
`

export function mapPostToMobile(
  post: RawPost,
  currentUserId?: string | null,
  eventContext?: Event | null,
): MobilePostPayload {
  const likes = post.likes ?? []
  const comments = post.comments ?? []
  const downloads = post.downloads ?? []

  const events = (post.post_events ?? [])
    .map((entry) => {
      if ("event" in entry && entry.event) {
        return {
          id: entry.event.id,
          name: entry.event.name,
          slug: entry.event.slug,
          coverImage: entry.event.cover_image,
        } satisfies MobileEventSummary
      }

      if ("event_id" in entry && eventContext && entry.event_id === eventContext.id) {
        return {
          id: eventContext.id,
          name: eventContext.name,
          slug: eventContext.slug,
          coverImage: eventContext.cover_image,
        } satisfies MobileEventSummary
      }

      return null
    })
    .filter((event): event is MobileEventSummary => Boolean(event))

  const dedupedEvents = Array.from(
    new Map(events.map((event) => [event.id, event])).values(),
  )

  return {
    id: post.id,
    caption: post.caption,
    mediaUrl: post.media_url,
    thumbnailUrl: post.thumbnail_url,
    type: post.type,
    tags: post.tags,
    blurhash: post.blurhash,
    width: post.width,
    height: post.height,
    qualityScore: post.quality_score,
    createdAt: post.created_at,
    user: {
      id: post.user?.id ?? "",
      username: post.user?.username ?? "unknown",
      avatarUrl: post.user?.avatar_url ?? null,
      photographerStatus: post.user?.photographer_status ?? null,
      photographerInfluence: post.user?.photographer_influence ?? 0,
    },
    stats: {
      likes: likes.length,
      comments: comments.length,
      downloads: downloads.length,
    },
    events: dedupedEvents,
    likedByCurrentUser: currentUserId ? likes.some((like) => like.user_id === currentUserId) : false,
  }
}
