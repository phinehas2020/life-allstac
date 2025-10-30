import type { Event, Post, User } from "@/lib/types/database"

export interface MobilePostAuthor {
  id: User["id"]
  username: User["username"]
  avatarUrl: User["avatar_url"]
  photographerStatus: User["photographer_status"]
  photographerInfluence: User["photographer_influence"]
}

export interface MobileEventSummary {
  id: Event["id"]
  name: Event["name"]
  slug: Event["slug"]
  coverImage: Event["cover_image"]
}

export interface MobilePostStats {
  likes: number
  comments: number
  downloads: number
}

export interface MobilePostPayload {
  id: Post["id"]
  caption: Post["caption"]
  mediaUrl: Post["media_url"]
  thumbnailUrl: Post["thumbnail_url"]
  type: Post["type"]
  tags: Post["tags"]
  blurhash: Post["blurhash"]
  width: Post["width"]
  height: Post["height"]
  qualityScore: Post["quality_score"]
  createdAt: Post["created_at"]
  user: MobilePostAuthor
  stats: MobilePostStats
  events: MobileEventSummary[]
  likedByCurrentUser: boolean
  comments?: Array<{
    id: string
    content: string
    createdAt: string
    user: {
      id: string
      username: string | null
      avatarUrl: string | null
    } | null
  }>
}

export interface MobileFeedResponse {
  posts: MobilePostPayload[]
  pagination: {
    page: number
    limit: number
    hasMore: boolean
  }
}

export interface MobileEventPayload extends MobileEventSummary {
  description: Event["description"]
  startDate: Event["start_date"]
  endDate: Event["end_date"]
  isFeatured: Event["is_featured"]
  postCount: number
  followerCount: number
  isFollowing: boolean
}

export interface MobileEventsResponse {
  events: MobileEventPayload[]
}

export interface MobilePostDetailResponse {
  post: MobilePostPayload
}

export interface MobileUserStats {
  posts: number
  followers: number
  following: number
}

export interface MobileUserProfileResponse {
  user: {
    id: User["id"]
    username: User["username"]
    avatarUrl: User["avatar_url"]
    bio: User["bio"]
    photographerStatus: User["photographer_status"]
    photographerInfluence: User["photographer_influence"]
    createdAt: User["created_at"]
  }
  stats: MobileUserStats
  recentPosts: MobilePostPayload[]
  relationships: {
    isCurrentUser: boolean
    isFollowing: boolean
  }
}

export interface MobileMetricsResponse {
  totals: {
    users: number
    posts: number
    events: number
    likes: number
    comments: number
    downloads: number
    interactions: number
  }
  weekly: {
    newUsers: number
    posts: number
    interactions: number
  }
}
