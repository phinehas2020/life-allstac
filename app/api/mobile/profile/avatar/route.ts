import type { NextRequest } from "next/server"
import { corsPreflight, jsonResponse } from "@/lib/api/response"
import { createSupabaseApiClient, getUserFromRequest } from "@/lib/api/supabase"

export async function POST(request: NextRequest) {
  try {
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

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return jsonResponse({ error: "File is required." }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return jsonResponse({ error: "File must be an image." }, { status: 400 })
    }

    // Upload to Supabase Storage (using posts bucket with avatars/ prefix)
    const fileExt = file.name.split(".").pop() || "jpg"
    const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    // Delete old avatar if exists (optional cleanup)
    const { data: existingUser } = await (supabase as any)
      .from("users")
      .select("avatar_url")
      .eq("id", currentUser.id)
      .single()

    if (existingUser?.avatar_url) {
      // Extract old file path from URL and try to delete
      try {
        const oldUrl = new URL(existingUser.avatar_url)
        const oldPath = oldUrl.pathname.split("/storage/v1/object/public/posts/")[1]
        if (oldPath && oldPath.startsWith("avatars/")) {
          await supabase.storage.from("posts").remove([oldPath])
        }
      } catch {
        // Ignore cleanup errors
      }
    }

    // Upload new avatar
    const { error: uploadError } = await supabase.storage
      .from("posts")
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      console.error("[Avatar API] Storage error:", uploadError)
      return jsonResponse({
        error: "Failed to upload avatar.",
        details: uploadError.message
      }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage.from("posts").getPublicUrl(filePath)

    // Update user's avatar_url in database
    const { error: updateError } = await (supabase as any)
      .from("users")
      .update({ avatar_url: publicUrl })
      .eq("id", currentUser.id)

    if (updateError) {
      console.error("[Avatar API] Database error:", updateError)
      return jsonResponse({
        error: "Failed to update profile.",
        details: updateError.message
      }, { status: 500 })
    }

    return jsonResponse({
      success: true,
      avatarUrl: publicUrl
    })
  } catch (err: any) {
    console.error("[Avatar API] Critical error:", err)
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
