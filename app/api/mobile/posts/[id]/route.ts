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
    .maybeSingle()

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

  // Fetch comments separately with full user data
  const { data: commentsData } = await (supabase as any)
    .from("comments")
    .select(`
      id,
      content,
      created_at,
      user:users!comments_user_id_fkey(id, username, avatar_url)
    `)
    .eq("post_id", postId)
    .order("created_at", { ascending: true })

  const payload = mapPostToMobile(data, currentUser?.id)
  
  // Add comments to payload
  if (commentsData) {
    payload.comments = commentsData.map((comment: any) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.created_at,
      user: comment.user
        ? {
            id: comment.user.id,
            username: comment.user.username,
            avatarUrl: comment.user.avatar_url,
          }
        : null,
    }))
  }

  return jsonResponse({ post: payload })
}

export function OPTIONS() {
  return corsPreflight()
}
