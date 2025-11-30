"use client"

import { useState, useEffect, useMemo } from "react"
import { PostCard } from "@/components/post-card"
import { Loader2 } from "lucide-react"
import { useWindowSize } from "@/lib/hooks/use-window-size"
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
  const { width } = useWindowSize()

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

  // Determine column count based on width (matching CSS media queries)
  const columnCount = useMemo(() => {
    if (!width) return 1 // Server-side default
    if (width >= 1280) return 5 // xl
    if (width >= 1024) return 4 // lg
    if (width >= 768) return 3 // md
    if (width >= 640) return 2 // sm
    return 1
  }, [width])

  // Distribute posts into columns
  const columns = useMemo(() => {
    if (!posts || posts.length === 0) return []

    // Create array of empty arrays for each column
    const cols: PostWithUser[][] = Array.from({ length: columnCount }, () => [])

    // Distribute posts to columns
    // Simple round-robin usually works fine for similar height items,
    // but for true masonry (varying heights), we should add to the shortest column.
    // However, we don't know the rendered height here easily without measurement.
    // Standard approach for simple implementation is round-robin which matches
    // visual order (left-to-right) better than CSS columns (top-to-bottom).

    posts.forEach((post, index) => {
      const columnIndex = index % columnCount
      cols[columnIndex].push(post)
    })

    return cols
  }, [posts, columnCount])

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
      <div className="flex gap-6 items-start">
        {columns.map((colPosts, colIndex) => (
          <div key={colIndex} className="flex-1 flex flex-col gap-6">
            {colPosts.map((post) => (
              <div key={post.id} className="w-full">
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
