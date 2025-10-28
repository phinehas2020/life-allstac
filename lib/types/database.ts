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
          photographer_status: 'pending' | 'approved' | 'denied' | null
          photographer_applied_at: string | null
          photographer_approved_at: string | null
          photographer_influence: number
          photographer_total_ratings: number
          photographer_accurate_ratings: number
          photographer_accuracy_percentage: number
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
          photographer_status?: 'pending' | 'approved' | 'denied' | null
          photographer_applied_at?: string | null
          photographer_approved_at?: string | null
          photographer_influence?: number
          photographer_total_ratings?: number
          photographer_accurate_ratings?: number
          photographer_accuracy_percentage?: number
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
          photographer_status?: 'pending' | 'approved' | 'denied' | null
          photographer_approved_at?: string | null
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
          quality_score: number | null
          rating_count: number
          weighted_rating_sum: number
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
          quality_score?: number | null
          rating_count?: number
          weighted_rating_sum?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          caption?: string | null
          tags?: string[] | null
          quality_score?: number | null
          rating_count?: number
          weighted_rating_sum?: number
          updated_at?: string
        }
      }
      photo_ratings: {
        Row: {
          id: string
          user_id: string
          post_id: string
          rating: number
          rating_label: 'low_quality' | 'standard' | 'good' | 'high_quality' | 'exceptional'
          time_to_rate_hours: number | null
          influence_at_rating: number
          was_accurate: boolean | null
          accuracy_bonus: number
          created_at: string
          evaluated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          rating: number
          rating_label: 'low_quality' | 'standard' | 'good' | 'high_quality' | 'exceptional'
          time_to_rate_hours?: number | null
          influence_at_rating?: number
          was_accurate?: boolean | null
          accuracy_bonus?: number
          created_at?: string
          evaluated_at?: string | null
        }
        Update: {
          rating?: number
          rating_label?: 'low_quality' | 'standard' | 'good' | 'high_quality' | 'exceptional'
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
export type PhotoRating = Database['public']['Tables']['photo_ratings']['Row']
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