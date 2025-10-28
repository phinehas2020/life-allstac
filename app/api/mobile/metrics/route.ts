import { corsPreflight, jsonResponse } from "@/lib/api/response"
import { createSupabaseApiClient } from "@/lib/api/supabase"
import { fetchPlatformMetrics } from "@/lib/supabase/analytics"

export async function GET() {
  const supabase = createSupabaseApiClient()

  try {
    const payload = await fetchPlatformMetrics(supabase)
    return jsonResponse(payload)
  } catch (error) {
    console.error("Failed to fetch platform metrics", error)
    return jsonResponse(
      { error: "Failed to load platform metrics." },
      { status: 500 },
    )
  }
}

export function OPTIONS() {
  return corsPreflight()
}
