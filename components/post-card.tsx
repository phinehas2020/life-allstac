"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Heart, MessageCircle, Download, Share2, Play } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/lib/hooks/use-toast"
import type { PostWithUser } from "@/lib/types/database"

interface PostCardProps {
  post: PostWithUser
  currentUserId?: string
  onLikeUpdate?: () => void
}

export function PostCard({ post, currentUserId, onLikeUpdate }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(
    post.likes?.some((like) => like.user_id === currentUserId) || false
  )
  const [likeCount, setLikeCount] = useState(post._count?.likes || 0)
  const [downloading, setDownloading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const handleLike = async () => {
    if (!currentUserId) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to like posts",
      })
      return
    }

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("user_id", currentUserId)
          .eq("post_id", post.id)

        if (!error) {
          setIsLiked(false)
          setLikeCount((prev) => Math.max(0, prev - 1))
        }
      } else {
        // Like
        const { error } = await supabase
          .from("likes")
          .insert({ user_id: currentUserId, post_id: post.id })

        if (!error) {
          setIsLiked(true)
          setLikeCount((prev) => prev + 1)
        }
      }

      if (onLikeUpdate) {
        onLikeUpdate()
      }
    } catch (error) {
      console.error("Error updating like:", error)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      // Record download
      await supabase
        .from("downloads")
        .insert({ post_id: post.id, user_id: currentUserId })

      // Download file
      const response = await fetch(post.media_url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `allstac-${post.id}.${post.type === "video" ? "mp4" : "jpg"}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Downloaded",
        description: "File downloaded successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      })
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Check out this post on Life.Allstac",
          text: post.caption || "Amazing content from our community",
          url,
        })
      } catch (error) {
        // User cancelled or error
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(url)
      toast({
        title: "Link copied",
        description: "Post link copied to clipboard",
      })
    }
  }

  return (
    <Card className="overflow-hidden group">
      <div className="relative aspect-auto">
        {post.type === "video" ? (
          <div className="relative">
            <video
              src={post.media_url}
              className="w-full h-auto"
              controls
              preload="metadata"
            />
            <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded flex items-center space-x-1">
              <Play className="w-3 h-3" />
              <span className="text-xs">Video</span>
            </div>
          </div>
        ) : (
          <Link href={`/post/${post.id}`}>
            <div className="relative overflow-hidden">
              <Image
                src={post.media_url}
                alt={post.caption || "User uploaded content"}
                width={400}
                height={400}
                className="w-full h-auto transition-transform group-hover:scale-105 object-cover"
                style={{ width: '100%', height: 'auto' }}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                priority={false}
              />
            </div>
          </Link>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* User info */}
        <div className="flex items-center space-x-3">
          <Link
            href={`/profile/${post.user?.username || post.user_id}`}
            className="flex items-center space-x-2 hover:opacity-80"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-semibold text-sm">
              {post.user?.username?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="font-medium text-sm">
              {post.user?.username || "Unknown User"}
            </span>
          </Link>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm line-clamp-2">{post.caption}</p>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.tags.slice(0, 3).map((tag, index) => (
              <Link
                key={index}
                href={`/explore?tag=${tag}`}
                className="text-xs text-primary hover:underline"
              >
                #{tag}
              </Link>
            ))}
            {post.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{post.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Events */}
        {post.events && post.events.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">In:</span>
            {post.events.map((event, index) => (
              <Link
                key={event.id}
                href={`/events/${event.slug}`}
                className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20"
              >
                {event.name}
              </Link>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLike}
              className="flex items-center space-x-1 hover:text-red-500 transition-colors"
            >
              <Heart
                className={`w-5 h-5 ${
                  isLiked ? "fill-red-500 text-red-500" : ""
                }`}
              />
              <span className="text-sm">{likeCount}</span>
            </button>
            <Link
              href={`/post/${post.id}`}
              className="flex items-center space-x-1 hover:text-primary transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">{post._count?.comments || 0}</span>
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              disabled={downloading}
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}