"use client"

import { useState, useEffect } from "react"
import { PostCard } from "@/components/post-card"
import { Loader2 } from "lucide-react"
import type { PostWithUser } from "@/lib/types/database"

interface MediaGalleryProps {
  posts: PostWithUser[]
  currentUserId?: string
  loading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
}

export function MediaGallery({
  posts,
  currentUserId,
  loading = false,
  onLoadMore,
  hasMore = false,
}: MediaGalleryProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!onLoadMore || !hasMore || loading) return

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight
      const scrollTop = document.documentElement.scrollTop
      const clientHeight = document.documentElement.clientHeight

      if (scrollTop + clientHeight >= scrollHeight - 100) {
        onLoadMore()
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [onLoadMore, hasMore, loading])

  if (!mounted) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (posts.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No posts to display</p>
      </div>
    )
  }

  return (
    <>
      <div className="masonry">
        {posts.map((post) => (
          <div key={post.id} className="masonry-item">
            <PostCard
              post={post}
              currentUserId={currentUserId}
              onLikeUpdate={() => {
                // Optional: Refetch posts or update state
              }}
            />
          </div>
        ))}
      </div>
      
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      
      {!loading && hasMore && onLoadMore && (
        <div className="flex justify-center py-8">
          <button
            onClick={onLoadMore}
            className="text-primary hover:underline"
          >
            Load more
          </button>
        </div>
      )}
    </>
  )
}