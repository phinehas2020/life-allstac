import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"
import type { MobileMetricsResponse } from "@/lib/types/api"
import type { Database } from "@/lib/types/database"

interface MetricsOptions {
  windowDays?: number
}

export async function fetchPlatformMetrics(
  supabase: SupabaseClient<Database>,
  options: MetricsOptions = {},
): Promise<MobileMetricsResponse> {
  const windowDays = options.windowDays ?? 7
  const sinceIso = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString()

  const countQuery = (
    table: keyof Database["public"]["Tables"] | string,
    applyFilter?: (builder: any) => any,
  ) => {
    let query = supabase.from(table as string).select("id", { count: "exact", head: true })
    if (applyFilter) {
      query = applyFilter(query)
    }
    return query
  }

  const responses = await Promise.all([
    countQuery("users"),
    countQuery("posts"),
    countQuery("events"),
    countQuery("likes"),
    countQuery("comments"),
    countQuery("downloads"),
    countQuery("users", (query) => query.gte("created_at", sinceIso)),
    countQuery("posts", (query) => query.gte("created_at", sinceIso)),
    countQuery("likes", (query) => query.gte("created_at", sinceIso)),
    countQuery("comments", (query) => query.gte("created_at", sinceIso)),
    countQuery("downloads", (query) => query.gte("created_at", sinceIso)),
  ]) as Array<{ count: number | null; error: PostgrestError | null }>

  const [
    usersTotalRes,
    postsTotalRes,
    eventsTotalRes,
    likesTotalRes,
    commentsTotalRes,
    downloadsTotalRes,
    newUsersWindowRes,
    postsWindowRes,
    likesWindowRes,
    commentsWindowRes,
    downloadsWindowRes,
  ] = responses

  const errored = responses.find((response) => response && response.error)

  if (errored?.error) {
    throw errored.error
  }

  const likesTotal = likesTotalRes.count ?? 0
  const commentsTotal = commentsTotalRes.count ?? 0
  const downloadsTotal = downloadsTotalRes.count ?? 0
  const interactionsTotal = likesTotal + commentsTotal + downloadsTotal

  const likesWindow = likesWindowRes.count ?? 0
  const commentsWindow = commentsWindowRes.count ?? 0
  const downloadsWindow = downloadsWindowRes.count ?? 0
  const interactionsWindow = likesWindow + commentsWindow + downloadsWindow

  return {
    totals: {
      users: usersTotalRes.count ?? 0,
      posts: postsTotalRes.count ?? 0,
      events: eventsTotalRes.count ?? 0,
      likes: likesTotal,
      comments: commentsTotal,
      downloads: downloadsTotal,
      interactions: interactionsTotal,
    },
    weekly: {
      newUsers: newUsersWindowRes.count ?? 0,
      posts: postsWindowRes.count ?? 0,
      interactions: interactionsWindow,
    },
  }
}
