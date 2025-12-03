import type { NextRequest } from "next/server"
import { jsonResponse, corsPreflight } from "@/lib/api/response"
import { createSupabaseApiClient, getUserFromRequest } from "@/lib/api/supabase"
import type { MobileFeedResponse } from "@/lib/types/api"
import type { Event } from "@/lib/types/database"
import {
  mapPostToMobile,
  POST_SELECTION,
  POST_SELECTION_EVENT_FILTER,
  type RawPost,
} from "@/lib/api/posts"

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

export async function GET(request: NextRequest) {
  const supabase = createSupabaseApiClient()
  const currentUser = await getUserFromRequest(supabase, request)

  const url = new URL(request.url)
  const page = Math.max(parseInt(url.searchParams.get("page") ?? "0", 10), 0)
  const limitParam = parseInt(url.searchParams.get("limit") ?? `${DEFAULT_LIMIT}`, 10)
  const limit = Math.max(1, Math.min(Number.isNaN(limitParam) ? DEFAULT_LIMIT : limitParam, MAX_LIMIT))
  const view = (url.searchParams.get("view") ?? "everything").toLowerCase()
  const eventSlug = url.searchParams.get("eventSlug") ?? url.searchParams.get("event_slug")
  const username = url.searchParams.get("username")
  const sort = (url.searchParams.get("sort") ?? "quality").toLowerCase()

  const offsetStart = page * limit
  const offsetEnd = offsetStart + limit - 1

  let selection = POST_SELECTION
  let eventContext: Event | null = null
  let postQuery = (supabase as any).from("posts").is("session_id", null)

  // Filter by view
  if (view === "following") {
    if (!currentUser) {
      return jsonResponse(
        { error: "Authentication required for following feed." },
        { status: 401 },
      )
    }

    const { data: followingRows, error: followingError } = await (supabase as any)
      .from("follows")
      .select("following_id")
      .eq("follower_id", currentUser.id)

    if (followingError) {
      return jsonResponse(
        { error: "Failed to load following list." },
        { status: 500 },
      )
    }

    const followingIds = (followingRows ?? []).map((row: any) => row.following_id)

    if (followingIds.length === 0) {
      const emptyPayload: MobileFeedResponse = {
        posts: [],
        pagination: {
          page,
          limit,
          hasMore: false,
        },
      }
      return jsonResponse(emptyPayload)
    }

    postQuery = postQuery.in("user_id", followingIds)
  } else if (view === "event") {
    if (!eventSlug) {
      return jsonResponse(
        { error: "eventSlug parameter is required for event view." },
        { status: 400 },
      )
    }

    const { data: eventData, error: eventError } = await (supabase as any)
      .from("events")
      .select("*")
      .eq("slug", eventSlug)
      .single()

    if (eventError || !eventData) {
      return jsonResponse(
        { error: "Event not found." },
        { status: 404 },
      )
    }

    selection = POST_SELECTION_EVENT_FILTER
    eventContext = eventData
    postQuery = postQuery.eq("post_events.event_id", eventData.id)
  } else if (view === "user") {
    if (!username) {
      return jsonResponse(
        { error: "username parameter is required for user view." },
        { status: 400 },
      )
    }

    const { data: userRecord, error: userError } = await (supabase as any)
      .from("users")
      .select("id")
      .eq("username", username)
      .single()

    if (userError || !userRecord) {
      return jsonResponse(
        { error: "User not found." },
        { status: 404 },
      )
    }

    postQuery = postQuery.eq("user_id", userRecord.id)
  }

  let queryWithSelect = postQuery.select(selection, { count: "exact" })

  // Sorting
  if (sort === "latest") {
    queryWithSelect = queryWithSelect.order("created_at", { ascending: false })
  } else {
    queryWithSelect = queryWithSelect
      .order("quality_score", { ascending: false })
      .order("created_at", { ascending: false })
  }

  const { data, error, count } = await queryWithSelect.range(offsetStart, offsetEnd)

  if (error) {
    return jsonResponse(
      { error: "Failed to load posts." },
      { status: 500 },
    )
  }

  const posts = ((data as RawPost[]) ?? []).map((post) =>
    mapPostToMobile(post, currentUser?.id, eventContext),
  )

  const total = count ?? posts.length
  const hasMore = count !== null && count !== undefined
    ? (page + 1) * limit < total
    : posts.length === limit

  const payload: MobileFeedResponse = {
    posts,
    pagination: {
      page,
      limit,
      hasMore,
    },
  }

  return jsonResponse(payload)
}

export function OPTIONS() {
  return corsPreflight()
}
