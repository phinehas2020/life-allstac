"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MediaGallery } from "@/components/media-gallery"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { PostWithUser } from "@/lib/types/database"
import type { User as SupabaseUser } from "@supabase/supabase-js"

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
          user:users!posts_user_id_fkey(id, username, avatar_url),
          likes(user_id),
          comments(id),
          post_events!inner(
            event:events(id, name, slug)
          )
        `)
        .order("created_at", { ascending: false })
        .range(currentPage * 20, (currentPage + 1) * 20 - 1)

      if (error) {
        console.error("Error fetching posts:", error)
        return
      }

      if (data) {
        const formattedPosts: PostWithUser[] = data.map((post) => ({
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

      const followingIds = following.map((f) => f.following_id)

      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          user:users!posts_user_id_fkey(id, username, avatar_url),
          likes(user_id),
          comments(id),
          post_events!inner(
            event:events(id, name, slug)
          )
        `)
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .range(currentPage * 20, (currentPage + 1) * 20 - 1)

      if (error) {
        console.error("Error fetching following posts:", error)
        return
      }

      if (data) {
        const formattedPosts: PostWithUser[] = data.map((post) => ({
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to Life.Allstac</h1>
        <p className="text-gray-600">
          Share and discover moments from our community
        </p>
      </div>

      {currentUser ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="everything">Everything</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>
          
          <TabsContent value="everything" className="mt-6">
            <MediaGallery
              posts={posts}
              currentUserId={currentUser?.id}
              loading={loading}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
            />
          </TabsContent>
          
          <TabsContent value="following" className="mt-6">
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
        <MediaGallery
          posts={posts}
          loading={loading}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
        />
      )}
    </div>
  )
}