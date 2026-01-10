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

        const { data: notifications, error } = await supabase
            .from("notifications")
            .select(`
        *,
        actor:users!actor_id(*)
      `)
            .eq("user_id", currentUser.id)
            .order("created_at", { ascending: false })
            .limit(50)

        if (error) {
            console.error("❌ [API] Error fetching notifications:", error)
            return jsonResponse({ error: "Failed to load notifications." }, { status: 500 })
        }

        return jsonResponse({ notifications })
    } catch (err: any) {
        console.error("❌ [API] Critical error in notifications route:", err)
        return jsonResponse(
            { error: "Internal server error." },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    // Mark as read
    try {
        const authHeader = request.headers.get("authorization")
        const token = authHeader?.replace("Bearer ", "").trim()
        const supabase = createSupabaseApiClient(token)
        const currentUser = await getUserFromRequest(supabase, request)

        if (!currentUser) {
            return jsonResponse({ error: "Authentication required." }, { status: 401 })
        }

        const body = await request.json()
        const { ids } = body

        if (!ids || !Array.isArray(ids)) {
            return jsonResponse({ error: "Notification IDs are required." }, { status: 400 })
        }

        const { error } = await (supabase as any)
            .from("notifications")
            .update({ is_read: true })
            .in("id", ids)
            .eq("user_id", currentUser.id)

        if (error) {
            console.error("❌ [API] Error updating notifications:", error)
            return jsonResponse({ error: "Failed to update notifications." }, { status: 500 })
        }

        return jsonResponse({ success: true })
    } catch (err: any) {
        return jsonResponse({ error: "Internal server error." }, { status: 500 })
    }
}

export function OPTIONS() {
    return corsPreflight()
}
