import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Database } from '@/lib/types/database'

export async function POST(request: Request) {
  const cookieStore = await cookies()

  // Initialize Supabase client
  // Note: For API routes we use createServerClient slightly differently than Server Components
  // We need to pass the cookie store.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
             try {
                cookieStore.set({ name, value, ...options })
             } catch (e) {}
        },
        remove(name: string, options: any) {
             try {
                cookieStore.set({ name, value: '', ...options })
             } catch (e) {}
        },
      },
    }
  )

  const { sessionId, password } = await request.json()

  if (!sessionId || !password) {
    return NextResponse.json({ error: 'Missing session ID or password' }, { status: 400 })
  }

  // Call the secure RPC function
  // We cast as any to bypass Typescript issues with RPC definitions not being perfectly synced
  const { data: sessionDetails, error: detailsError } = await (supabase as any)
    .rpc('get_session_details', {
      p_session_id: sessionId,
      p_password: password
    })
    .single()

  if (detailsError || !sessionDetails) {
    return NextResponse.json({ error: 'Invalid password or session not found' }, { status: 401 })
  }

  // If we want to return photos immediately
  const { data: photos, error: photosError } = await (supabase as any)
    .rpc('get_session_photos', {
      p_session_id: sessionId,
      p_password: password
    })

  if (photosError) {
    return NextResponse.json({ error: 'Error fetching photos' }, { status: 500 })
  }

  return NextResponse.json({
    session: sessionDetails,
    photos: photos
  })
}
