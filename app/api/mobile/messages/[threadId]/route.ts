import type { NextRequest } from "next/server"
import { jsonResponse, corsPreflight } from "@/lib/api/response"
import { createSupabaseApiClient, getUserFromRequest } from "@/lib/api/supabase"

export async function GET(
    request: NextRequest,
    { params }: { params: { threadId: string } }
) {
    try {
        const { threadId } = params
        const authHeader = request.headers.get("authorization")
        const token = authHeader?.replace("Bearer ", "").trim()
        const supabase = createSupabaseApiClient(token)
        const currentUser = await getUserFromRequest(supabase, request)

        if (!currentUser) {
            return jsonResponse({ error: "Authentication required." }, { status: 401 })
        }

        // Verify user is part of the thread
        const { data: thread, error: threadError } = await (supabase as any)
            .from("dm_threads")
            .select("id")
            .eq("id", threadId)
            .or(`user_a.eq.${currentUser.id},user_b.eq.${currentUser.id}`)
            .single()

        if (threadError || !thread) {
            return jsonResponse({ error: "Thread not found or access denied." }, { status: 404 })
        }

        const { data: messages, error } = await (supabase as any)
            .from("dm_messages")
            .select("*")
            .eq("thread_id", threadId)
            .order("created_at", { ascending: true })

        if (error) {
            console.error("❌ [API] Error fetching DM messages:", error)
            return jsonResponse({ error: "Failed to load messages." }, { status: 500 })
        }

        return jsonResponse({ messages })
    } catch (err: any) {
        console.error("❌ [API] Critical error in messages route:", err)
        return jsonResponse({ error: "Internal server error." }, { status: 500 })
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { threadId: string } }
) {
    try {
        const { threadId } = params
        const authHeader = request.headers.get("authorization")
        const token = authHeader?.replace("Bearer ", "").trim()
        const supabase = createSupabaseApiClient(token)
        const currentUser = await getUserFromRequest(supabase, request)

        if (!currentUser) {
            return jsonResponse({ error: "Authentication required." }, { status: 401 })
        }

        // Verify user is part of the thread
        const { data: thread, error: threadError } = await (supabase as any)
            .from("dm_threads")
            .select("id")
            .eq("id", threadId)
            .or(`user_a.eq.${currentUser.id},user_b.eq.${currentUser.id}`)
            .single()

        if (threadError || !thread) {
            return jsonResponse({ error: "Thread not found or access denied." }, { status: 404 })
        }

        const { body } = await request.json()
        if (!body?.trim()) {
            return jsonResponse({ error: "Message body is required." }, { status: 400 })
        }

        const { data: message, error } = await (supabase as any)
            .from("dm_messages")
            .insert({
                thread_id: threadId,
                sender_id: currentUser.id,
                body: body.trim()
            })
            .select("*")
            .single()

        if (error) {
            console.error("❌ [API] Error sending DM message:", error)
            return jsonResponse({ error: "Failed to send message." }, { status: 500 })
        }

        return jsonResponse({ message }, { status: 201 })
    } catch (err: any) {
        console.error("❌ [API] Critical error in messages POST route:", err)
        return jsonResponse({ error: "Internal server error." }, { status: 500 })
    }
}

export function OPTIONS() {
    return corsPreflight()
}
