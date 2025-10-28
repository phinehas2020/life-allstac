import type { NextRequest } from "next/server"
import { corsPreflight, jsonResponse } from "@/lib/api/response"
import { createSupabaseApiClient, getUserFromRequest } from "@/lib/api/supabase"
import type { MobileEventsResponse } from "@/lib/types/api"
import type { Event } from "@/lib/types/database"

type RawEvent = Event & {
  post_events: { count: number }[] | null
  event_follows: { count: number }[] | null
}

export async function GET(request: NextRequest) {
  const supabase = createSupabaseApiClient()
  const currentUser = await getUserFromRequest(supabase, request)
  const url = new URL(request.url)
  const featuredFilter = url.searchParams.get("featured")

  let eventsQuery = supabase
    .from("events")
    .select(`
      *,
      post_events(count),
      event_follows(count)
    `)

  if (featuredFilter !== null) {
    const isFeatured = featuredFilter === "true"
    eventsQuery = eventsQuery.eq("is_featured", isFeatured)
  }

  const { data, error } = await eventsQuery
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    return jsonResponse(
      { error: "Failed to load events." },
      { status: 500 },
    )
  }

  let followedEventIds = new Set<string>()

  if (currentUser) {
    const { data: followedRows } = await supabase
      .from("event_follows")
      .select("event_id")
      .eq("user_id", currentUser.id)

    followedEventIds = new Set((followedRows ?? []).map((row) => row.event_id))
  }

  const payload: MobileEventsResponse = {
    events: ((data as RawEvent[]) ?? []).map((event) => ({
      id: event.id,
      name: event.name,
      slug: event.slug,
      coverImage: event.cover_image,
      description: event.description,
      startDate: event.start_date,
      endDate: event.end_date,
      isFeatured: event.is_featured,
      postCount: event.post_events?.[0]?.count ?? 0,
      followerCount: event.event_follows?.[0]?.count ?? 0,
      isFollowing: followedEventIds.has(event.id),
    })),
  }

  return jsonResponse(payload)
}

export function OPTIONS() {
  return corsPreflight()
}
