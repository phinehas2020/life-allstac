"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MediaGallery } from "@/components/media-gallery"
import { UserPlus, UserMinus, Settings, Camera, Clock } from "lucide-react"
import { useToast } from "@/lib/hooks/use-toast"
import { PhotographerBadge } from "@/components/photographer-badge"
import type { User, PostWithUser } from "@/lib/types/database"
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
  const username = params.username as string

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

      // Fetch user by username or ID
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .or(`username.eq.${username},id.eq.${username}`)
        .single()

      if (userError || !userData) {
        console.error("Error fetching user:", userError)
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
        const formattedPosts: PostWithUser[] = postsData.map((post: any) => ({
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
          .single()

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
    const { error } = await supabase
      .from("users")
      .update({
        photographer_status: "pending",
        photographer_applied_at: new Date().toISOString(),
      } as any)
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
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-8"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">User not found</h1>
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === user.id

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Profile Header */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-6 mb-4 md:mb-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-3xl">
                {user.username?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold">{user.username}</h1>
                  {user.photographer_status === "approved" && (
                    <PhotographerBadge
                      influence={user.photographer_influence}
                      accuracy={user.photographer_accuracy_percentage}
                    />
                  )}
                </div>
                {user.bio && <p className="text-gray-600 mb-3">{user.bio}</p>}
                <div className="flex items-center space-x-6 text-sm">
                  <div>
                    <span className="font-bold">{posts.length}</span> posts
                  </div>
                  <div>
                    <span className="font-bold">{followerCount}</span> followers
                  </div>
                  <div>
                    <span className="font-bold">{followingCount}</span> following
                  </div>
                </div>
                {user.photographer_status === "approved" && user.photographer_total_ratings > 0 && (
                  <div className="mt-2 text-xs text-gray-600">
                    {user.photographer_total_ratings} ratings • {user.photographer_accuracy_percentage.toFixed(0)}% accuracy
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {isOwnProfile ? (
                <>
                  <Link href="/settings">
                    <Button variant="outline" className="w-full md:w-auto">
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </Link>
                  {!user.photographer_status && (
                    <Button 
                      onClick={handleApplyPhotographer}
                      variant="default"
                      className="w-full md:w-auto"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Apply to Rate Photos
                    </Button>
                  )}
                  {user.photographer_status === "pending" && (
                    <div className="flex items-center space-x-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span className="text-amber-700">Application Pending</span>
                    </div>
                  )}
                  {user.photographer_status === "approved" && (
                    <PhotographerBadge
                      influence={user.photographer_influence}
                      accuracy={user.photographer_accuracy_percentage}
                      showStats
                    />
                  )}
                </>
              ) : currentUser ? (
                <Button onClick={handleFollow} variant={isFollowing ? "outline" : "default"}>
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
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Follow
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User's Posts */}
      <div className="mb-4">
        <h2 className="text-xl font-bold">Posts</h2>
      </div>

      {posts.length > 0 ? (
        <MediaGallery posts={posts} currentUserId={currentUser?.id} />
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No posts yet</p>
        </div>
      )}
    </div>
  )
}
