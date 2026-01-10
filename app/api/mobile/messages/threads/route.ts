import type { NextRequest } from "next/server"
import { jsonResponse, corsPreflight } from "@/lib/api/response"
import { createSupabaseApiClient, getUserFromRequest } from "@/lib/api/supabase"

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization")
        const token = authHeader?.replace("Bearer ", "").trim()
        const supabase = createSupabaseApiClient(token)
        const currentUser = await getUserFromRequest(supabase, request)

        if (!currentUser) {
            return jsonResponse({ error: "Authentication required." }, { status: 401 })
        }

        const { data: threads, error } = await supabase
            .from("dm_threads")
            .select(`
        *,
        user_a_profile:users!user_a(id, username, avatar_url),
        user_b_profile:users!user_b(id, username, avatar_url)
      `)
            .or(`user_a.eq.${currentUser.id},user_b.eq.${currentUser.id}`)
            .order("created_at", { ascending: false })

        if (error) {
            console.error("❌ [API] Error fetching DM threads:", error)
            return jsonResponse({ error: "Failed to load messages." }, { status: 500 })
        }

        return jsonResponse({ threads })
    } catch (err: any) {
        console.error("❌ [API] Critical error in threads route:", err)
        return jsonResponse({ error: "Internal server error." }, { status: 500 })
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

        const { targetUserId } = await request.json()
        if (!targetUserId) {
            return jsonResponse({ error: "Target user ID is required." }, { status: 400 })
        }

        if (targetUserId === currentUser.id) {
            return jsonResponse({ error: "Cannot message yourself." }, { status: 400 })
        }

        const [userA, userB] = [currentUser.id, targetUserId].sort()

        // Try to find existing thread
        const { data: existing } = await (supabase as any)
            .from("dm_threads")
            .select("id")
            .eq("user_a", userA)
            .eq("user_b", userB)
            .maybeSingle()

        if (existing) {
            return jsonResponse({ threadId: existing.id })
        }

        // Create new thread
        const { data: created, error } = await (supabase as any)
            .from("dm_threads")
            .insert({ user_a: userA, user_b: userB })
            .select("id")
            .single()

        if (error) {
            console.error("❌ [API] Error creating DM thread:", error)
            return jsonResponse({ error: "Failed to start conversation." }, { status: 500 })
        }

        return jsonResponse({ threadId: created.id }, { status: 201 })
    } catch (err: any) {
        console.error("❌ [API] Critical error in threads POST route:", err)
        return jsonResponse({ error: "Internal server error." }, { status: 500 })
    }
}

export function OPTIONS() {
    return corsPreflight()
}
