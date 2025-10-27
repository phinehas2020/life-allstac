"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MediaGallery } from "@/components/media-gallery"
import { Calendar, Users, Upload, ArrowLeft, Bell, BellOff } from "lucide-react"
import { format } from "date-fns"
import { useToast } from "@/lib/hooks/use-toast"
import type { Event, PostWithUser } from "@/lib/types/database"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [posts, setPosts] = useState<PostWithUser[]>([])
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const { toast } = useToast()
  const supabase = createClient()
  const slug = params.slug as string

  useEffect(() => {
    getCurrentUser()
    fetchEvent()
  }, [slug])

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  const fetchEvent = async () => {
    try {
      setLoading(true)

      // Fetch event
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug)
        .single()

      if (eventError || !eventData) {
        console.error("Error fetching event:", eventError)
        return
      }

      setEvent(eventData)

      // Fetch posts in this event
      const { data: postsData } = await supabase
        .from("posts")
        .select(`
          *,
          user:users!posts_user_id_fkey(id, username, avatar_url),
          likes(user_id),
          comments(id),
          post_events!inner(event_id)
        `)
        .eq("post_events.event_id", eventData.id)
        .order("created_at", { ascending: false })

      if (postsData) {
        const formattedPosts: PostWithUser[] = postsData.map((post: any) => ({
          ...post,
          user: post.user,
          likes: post.likes || [],
          comments: post.comments || [],
          events: [eventData],
          _count: {
            likes: post.likes?.length || 0,
            comments: post.comments?.length || 0,
            downloads: 0,
          },
        }))
        setPosts(formattedPosts)
      }

      // Check if user is following this event
      if (currentUser) {
        const { data: followData } = await supabase
          .from("event_follows")
          .select("*")
          .eq("user_id", currentUser.id)
          .eq("event_id", eventData.id)
          .single()

        setIsFollowing(!!followData)
      }

      // Get follower count
      const { count } = await supabase
        .from("event_follows")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventData.id)

      setFollowerCount(count || 0)
    } finally {
      setLoading(false)
    }
  }

  const handleFollowEvent = async () => {
    if (!currentUser || !event) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to follow events",
      })
      return
    }

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("event_follows")
          .delete()
          .eq("user_id", currentUser.id)
          .eq("event_id", event.id)

        if (!error) {
          setIsFollowing(false)
          setFollowerCount((prev) => Math.max(0, prev - 1))
          toast({
            title: "Unfollowed",
            description: `You unfollowed ${event.name}`,
          })
        }
      } else {
        const { error } = await supabase
          .from("event_follows")
          .insert({
            user_id: currentUser.id,
            event_id: event.id,
          } as any)

        if (!error) {
          setIsFollowing(true)
          setFollowerCount((prev) => prev + 1)
          toast({
            title: "Following",
            description: `You're now following ${event.name}`,
          })
        }
      }
    } catch (error) {
      console.error("Error updating follow:", error)
    }
  }

  const handleUploadToEvent = () => {
    // Navigate to upload page with event pre-selected
    router.push(`/upload?event=${event?.id}`)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-48 bg-gray-200 rounded-lg mb-8"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Event not found</h1>
        <Link href="/events">
          <Button>Back to Events</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => router.push("/events")}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Events
      </Button>

      {/* Event Header */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <CardTitle className="text-3xl">{event.name}</CardTitle>
                {event.is_featured && (
                  <span className="text-xs bg-primary text-white px-2 py-1 rounded">
                    Featured
                  </span>
                )}
              </div>
              {event.description && (
                <CardDescription className="text-base mb-4">
                  {event.description}
                </CardDescription>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                {event.start_date && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(new Date(event.start_date), "PPP")}
                      {event.end_date && ` - ${format(new Date(event.end_date), "PPP")}`}
                    </span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>{followerCount} followers</span>
                </div>
                <div className="text-gray-600">
                  <span className="font-medium">{posts.length}</span> photos
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4 md:mt-0">
              <Button onClick={handleUploadToEvent}>
                <Upload className="w-4 h-4 mr-2" />
                Upload to Event
              </Button>
              {currentUser && (
                <Button
                  variant="outline"
                  onClick={handleFollowEvent}
                >
                  {isFollowing ? (
                    <>
                      <BellOff className="w-4 h-4 mr-2" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      Follow
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Event Photos */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Event Photos</h2>
      </div>

      {posts.length > 0 ? (
        <MediaGallery posts={posts} currentUserId={currentUser?.id} />
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No photos in this event yet</p>
          <Button onClick={handleUploadToEvent}>
            <Upload className="w-4 h-4 mr-2" />
            Be the first to upload
          </Button>
        </div>
      )}
    </div>
  )
}