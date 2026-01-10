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
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "").trim()
    const supabase = createSupabaseApiClient(token)
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

    // Determine selection early if possible
    if (view === "event") {
      selection = POST_SELECTION_EVENT_FILTER
    }

    let queryWithSelect = supabase.from("posts").select(selection)

    // Apply default filters
    // Note: session_id is IS NULL by default to show only public posts
    queryWithSelect = queryWithSelect.is("session_id", null)

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

      queryWithSelect = queryWithSelect.in("user_id", followingIds)
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

      eventContext = eventData
      queryWithSelect = queryWithSelect.eq("post_events.event_id", eventData.id)
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

      queryWithSelect = queryWithSelect.eq("user_id", userRecord.id)
    }

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
      console.error("❌ [API] Supabase error fetching posts:", error)
      return jsonResponse(
        {
          error: "Failed to load posts.",
          details: error.message,
          hint: error.hint,
          code: error.code
        },
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
  } catch (err: any) {
    console.error("❌ [API] Critical error in posts route:", err)
    return jsonResponse(
      {
        error: "Internal server error.",
        message: err instanceof Error ? err.message : String(err)
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "").trim()
    const supabase = createSupabaseApiClient(token)
    const currentUser = await getUserFromRequest(supabase, request)

    if (!currentUser) {
      return jsonResponse({ error: "Authentication required." }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const caption = formData.get("caption") as string | null
    const eventId = formData.get("eventId") as string | null

    if (!file) {
      return jsonResponse({ error: "File is required." }, { status: 400 })
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split(".").pop() || "jpg"
    const fileName = `${currentUser.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `posts/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from("posts")
      .upload(filePath, file)

    if (uploadError) {
      console.error("❌ [API] Storage error:", uploadError)
      return jsonResponse({
        error: "Failed to upload file to storage.",
        details: uploadError
      }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from("posts").getPublicUrl(filePath)

    // Insert into database
    const { data: postData, error: postError } = await (supabase as any)
      .from("posts")
      .insert({
        user_id: currentUser.id,
        media_url: publicUrl,
        type: file.type.startsWith("video/") ? "video" : "image",
        caption: caption,
      })
      .select()
      .single()

    if (postError) {
      console.error("❌ [API] Database error:", postError)
      return jsonResponse({ error: "Failed to create post record." }, { status: 500 })
    }

    // Associate with event if provided
    if (eventId && postData) {
      const { error: eventError } = await (supabase as any)
        .from("post_events")
        .insert({
          post_id: postData.id,
          event_id: eventId,
        })

      if (eventError) {
        console.error("❌ [API] Event association error:", eventError)
        // We don't fail the whole request if event association fails, 
        // but we log it.
      }
    }

    return jsonResponse({ success: true, post: postData }, { status: 201 })
  } catch (err: any) {
    console.error("❌ [API] Critical error in posts POST route:", err)
    return jsonResponse(
      {
        error: "Internal server error.",
        message: err instanceof Error ? err.message : String(err)
      },
      { status: 500 },
    )
  }
}

export function OPTIONS() {
  return corsPreflight()
}
