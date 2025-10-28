import type { NextRequest } from "next/server"
import { corsPreflight, jsonResponse } from "@/lib/api/response"
import { createSupabaseApiClient, getUserFromRequest } from "@/lib/api/supabase"
import { mapPostToMobile, POST_SELECTION, type RawPost } from "@/lib/api/posts"
import type { MobileUserProfileResponse } from "@/lib/types/api"
import type { User } from "@/lib/types/database"

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } },
) {
  const supabase = createSupabaseApiClient()
  const currentUser = await getUserFromRequest(supabase, request)
  const username = params.username

  const { data: userRecord, error: userError } = await (supabase as any)
    .from("users")
    .select("*")
    .eq("username", username)
    .maybeSingle()

  if (userError) {
    return jsonResponse(
      { error: "Failed to load user profile." },
      { status: 500 },
    )
  }

  if (!userRecord) {
    return jsonResponse(
      { error: "User not found." },
      { status: 404 },
    )
  }

  const isCurrentUser = currentUser?.id === userRecord.id

  const [
    postsCountResponse,
    followersCountResponse,
    followingCountResponse,
  ] = await Promise.all([
    (supabase as any)
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userRecord.id),
    (supabase as any)
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", userRecord.id),
    (supabase as any)
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", userRecord.id),
  ])

  const postsCount = postsCountResponse.count ?? 0
  const followersCount = followersCountResponse.count ?? 0
  const followingCount = followingCountResponse.count ?? 0

  let isFollowing = false

  if (currentUser && !isCurrentUser) {
    const { data: followData } = await (supabase as any)
      .from("follows")
      .select("id")
      .eq("follower_id", currentUser.id)
      .eq("following_id", userRecord.id)
      .maybeSingle()

    isFollowing = Boolean(followData)
  }

  const { data: recentPostsData, error: postsError } = await (supabase as any)
    .from("posts")
    .select(POST_SELECTION)
    .eq("user_id", userRecord.id)
    .order("created_at", { ascending: false })
    .limit(10)

  if (postsError) {
    return jsonResponse(
      { error: "Failed to load user posts." },
      { status: 500 },
    )
  }

  const recentPosts = ((recentPostsData as RawPost[]) ?? []).map((post) =>
    mapPostToMobile(post, currentUser?.id),
  )

  const payload: MobileUserProfileResponse = {
    user: {
      id: userRecord.id,
      username: userRecord.username,
      avatarUrl: userRecord.avatar_url,
      bio: userRecord.bio,
      photographerStatus: userRecord.photographer_status,
      photographerInfluence: userRecord.photographer_influence,
      createdAt: userRecord.created_at,
    },
    stats: {
      posts: postsCount,
      followers: followersCount,
      following: followingCount,
    },
    recentPosts,
    relationships: {
      isCurrentUser,
      isFollowing,
    },
  }

  return jsonResponse(payload)
}

export function OPTIONS() {
  return corsPreflight()
}
