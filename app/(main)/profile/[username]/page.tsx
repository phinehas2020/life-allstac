"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MediaGallery } from "@/components/media-gallery"
import { UserPlus, UserMinus, Settings, Camera, Clock } from "lucide-react"
import { useToast } from "@/lib/hooks/use-toast"
import { PhotographerBadge } from "@/components/photographer-badge"
import type { Database, User, PostWithUser } from "@/lib/types/database"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export default function ProfilePage() {
  const params = useParams()
  const [user, setUser] = useState<User | null>(null)
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null)
  const [posts, setPosts] = useState<PostWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const { toast } = useToast()
  const supabase = createClient()
  // Decode URL-encoded username (e.g., "Phinehas%20Adams" -> "Phinehas Adams")
  const username = decodeURIComponent(params.username as string).trim()

  useEffect(() => {
    getCurrentUser()
    fetchUser()
  }, [username])

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  const fetchUser = async () => {
    try {
      setLoading(true)

      // Try to fetch user by username first, then by ID
      let userData: User | null = null
      let userError = null

      // First try by username (case-insensitive, trimmed)
      const { data: userByName, error: nameError } = await (supabase as any)
        .from("users")
        .select("*")
        .ilike("username", username)
        .maybeSingle()

      if (userByName) {
        userData = userByName
      } else if (!nameError || nameError.code === 'PGRST116') {
        // If not found by username, try by ID
        const { data: userById, error: idError } = await (supabase as any)
          .from("users")
          .select("*")
          .eq("id", username)
          .maybeSingle()

        userData = userById
        userError = idError
      } else {
        userError = nameError
      }

      if (userError || !userData) {
        console.error("Error fetching user:", userError)
        console.error("Searched username:", username)
        console.error("User data:", userData)
        return
      }

      setUser(userData)

      // Fetch user's posts
      const { data: postsData } = await supabase
        .from("posts")
        .select(`
          *,
          user:users!posts_user_id_fkey(id, username, avatar_url, photographer_status, photographer_influence),
          likes(user_id),
          comments(id),
          post_events(
            event:events(id, name, slug)
          )
        `)
        .eq("user_id", userData.id)
        .order("quality_score", { ascending: false })
        .order("created_at", { ascending: false })

      if (postsData) {
        const formattedPosts: PostWithUser[] = (postsData as any[]).map((post: any) => ({
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
        setPosts(formattedPosts)
      }

      // Check if current user is following this user
      if (currentUser) {
        const { data: followData } = await supabase
          .from("follows")
          .select("*")
          .eq("follower_id", currentUser.id)
          .eq("following_id", userData.id)
          .maybeSingle<Database["public"]["Tables"]["follows"]["Row"]>()

        setIsFollowing(!!followData)
      }

      // Get follower/following counts
      const { count: followers } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userData.id)

      const { count: following } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userData.id)

      setFollowerCount(followers || 0)
      setFollowingCount(following || 0)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!currentUser || !user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to follow users",
      })
      return
    }

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", user.id)

        if (!error) {
          setIsFollowing(false)
          setFollowerCount((prev) => Math.max(0, prev - 1))
        }
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_id: currentUser.id,
            following_id: user.id,
          } as any)

        if (!error) {
          setIsFollowing(true)
          setFollowerCount((prev) => prev + 1)
        }
      }
    } catch (error) {
      console.error("Error updating follow:", error)
    }
  }

  const handleApplyPhotographer = async () => {
    const { error } = await (supabase as any)
      .from("users")
      .update({
        photographer_status: "pending",
        photographer_applied_at: new Date().toISOString(),
      })
      .eq("id", user!.id)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit application",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Application Submitted",
      description: "Your photographer application has been submitted for review",
    })

    fetchUser()
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-48 bg-muted/50 rounded-2xl mb-8"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-muted/50 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-6">
        <h1 className="text-3xl font-bold text-primary">User not found</h1>
          <p className="text-muted-foreground">The user you are looking for doesn&apos;t exist or has moved.</p>
        <Link href="/">
          <Button size="lg" className="rounded-full">Go Home</Button>
        </Link>
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === user.id

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Profile Header - Redesigned */}
      <div className="mb-12 flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-primary to-primary/70 p-1 shadow-xl ring-4 ring-background">
            <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
              {user.avatar_url ? (
                 <Image src={user.avatar_url} width={160} height={160} alt={user.username || "User"} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl md:text-5xl font-bold text-primary">
                  {user.username?.[0]?.toUpperCase() || "U"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 text-center md:text-left space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
            <h1 className="text-3xl md:text-4xl font-bold font-heading text-primary">{user.username}</h1>
            <div className="flex items-center gap-3">
               {user.photographer_status === "approved" && (
                  <PhotographerBadge
                    influence={user.photographer_influence}
                    accuracy={user.photographer_accuracy_percentage}
                  />
                )}
               {isOwnProfile ? (
                <>
                  <Link href="/settings">
                    <Button variant="outline" size="sm" className="rounded-full border-2 font-medium">
                      <Settings className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                </>
              ) : currentUser ? (
                <Button
                  onClick={handleFollow}
                  variant={isFollowing ? "outline" : "default"}
                  size="sm"
                  className={`rounded-full font-medium ${isFollowing ? "border-2" : "shadow-md"}`}
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="w-4 h-4 mr-2" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Follow
                    </>
                  )}
                </Button>
              ) : (
                <Link href="/login">
                  <Button size="sm" className="rounded-full shadow-md">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Follow
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center md:justify-start gap-8 py-2">
            <div className="text-center md:text-left">
              <span className="block text-xl font-bold text-primary">{posts.length}</span>
              <span className="text-sm text-muted-foreground font-medium">Posts</span>
            </div>
            <div className="text-center md:text-left">
              <span className="block text-xl font-bold text-primary">{followerCount}</span>
              <span className="text-sm text-muted-foreground font-medium">Followers</span>
            </div>
            <div className="text-center md:text-left">
              <span className="block text-xl font-bold text-primary">{followingCount}</span>
              <span className="text-sm text-muted-foreground font-medium">Following</span>
            </div>
          </div>

          {/* Bio */}
          <p className="text-base text-foreground/80 max-w-xl mx-auto md:mx-0 leading-relaxed">
            {user.bio || "No bio yet."}
          </p>

          {/* Photographer Stats / Actions */}
          <div className="pt-2 flex flex-wrap justify-center md:justify-start gap-3">
            {isOwnProfile && !user.photographer_status && (
                <Button
                  onClick={handleApplyPhotographer}
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Apply to Rate
                </Button>
            )}
            {isOwnProfile && user.photographer_status === "pending" && (
              <div className="flex items-center space-x-2 px-4 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-sm">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-amber-700 font-medium">Application Pending</span>
              </div>
            )}
             {user.photographer_status === "approved" && user.photographer_total_ratings > 0 && (
                  <div className="text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full inline-block">
                    Rated <strong>{user.photographer_total_ratings}</strong> photos • <strong>{user.photographer_accuracy_percentage.toFixed(0)}%</strong> accuracy
                  </div>
             )}
          </div>
        </div>
      </div>

      {/* User's Posts */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold font-heading">Gallery</h2>
      </div>

      {posts.length > 0 ? (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <MediaGallery posts={posts} currentUserId={currentUser?.id} />
        </div>
      ) : (
        <div className="text-center py-20 bg-secondary/20 rounded-3xl border border-dashed border-border">
          <div className="bg-background p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm">
             <Camera className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No posts yet</h3>
          <p className="text-muted-foreground max-w-xs mx-auto">
            Once {user.username} shares some moments, they&apos;ll appear here.
          </p>
        </div>
      )}
    </div>
  )
}
