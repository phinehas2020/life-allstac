"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Heart, MessageCircle, Download, Share2, Send, ArrowLeft, Star } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/lib/hooks/use-toast"
import { PhotoRating } from "@/components/photo-rating"
import { PhotographerBadge } from "@/components/photographer-badge"
import type { Database, PostWithUser, CommentWithUser, User } from "@/lib/types/database"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export default function PostPage() {
  const params = useParams()
  const router = useRouter()
  const [post, setPost] = useState<PostWithUser | null>(null)
  const [comments, setComments] = useState<CommentWithUser[]>([])
  const [newComment, setNewComment] = useState("")
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null)
  const [currentUserData, setCurrentUserData] = useState<User | null>(null)
  const [existingRating, setExistingRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const { toast } = useToast()
  const supabase = createClient()
  const postId = params.id as string

  useEffect(() => {
    getCurrentUser()
    fetchPost()
    fetchComments()
    checkExistingRating()
  }, [postId])

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
    
    if (user) {
      const { data, error } = await (supabase as any)
        .from("users")
        .select("*, photographer_status, photographer_influence")
        .eq("id", user.id)
        .single()
      
      if (error) {
        console.error("Error fetching user data:", error)
      }
      
      if (data) {
        console.log("Current user data:", { photographer_status: data.photographer_status, photographer_influence: data.photographer_influence })
        setCurrentUserData(data)
      }
    }
  }

  const checkExistingRating = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("photo_ratings")
      .select("rating")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .maybeSingle<{ rating: number }>()

    if (data) {
      setExistingRating(data.rating)
    }
  }

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          user:users!posts_user_id_fkey(id, username, avatar_url, photographer_status, photographer_influence),
          likes(user_id),
          post_events(
            event:events(id, name, slug)
          )
        `)
        .eq("id", postId)
        .maybeSingle<any>()

      if (error) {
        console.error("Error fetching post:", error)
        return
      }

      if (data) {
        const formattedPost: PostWithUser = {
          ...data,
          user: data.user,
          likes: data.likes || [],
          comments: [],
          events: data.post_events?.map((pe: any) => pe.event) || [],
          _count: {
            likes: data.likes?.length || 0,
            comments: 0,
            downloads: 0,
          },
        }
        setPost(formattedPost)
        setIsLiked(data.likes?.some((like: any) => like.user_id === currentUser?.id) || false)
        setLikeCount(data.likes?.length || 0)
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select(`
        *,
        user:users!comments_user_id_fkey(id, username, avatar_url)
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true })

    if (data && !error) {
      setComments(data as CommentWithUser[])
    }
  }

  const handleLike = async () => {
    if (!currentUser) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to like posts",
      })
      return
    }

    try {
      if (isLiked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("user_id", currentUser.id)
          .eq("post_id", postId)

        if (!error) {
          setIsLiked(false)
          setLikeCount((prev) => Math.max(0, prev - 1))
        }
      } else {
        const { error } = await supabase
          .from("likes")
          .insert({ user_id: currentUser.id, post_id: postId } as any)

        if (!error) {
          setIsLiked(true)
          setLikeCount((prev) => prev + 1)
        }
      }
    } catch (error) {
      console.error("Error updating like:", error)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to comment",
      })
      return
    }

    if (!newComment.trim()) return

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          user_id: currentUser.id,
          post_id: postId,
          content: newComment.trim(),
        } as any)
        .select(`
          *,
          user:users!comments_user_id_fkey(id, username, avatar_url)
        `)
        .maybeSingle<CommentWithUser>()

      if (error) {
        toast({
          title: "Error",
          description: "Failed to post comment",
          variant: "destructive",
        })
        return
      }

      if (data) {
        setComments([...comments, data as CommentWithUser])
        setNewComment("")
        toast({
          title: "Success",
          description: "Comment posted",
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownload = async () => {
    if (!post) return

    try {
      await supabase
        .from("downloads")
        .insert({ post_id: postId, user_id: currentUser?.id } as any)

      const response = await fetch(post.media_url)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `allstac-${postId}.${post.type === "video" ? "mp4" : "jpg"}`
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
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Check out this post on Life.Allstac",
          text: post?.caption || "Amazing content from our community",
          url,
        })
      } catch (error) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url)
      toast({
        title: "Link copied",
        description: "Post link copied to clipboard",
      })
    }
  }

  if (loading || !post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-96 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Media Section */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            {post.type === "video" ? (
              <video
                src={post.media_url}
                className="w-full h-auto"
                controls
                preload="metadata"
              />
            ) : (
              <Image
                src={post.media_url}
                alt={post.caption || "User uploaded content"}
                width={800}
                height={800}
                className="w-full h-auto object-contain"
                priority
              />
            )}
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLike}
                className="flex items-center space-x-2 hover:text-red-500 transition-colors"
              >
                <Heart
                  className={`w-6 h-6 ${
                    isLiked ? "fill-red-500 text-red-500" : ""
                  }`}
                />
                <span className="font-medium">{likeCount} likes</span>
              </button>
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-6 h-6" />
                <span className="font-medium">{comments.length} comments</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {currentUserData?.photographer_status === "approved" && currentUser?.id !== post.user_id && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      {existingRating ? `${existingRating}★` : "Rate"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Rate This Photo</DialogTitle>
                    </DialogHeader>
                    <PhotoRating
                      postId={postId}
                      photographerId={currentUser!.id}
                      photographerInfluence={currentUserData.photographer_influence}
                      postCreatedAt={post.created_at}
                      existingRating={existingRating || undefined}
                      onRatingSubmitted={() => {
                        fetchPost()
                        checkExistingRating()
                      }}
                    />
                  </DialogContent>
                </Dialog>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>

        {/* Details and Comments Section */}
        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center space-x-3">
            <Link
              href={`/profile/${post.user?.username || post.user_id}`}
              className="flex items-center space-x-3 hover:opacity-80"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-semibold text-lg">
                {post.user?.username?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <p className="font-semibold">{post.user?.username || "Unknown User"}</p>
                  {post.user?.photographer_status === "approved" && (
                    <PhotographerBadge
                      influence={post.user?.photographer_influence}
                      accuracy={undefined}
                    />
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
              </div>
            </Link>
          </div>

          {/* Caption */}
          {post.caption && (
            <div>
              <p className="text-lg">{post.caption}</p>
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag, index) => (
                <Link
                  key={index}
                  href={`/explore?tag=${tag}`}
                  className="text-sm text-primary hover:underline bg-primary/10 px-3 py-1 rounded-full"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Events */}
          {post.events && post.events.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Posted in:</p>
              <div className="flex flex-wrap gap-2">
                {post.events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.slug}`}
                    className="text-sm bg-primary text-white px-3 py-1 rounded hover:bg-primary/90"
                  >
                    {event.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Quality Score */}
          {post.quality_score && post.rating_count > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-1">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <span className="font-semibold">Quality Score: {post.quality_score.toFixed(1)}/5.0</span>
              </div>
              <p className="text-xs text-gray-600">
                Rated by {post.rating_count} photographer{post.rating_count !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Comments Section */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4">Comments</h3>

            {/* Comment Form */}
            {currentUser ? (
              <form onSubmit={handleSubmitComment} className="mb-6">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={submitting}
                  />
                  <Button type="submit" disabled={submitting || !newComment.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600">
                  <Link href="/login" className="text-primary hover:underline">
                    Sign in
                  </Link>{" "}
                  to leave a comment
                </p>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No comments yet. Be the first!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <Link href={`/profile/${comment.user?.username || comment.user_id}`}>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {comment.user?.username?.[0]?.toUpperCase() || "U"}
                      </div>
                    </Link>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <Link
                            href={`/profile/${comment.user?.username || comment.user_id}`}
                            className="font-semibold text-sm hover:underline"
                          >
                            {comment.user?.username || "Unknown User"}
                          </Link>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
