export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          avatar_url: string | null
          bio: string | null
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          username: string
          avatar_url?: string | null
          bio?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string
          avatar_url?: string | null
          bio?: string | null
          is_admin?: boolean
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          cover_image: string | null
          start_date: string | null
          end_date: string | null
          is_featured: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          cover_image?: string | null
          start_date?: string | null
          end_date?: string | null
          is_featured?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          cover_image?: string | null
          start_date?: string | null
          end_date?: string | null
          is_featured?: boolean
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          media_url: string
          thumbnail_url: string | null
          type: 'image' | 'video'
          caption: string | null
          tags: string[] | null
          blurhash: string | null
          width: number | null
          height: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          media_url: string
          thumbnail_url?: string | null
          type: 'image' | 'video'
          caption?: string | null
          tags?: string[] | null
          blurhash?: string | null
          width?: number | null
          height?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          caption?: string | null
          tags?: string[] | null
          updated_at?: string
        }
      }
      post_events: {
        Row: {
          id: string
          post_id: string
          event_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          event_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          event_id?: string
        }
      }
      likes: {
        Row: {
          id: string
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
        }
      }
      comments: {
        Row: {
          id: string
          user_id: string
          post_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content?: string
          updated_at?: string
        }
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
        }
      }
      event_follows: {
        Row: {
          id: string
          user_id: string
          event_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string
        }
      }
      downloads: {
        Row: {
          id: string
          user_id: string | null
          post_id: string
          resolution: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          post_id: string
          resolution?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          post_id?: string
          resolution?: string | null
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

export type User = Database['public']['Tables']['users']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type PostEvent = Database['public']['Tables']['post_events']['Row']
export type Like = Database['public']['Tables']['likes']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Follow = Database['public']['Tables']['follows']['Row']
export type EventFollow = Database['public']['Tables']['event_follows']['Row']
export type Download = Database['public']['Tables']['downloads']['Row']

// Extended types with relations
export interface PostWithUser extends Post {
  user: User
  likes: Like[]
  comments: CommentWithUser[]
  events: Event[]
  _count: {
    likes: number
    comments: number
    downloads: number
  }
}

export interface CommentWithUser extends Comment {
  user: User
}

export interface EventWithPosts extends Event {
  posts: PostWithUser[]
  followers: EventFollow[]
  _count: {
    posts: number
    followers: number
  }
}