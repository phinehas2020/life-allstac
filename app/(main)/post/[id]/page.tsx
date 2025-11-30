import { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import PostView from './post-view'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
  { params }: Props,
): Promise<Metadata> {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  // Fetch the post to get the media URL and caption
  const { data: postData } = await supabase
    .from('posts')
    .select('*, user:users(username)')
    .eq('id', id)
    .single()

  const post = postData as any

  if (!post) {
    return {
      title: 'Post Not Found',
      description: 'The requested post could not be found.',
    }
  }

  const username = post.user?.username || 'User'
  const title = post.caption
    ? `${username}: ${post.caption}`
    : `Post by ${username}`

  // Truncate description if too long
  const description = post.caption || `Check out this ${post.type} on Life.Allstac`

  // Determine the image to show
  // For videos, use thumbnail_url if available, otherwise fallback to media_url (which might not work for all platforms if it's a video file, but some do support it or it might be a poster)
  // Ideally, for videos, we should have a thumbnail.
  const imageUrl = post.type === 'video' && post.thumbnail_url
    ? post.thumbnail_url
    : post.media_url

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: [
        {
          url: imageUrl,
          width: post.width || 800,
          height: post.height || 600,
          alt: post.caption || 'Post content',
        },
      ],
      type: 'article',
      siteName: 'Life.Allstac',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [imageUrl],
      creator: '@allstac', // Placeholder if we don't have user's twitter handle
    },
  }
}

export default async function Page({ params }: Props) {
  const { id } = await params
  return <PostView id={id} />
}
