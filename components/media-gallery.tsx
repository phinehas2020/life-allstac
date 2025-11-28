"use client"

import { useState, useEffect, useMemo } from "react"
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
  const [columnCount, setColumnCount] = useState(1)

  useEffect(() => {
    setMounted(true)

    const updateColumnCount = () => {
      const width = window.innerWidth
      if (width >= 1280) setColumnCount(4)
      else if (width >= 1024) setColumnCount(3)
      else if (width >= 640) setColumnCount(2)
      else setColumnCount(1)
    }

    updateColumnCount()
    window.addEventListener("resize", updateColumnCount)
    return () => window.removeEventListener("resize", updateColumnCount)
  }, [])

  // Distribute posts into columns for masonry layout
  const columns = useMemo(() => {
    const cols: PostWithUser[][] = Array.from({ length: columnCount }, () => [])
    posts.forEach((post, i) => {
      cols[i % columnCount].push(post)
    })
    return cols
  }, [posts, columnCount])

  useEffect(() => {
    if (!onLoadMore || !hasMore || loading) return

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight
      const scrollTop = document.documentElement.scrollTop
      const clientHeight = document.documentElement.clientHeight

      if (scrollTop + clientHeight >= scrollHeight - 300) {
        onLoadMore()
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [onLoadMore, hasMore, loading])

  if (!mounted) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
      </div>
    )
  }

  if (posts.length === 0 && !loading) {
    return (
      <div className="text-center py-20 bg-secondary/30 rounded-3xl border-2 border-dashed border-border/50">
        <p className="text-muted-foreground text-lg">No moments shared yet.</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex gap-4 md:gap-6 justify-center">
        {columns.map((colPosts, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-6 flex-1 min-w-0">
            {colPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                onLikeUpdate={() => {
                  // Optional: Refetch posts or update state
                }}
              />
            ))}
          </div>
        ))}
      </div>
      
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
        </div>
      )}
      
      {!loading && hasMore && onLoadMore && (
        <div className="flex justify-center py-12">
          <button
            onClick={onLoadMore}
            className="px-6 py-2.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            Load more moments
          </button>
        </div>
      )}
    </>
  )
}
