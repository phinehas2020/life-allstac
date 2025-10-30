import type { NextRequest } from "next/server"
import { corsPreflight, jsonResponse } from "@/lib/api/response"
import { createSupabaseApiClient, getUserFromRequest } from "@/lib/api/supabase"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseApiClient()
  const currentUser = await getUserFromRequest(supabase, request)
  const postId = params.id

  if (!currentUser) {
    return jsonResponse(
      { error: "Authentication required." },
      { status: 401 },
    )
  }

  // Check if user is an approved photographer
  const { data: userData } = await (supabase as any)
    .from("users")
    .select("photographer_status, photographer_influence")
    .eq("id", currentUser.id)
    .single()

  if (userData?.photographer_status !== "approved") {
    return jsonResponse(
      { error: "Only approved photographers can rate photos." },
      { status: 403 },
    )
  }

  const body = await request.json()
  const { rating } = body

  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
    return jsonResponse(
      { error: "Rating must be between 1 and 5." },
      { status: 400 },
    )
  }

  // Check if post exists and get creation time
  const { data: postData } = await (supabase as any)
    .from("posts")
    .select("created_at, user_id")
    .eq("id", postId)
    .single()

  if (!postData) {
    return jsonResponse(
      { error: "Post not found." },
      { status: 404 },
    )
  }

  // Check if user is rating their own post
  if (postData.user_id === currentUser.id) {
    return jsonResponse(
      { error: "You cannot rate your own post." },
      { status: 400 },
    )
  }

  // Calculate time bonus
  const hoursSincePost =
    (Date.now() - new Date(postData.created_at).getTime()) / (1000 * 60 * 60)
  
  let timeBonus = 0.2
  if (hoursSincePost <= 2) {
    timeBonus = 1.5
  } else if (hoursSincePost <= 24) {
    timeBonus = 1.0
  } else if (hoursSincePost <= 72) {
    timeBonus = 0.5
  }

  const ratingLabelMap: Record<number, string> = {
    1: "low_quality",
    2: "standard",
    3: "good",
    4: "high_quality",
    5: "exceptional",
  }

  // Check for existing rating
  const { data: existingRating } = await (supabase as any)
    .from("photo_ratings")
    .select("id")
    .eq("user_id", currentUser.id)
    .eq("post_id", postId)
    .maybeSingle()

  if (existingRating) {
    // Update existing rating
    const { error } = await (supabase as any)
      .from("photo_ratings")
      .update({
        rating,
        rating_label: ratingLabelMap[rating],
        time_to_rate_hours: hoursSincePost,
        influence_at_rating: userData.photographer_influence || 1.0,
      })
      .eq("id", existingRating.id)

    if (error) {
      return jsonResponse(
        { error: "Failed to update rating." },
        { status: 500 },
      )
    }
  } else {
    // Create new rating
    const { error } = await (supabase as any)
      .from("photo_ratings")
      .insert({
        user_id: currentUser.id,
        post_id: postId,
        rating,
        rating_label: ratingLabelMap[rating],
        time_to_rate_hours: hoursSincePost,
        influence_at_rating: userData.photographer_influence || 1.0,
      })

    if (error) {
      return jsonResponse(
        { error: "Failed to create rating." },
        { status: 500 },
      )
    }
  }

  return jsonResponse({ success: true, rating })
}

export function OPTIONS() {
  return corsPreflight()
}

