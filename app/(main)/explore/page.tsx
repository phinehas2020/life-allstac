"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MediaGallery } from "@/components/media-gallery"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import type { PostWithUser } from "@/lib/types/database"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export default function ExplorePage() {
  const [posts, setPosts] = useState<PostWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    getCurrentUser()
    fetchPosts()
  }, [])

  useEffect(() => {
    // Reset and search when query changes
    if (searchQuery) {
      setPage(0)
      searchPosts()
    } else {
      fetchPosts()
    }
  }, [searchQuery])

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
          post_events(
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

  const searchPosts = async (loadMore = false) => {
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
          post_events(
            event:events(id, name, slug)
          )
        `)
        .or(`caption.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`)
        .order("created_at", { ascending: false })
        .range(currentPage * 20, (currentPage + 1) * 20 - 1)

      if (error) {
        console.error("Error searching posts:", error)
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

  const handleLoadMore = () => {
    if (searchQuery) {
      searchPosts(true)
    } else {
      fetchPosts(true)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Explore</h1>
        <p className="text-gray-600 mb-6">
          Discover amazing photos and videos from our community
        </p>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search by caption or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <MediaGallery
        posts={posts}
        currentUserId={currentUser?.id}
        loading={loading}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
      />
    </div>
  )
}