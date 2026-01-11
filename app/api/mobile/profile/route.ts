import type { NextRequest } from "next/server"
import { corsPreflight, jsonResponse } from "@/lib/api/response"
import { createSupabaseApiClient, getUserFromRequest } from "@/lib/api/supabase"

export async function PATCH(request: NextRequest) {
  // Extract token to create authenticated Supabase client
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "").trim()

  const supabase = createSupabaseApiClient(token)
  const currentUser = await getUserFromRequest(supabase, request)

  if (!currentUser) {
    return jsonResponse(
      { error: "Authentication required." },
      { status: 401 },
    )
  }

  const body = await request.json()
  const { username, bio, avatarUrl } = body

  // Build update object with only provided fields
  const updates: any = {}
  if (username !== undefined && typeof username === "string") {
    // Check if username is already taken by another user
    const { data: existingUser } = await (supabase as any)
      .from("users")
      .select("id")
      .eq("username", username.trim())
      .neq("id", currentUser.id)
      .maybeSingle()

    if (existingUser) {
      return jsonResponse(
        { error: "Username is already taken." },
        { status: 409 },
      )
    }
    updates.username = username.trim()
  }
  if (bio !== undefined) {
    updates.bio = bio === null ? null : bio.trim()
  }
  if (avatarUrl !== undefined) {
    updates.avatar_url = avatarUrl
  }

  if (Object.keys(updates).length === 0) {
    return jsonResponse(
      { error: "No fields to update." },
      { status: 400 },
    )
  }

  const { data: updatedUser, error } = await (supabase as any)
    .from("users")
    .update(updates)
    .eq("id", currentUser.id)
    .select()
    .single()

  if (error) {
    console.error("[Profile API] Update error:", error)
    return jsonResponse(
      { error: "Failed to update profile.", details: error.message },
      { status: 500 },
    )
  }

  return jsonResponse({
    id: updatedUser.id,
    username: updatedUser.username,
    avatarUrl: updatedUser.avatar_url,
    bio: updatedUser.bio,
  })
}

export function OPTIONS() {
  return corsPreflight()
}
