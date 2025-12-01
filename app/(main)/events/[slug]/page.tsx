import { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import EventDetailClient from './event-detail-client'
import { Event } from '@/lib/types/database'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata(
  { params }: Props,
): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  // Fetch the event to get details
  const { data } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single()

  const event = data as Event | null

  if (!event) {
    return {
      title: 'Event Not Found',
      description: 'The requested event could not be found.',
    }
  }

  const title = `${event.name} - Public Request`
  const description = event.description || `Join the ${event.name} challenge on Life.Allstac`
  const imageUrl = event.cover_image || 'https://life.allstac.com/og-image.jpg' // Fallback image if needed

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: event.name,
        },
      ],
      type: 'website',
      siteName: 'Life.Allstac',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [imageUrl],
    },
  }
}

export default async function Page() {
  return <EventDetailClient />
}
