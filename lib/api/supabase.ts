import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"
import type { Database } from "@/lib/types/database"

export function createSupabaseApiClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are not configured.")
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function getUserFromRequest(
  supabase: SupabaseClient<Database>,
  request: NextRequest,
): Promise<User | null> {
  const authHeader = request.headers.get("authorization")

  if (!authHeader?.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.replace("Bearer ", "").trim()

  if (!token) {
    return null
  }

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return null
  }

  return data.user
}
