"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Heart, MessageCircle, Download, Share2, Play, Star, Award } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/lib/hooks/use-toast"
import { PhotographerBadge } from "@/components/photographer-badge"
import { PhotoRating } from "@/components/photo-rating"
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
  const [isPhotographer, setIsPhotographer] = useState(false)
  const [photographerInfluence, setPhotographerInfluence] = useState(1.0)
  const [existingRating, setExistingRating] = useState<number | undefined>()
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false)
  const { toast } = useToast()
  const supabase = useMemo(() => createClient(), [])

  const checkPhotographerStatus = useCallback(async () => {
    if (!currentUserId) return

    const { data: userData } = await (supabase as any)
      .from("users")
      .select("photographer_status, photographer_influence")
      .eq("id", currentUserId)
      .single()

    if (userData?.photographer_status === "approved") {
      setIsPhotographer(true)
      setPhotographerInfluence(userData.photographer_influence || 1.0)

      // Check for existing rating
      const { data: ratingData } = await (supabase as any)
        .from("photo_ratings")
        .select("rating")
        .eq("user_id", currentUserId)
        .eq("post_id", post.id)
        .single()

      if (ratingData) {
        setExistingRating(ratingData.rating)
      }
    }
  }, [currentUserId, post.id, supabase])

  useEffect(() => {
    if (currentUserId) {
      checkPhotographerStatus()
    }
  }, [currentUserId, checkPhotographerStatus])

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
        const { error } = await (supabase as any)
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
        const { error } = await (supabase as any)
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
      await (supabase as any)
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
    /* Removed transition-all from the card container to fix flickering/glitching in masonry layouts */
    <Card className="group border-0 shadow-sm hover:shadow-lg transition-shadow duration-300 bg-card rounded-2xl overflow-hidden">
      <div className="relative aspect-auto">
        {post.type === "video" ? (
          <div className="relative">
            <video
              src={post.media_url}
              className="w-full h-auto rounded-t-2xl"
              controls
              playsInline
              preload="metadata"
              poster={post.thumbnail_url || undefined}
            />
            {/* Remove overlay if playing? Native controls usually handle this.
                Keeping the badge if not playing would require state, but native poster covers it mostly.
                The previous Play icon badge is nice for indicating it's a video before interaction if autoplay is off.
            */}
            {!post.thumbnail_url && (
                <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded-full flex items-center space-x-1 pointer-events-none">
                <Play className="w-3 h-3" />
                <span className="text-xs font-medium">Video</span>
                </div>
            )}
          </div>
        ) : (
          <Link href={`/post/${post.id}`} className="block relative">
            <div className="relative overflow-hidden bg-gray-100">
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10 duration-300" />
              {/* Added translate-z-0 to image container to prevent repaint glitches */}
              <div className="transform-gpu">
                  <Image
                    src={post.media_url}
                    alt={post.caption || "User uploaded content"}
                    width={600}
                    height={800}
                    className="w-full h-auto transition-transform duration-500 group-hover:scale-105 object-cover will-change-transform"
                    style={{ width: '100%', height: 'auto' }}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority={false}
                  />
              </div>
              {post.quality_score && post.quality_score >= 4.0 && (
                <div className="absolute top-3 left-3 z-20 bg-amber-500/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-lg transform transition-transform hover:scale-110">
                  <Award className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold tracking-wide">TOP PICK</span>
                </div>
              )}
            </div>
          </Link>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* User info - refined */}
        <div className="flex items-center justify-between">
          <Link
            href={`/profile/${post.user?.username || post.user_id}`}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 ring-2 ring-white dark:ring-gray-800 shadow-sm flex items-center justify-center text-white font-bold text-sm shrink-0">
              {post.user?.avatar_url ? (
                <Image
                  src={post.user.avatar_url}
                  alt={post.user.username || "User"}
                  width={36}
                  height={36}
                  className="rounded-full object-cover w-full h-full"
                />
              ) : (
                post.user?.username?.[0]?.toUpperCase() || "U"
              )}
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm text-primary truncate">
                  {post.user?.username || "Unknown User"}
                </span>
                {post.user?.photographer_status === "approved" && (
                  <PhotographerBadge influence={post.user.photographer_influence} />
                )}
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
          </Link>
          {post.quality_score && post.quality_score >= 4.0 && (
            <div className="flex items-center space-x-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-500" />
              <span className="text-xs font-bold">{post.quality_score.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm text-foreground/90 leading-relaxed line-clamp-2 font-normal">
            {post.caption}
          </p>
        )}

        {/* Tags - pill style */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {post.tags.slice(0, 3).map((tag, index) => (
              <Link
                key={index}
                href={`/explore?tag=${tag}`}
                className="text-[11px] font-medium text-primary/80 bg-primary/5 hover:bg-primary/10 px-2 py-0.5 rounded-full transition-colors"
              >
                #{tag}
              </Link>
            ))}
            {post.tags.length > 3 && (
              <span className="text-[11px] text-muted-foreground px-1.5 py-0.5">
                +{post.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Events - refined */}
        {post.events && post.events.length > 0 && (
          <div className="flex items-center space-x-2 pt-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground shrink-0">Event</span>
            <div className="flex flex-wrap gap-1">
              {post.events.map((event, index) => (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="text-xs font-medium text-accent-foreground bg-accent/20 px-2 py-0.5 rounded-md hover:bg-accent/30 transition-colors"
                >
                  {event.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Actions - Floating/Minimal */}
        <div className="flex items-center justify-between pt-3 border-t border-border/40 gap-2 flex-wrap">
          <div className="flex items-center space-x-3 flex-shrink-0">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-1.5 transition-all duration-200 active:scale-95 ${
                isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
              }`}
            >
              <Heart
                className={`w-5 h-5 ${
                  isLiked ? "fill-current" : ""
                }`}
              />
              <span className="text-sm font-medium">{likeCount}</span>
            </button>
            <Link
              href={`/post/${post.id}`}
              className="flex items-center space-x-1.5 text-muted-foreground hover:text-primary transition-colors active:scale-95"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{post._count?.comments || 0}</span>
            </Link>
          </div>
          <div className="flex items-center space-x-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              disabled={downloading}
              className="w-8 h-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="w-8 h-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            {isPhotographer && currentUserId !== post.user_id && (
              <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant={existingRating ? "default" : "outline"}
                    size="sm"
                    className="h-8 px-3 ml-1 rounded-full text-xs font-medium"
                  >
                    <Star className={`w-3.5 h-3.5 mr-1.5 ${existingRating ? 'fill-current' : ''}`} />
                    {existingRating ? `${existingRating}★` : 'Rate'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Rate This Photo</DialogTitle>
                  </DialogHeader>
                  <PhotoRating
                    postId={post.id}
                    photographerId={currentUserId!}
                    photographerInfluence={photographerInfluence}
                    postCreatedAt={post.created_at}
                    existingRating={existingRating}
                    onRatingSubmitted={() => {
                      setRatingDialogOpen(false)
                      checkPhotographerStatus()
                      if (onLikeUpdate) onLikeUpdate()
                    }}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
