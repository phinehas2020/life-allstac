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

  const body = await request.json()
  const { content } = body

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return jsonResponse(
      { error: "Comment content is required." },
      { status: 400 },
    )
  }

  const { data: comment, error } = await (supabase as any)
    .from("comments")
    .insert({
      post_id: postId,
      user_id: currentUser.id,
      content: content.trim(),
    })
    .select(`
      id,
      content,
      created_at,
      user:users!comments_user_id_fkey(id, username, avatar_url)
    `)
    .single()

  if (error) {
    return jsonResponse(
      { error: "Failed to create comment." },
      { status: 500 },
    )
  }

  return jsonResponse({
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
  })
}

export function OPTIONS() {
  return corsPreflight()
}

