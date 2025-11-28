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
  const supabase = createClient()

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
    <div className="group relative">
      <Card className="border-0 shadow-none bg-transparent overflow-hidden rounded-[20px] transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
        <div className="relative aspect-auto bg-gray-100 dark:bg-gray-800 rounded-[20px] overflow-hidden">
          {post.type === "video" ? (
            <div className="relative">
              <video
                src={post.media_url}
                className="w-full h-auto"
                controls
                playsInline
                preload="metadata"
                poster={post.thumbnail_url || undefined}
              />
              {!post.thumbnail_url && (
                  <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md text-white px-3 py-1.5 rounded-full flex items-center space-x-1.5 pointer-events-none border border-white/10">
                  <Play className="w-3 h-3 fill-current" />
                  <span className="text-[10px] font-bold tracking-wider uppercase">Video</span>
                  </div>
              )}
            </div>
          ) : (
            <Link href={`/post/${post.id}`} className="block relative group-hover:cursor-zoom-in">
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
                <Image
                  src={post.media_url}
                  alt={post.caption || "User uploaded content"}
                  width={600}
                  height={800}
                  className="w-full h-auto object-cover transform transition-transform duration-700 will-change-transform group-hover:scale-105"
                  style={{ width: '100%', height: 'auto' }}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  priority={false}
                />

                {post.quality_score && post.quality_score >= 4.0 && (
                  <div className="absolute top-3 left-3 z-20 bg-white/90 dark:bg-black/80 backdrop-blur-md text-amber-500 px-3 py-1 rounded-full flex items-center space-x-1 shadow-lg border border-amber-500/20">
                    <Award className="w-3.5 h-3.5 fill-current" />
                    <span className="text-[10px] font-bold tracking-wider">TOP PICK</span>
                  </div>
                )}
              </div>
            </Link>
          )}
        </div>

        {/* Minimal Info Bar on Hover/Default */}
        <div className="pt-3 pb-1 px-1 space-y-2">
           <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-2.5 overflow-hidden">
                  <Link href={`/profile/${post.user?.username || post.user_id}`} className="shrink-0 relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 p-0.5">
                       <div className="w-full h-full rounded-full overflow-hidden relative">
                        {post.user?.avatar_url ? (
                            <Image
                            src={post.user.avatar_url}
                            alt={post.user.username || "User"}
                            fill
                            className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground text-xs font-bold">
                             {post.user?.username?.[0]?.toUpperCase() || "U"}
                            </div>
                        )}
                       </div>
                    </div>
                    {post.user?.photographer_status === "approved" && (
                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-black rounded-full p-[2px]">
                            <Star className="w-3 h-3 text-blue-500 fill-current" />
                        </div>
                    )}
                  </Link>
                  <div className="flex flex-col min-w-0">
                    <Link href={`/profile/${post.user?.username || post.user_id}`} className="truncate">
                        <span className="font-bold text-sm text-foreground hover:text-primary transition-colors block truncate">
                            {post.user?.username || "Unknown"}
                        </span>
                    </Link>
                    <span className="text-[10px] text-muted-foreground font-medium truncate">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </span>
                  </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                 <button
                    onClick={handleLike}
                    className={`group/like flex items-center justify-center w-8 h-8 rounded-full transition-all hover:bg-red-50 dark:hover:bg-red-950/30 ${
                      isLiked ? "text-red-500 bg-red-50 dark:bg-red-950/30" : "text-muted-foreground"
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 transition-transform group-active/like:scale-75 ${
                        isLiked ? "fill-current" : ""
                      }`}
                    />
                  </button>
                  <Link
                    href={`/post/${post.id}`}
                     className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Link>

                  {/* Restored Download Button */}
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
                    className="w-8 h-8 rounded-full text-muted-foreground hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>

                  {/* Restored Rate Button */}
                  {isPhotographer && currentUserId !== post.user_id && (
                    <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
                        <DialogTrigger asChild>
                        <Button
                            variant={existingRating ? "default" : "outline"}
                            size="sm"
                            className="h-8 w-8 p-0 rounded-full ml-1"
                        >
                            <Star className={`w-3.5 h-3.5 ${existingRating ? 'fill-current' : ''}`} />
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

           {post.caption && (
             <p className="text-sm text-muted-foreground line-clamp-2 px-1">
               <span className="font-medium text-foreground mr-1.5">{post.user?.username}</span>
               {post.caption}
             </p>
           )}

           {/* Tags */}
            {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1">
                {post.tags.slice(0, 3).map((tag, index) => (
                <Link
                    key={index}
                    href={`/explore?tag=${tag}`}
                    className="text-[10px] font-semibold text-muted-foreground hover:text-primary transition-colors"
                >
                    #{tag}
                </Link>
                ))}
            </div>
            )}

            {/* Restored Events Display */}
            {post.events && post.events.length > 0 && (
              <div className="flex items-center space-x-2 pt-1 px-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground shrink-0">Event</span>
                <div className="flex flex-wrap gap-1">
                  {post.events.map((event, index) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.slug}`}
                      className="text-[10px] font-medium text-accent-foreground bg-accent/20 px-1.5 py-0.5 rounded hover:bg-accent/30 transition-colors"
                    >
                      {event.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
        </div>
      </Card>
    </div>
  )
}
