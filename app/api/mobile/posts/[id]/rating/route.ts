import type { NextRequest } from "next/server"
import { corsPreflight, jsonResponse } from "@/lib/api/response"
import { createSupabaseApiClient, getUserFromRequest } from "@/lib/api/supabase"

export async function GET(
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

  const { data: rating } = await (supabase as any)
    .from("photo_ratings")
    .select("rating")
    .eq("user_id", currentUser.id)
    .eq("post_id", postId)
    .maybeSingle()

  if (!rating) {
    return jsonResponse({ rating: null })
  }

  return jsonResponse({ rating: rating.rating })
}

export function OPTIONS() {
  return corsPreflight()
}

