"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { PostCard } from "@/components/post-card"
import { PostCardSkeleton } from "@/components/post-card-skeleton"
import { Button } from "@/components/ui/button"
import { Loader2, ImageIcon, Upload } from "lucide-react"
import { useWindowSize } from "@/lib/hooks/use-window-size"
import { staggerContainer, fadeUp } from "@/lib/animations/variants"
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

  if (!mounted || (loading && posts.length === 0)) {
    // Show skeleton loading grid
    return (
      <div className="flex gap-6 items-start w-full">
        {Array.from({ length: columnCount }).map((_, colIndex) => (
          <div key={colIndex} className="flex-1 min-w-0 flex flex-col gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (posts.length === 0 && !loading) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center py-20 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center shadow-inner"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <ImageIcon className="w-10 h-10 text-gray-300" />
        </motion.div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">No posts yet</h3>
        <p className="text-gray-500 max-w-sm mb-6">
          Be the first to share something amazing with the community!
        </p>
        <Link href="/upload">
          <Button variant="gradient" className="px-8">
            <Upload className="w-4 h-4 mr-2" />
            Upload First Post
          </Button>
        </Link>
      </motion.div>
    )
  }

  return (
    <>
      <motion.div
        className="flex gap-6 items-start w-full"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {columns.map((colPosts, colIndex) => (
          <div key={colIndex} className="flex-1 min-w-0 flex flex-col gap-6">
            {colPosts.map((post, postIndex) => (
              <motion.div
                key={post.id}
                className="w-full"
                variants={fadeUp}
                custom={postIndex}
              >
                <PostCard
                  post={post}
                  currentUserId={currentUserId}
                  onLikeUpdate={() => {
                    // Optional: Refetch posts or update state
                  }}
                />
              </motion.div>
            ))}
          </div>
        ))}
      </motion.div>

      {loading && (
        <motion.div
          className="flex justify-center py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </motion.div>
      )}

      {!loading && hasMore && onLoadMore && (
        <motion.div
          className="flex justify-center py-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={onLoadMore}
            variant="outline"
            className="px-8"
          >
            Load more
          </Button>
        </motion.div>
      )}
    </>
  )
}
