import type { NextRequest } from "next/server"
import { corsPreflight, jsonResponse } from "@/lib/api/response"
import { createSupabaseApiClient, getUserFromRequest } from "@/lib/api/supabase"
import {
  mapPostToMobile,
  POST_SELECTION,
  type RawPost,
} from "@/lib/api/posts"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseApiClient()
  const currentUser = await getUserFromRequest(supabase, request)
  const postId = params.id

  const { data, error } = await (supabase as any)
    .from("posts")
    .select(POST_SELECTION)
    .eq("id", postId)
    .maybeSingle<RawPost>()

  if (error) {
    return jsonResponse(
      { error: "Failed to load post." },
      { status: 500 },
    )
  }

  if (!data) {
    return jsonResponse(
      { error: "Post not found." },
      { status: 404 },
    )
  }

  const payload = mapPostToMobile(data, currentUser?.id)

  return jsonResponse({ post: payload })
}

export function OPTIONS() {
  return corsPreflight()
}
