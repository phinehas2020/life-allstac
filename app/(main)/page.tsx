"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MediaGallery } from "@/components/media-gallery"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { PostWithUser } from "@/lib/types/database"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { Sparkles, Users } from "lucide-react"

export default function HomePage() {
  const [posts, setPosts] = useState<PostWithUser[]>([])
  const [followingPosts, setFollowingPosts] = useState<PostWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null)
  const [activeTab, setActiveTab] = useState("everything")
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    getCurrentUser()
  }, [])

  useEffect(() => {
    if (activeTab === "everything") {
      fetchPosts()
    } else if (activeTab === "following" && currentUser) {
      fetchFollowingPosts()
    }
  }, [activeTab, currentUser])

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  const fetchPosts = async (loadMore = false) => {
    try {
      setLoading(true)
      const currentPage = loadMore ? page + 1 : 0
      
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          user:users!posts_user_id_fkey(id, username, avatar_url, photographer_status, photographer_influence),
          likes(user_id),
          comments(id),
          post_events(
            event:events(id, name, slug)
          )
        `)
        .order("quality_score", { ascending: false })
        .order("created_at", { ascending: false })
        .range(currentPage * 20, (currentPage + 1) * 20 - 1)

      if (error) {
        console.error("Error fetching posts:", error)
        return
      }

      if (data) {
        const formattedPosts: PostWithUser[] = data.map((post: any) => ({
          ...post,
          user: post.user,
          likes: post.likes || [],
          comments: post.comments || [],
          events: post.post_events?.map((pe: any) => pe.event) || [],
          _count: {
            likes: post.likes?.length || 0,
            comments: post.comments?.length || 0,
            downloads: 0,
          },
        }))

        if (loadMore) {
          setPosts((prev) => [...prev, ...formattedPosts])
          setPage(currentPage)
        } else {
          setPosts(formattedPosts)
          setPage(0)
        }

        setHasMore(data.length === 20)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchFollowingPosts = async (loadMore = false) => {
    if (!currentUser) return

    try {
      setLoading(true)
      const currentPage = loadMore ? page + 1 : 0

      // Get users the current user follows
      const { data: following } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUser.id)

      if (!following || following.length === 0) {
        setFollowingPosts([])
        setHasMore(false)
        return
      }

      const followingIds = following.map((f: any) => f.following_id)

      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          user:users!posts_user_id_fkey(id, username, avatar_url, photographer_status, photographer_influence),
          likes(user_id),
          comments(id),
          post_events(
            event:events(id, name, slug)
          )
        `)
        .in("user_id", followingIds)
        .order("quality_score", { ascending: false })
        .order("created_at", { ascending: false })
        .range(currentPage * 20, (currentPage + 1) * 20 - 1)

      if (error) {
        console.error("Error fetching following posts:", error)
        return
      }

      if (data) {
        const formattedPosts: PostWithUser[] = data.map((post: any) => ({
          ...post,
          user: post.user,
          likes: post.likes || [],
          comments: post.comments || [],
          events: post.post_events?.map((pe: any) => pe.event) || [],
          _count: {
            likes: post.likes?.length || 0,
            comments: post.comments?.length || 0,
            downloads: 0,
          },
        }))

        if (loadMore) {
          setFollowingPosts((prev) => [...prev, ...formattedPosts])
          setPage(currentPage)
        } else {
          setFollowingPosts(formattedPosts)
          setPage(0)
        }

        setHasMore(data.length === 20)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = () => {
    if (activeTab === "everything") {
      fetchPosts(true)
    } else if (activeTab === "following") {
      fetchFollowingPosts(true)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

        {/* Hero / Welcome Section */}
        <div className="mb-12 text-center max-w-2xl mx-auto space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-primary font-heading">
            Life.Allstac
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground text-balance leading-relaxed">
            A community-driven gallery of moments, memories, and visual stories.
            Share yours today.
          </p>
        </div>

        {currentUser ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <div className="flex justify-center mb-8">
              <TabsList className="bg-secondary/50 p-1 rounded-full border border-border/50 h-auto">
                <TabsTrigger
                  value="everything"
                  className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-300 font-medium flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Discover
                </TabsTrigger>
                <TabsTrigger
                  value="following"
                  className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-300 font-medium flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Following
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="everything" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <MediaGallery
                posts={posts}
                currentUserId={currentUser?.id}
                loading={loading}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
              />
            </TabsContent>

            <TabsContent value="following" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <MediaGallery
                posts={followingPosts}
                currentUserId={currentUser?.id}
                loading={loading}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
             <MediaGallery
              posts={posts}
              loading={loading}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
            />
          </div>
        )}
      </div>
    </div>
  )
}
