'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Database, Post } from '@/lib/types/database'
import { cn } from '@/lib/utils/cn'

export default function SessionPage() {
  const params = useParams()
  const id = params.id as string
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionData, setSessionData] = useState<{
    title: string
    created_at: string
  } | null>(null)
  const [photos, setPhotos] = useState<Post[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/session/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: id, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to access session')
      }

      setSessionData(data.session)
      setPhotos(data.photos)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (sessionData) {
    return (
      <div className="container mx-auto py-8 px-4">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold font-heading text-primary">{sessionData.title}</h1>
          <p className="text-muted-foreground mt-2">
            {new Date(sessionData.created_at).toLocaleDateString()}
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden group">
              <Image
                src={photo.media_url}
                alt={photo.caption || 'Session photo'}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <a
                  href={photo.media_url}
                  download
                  className="bg-white/90 text-black px-4 py-2 rounded-full font-medium hover:bg-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>

        {photos.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No photos found in this session.
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md p-8 bg-card rounded-xl shadow-lg border">
        <h1 className="text-2xl font-bold font-heading text-center mb-6">Private Session</h1>
        <p className="text-center text-muted-foreground mb-6">
          Please enter the password provided by your photographer to view this gallery.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary focus:outline-none"
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium transition-colors hover:bg-primary/90",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? 'Verifying...' : 'Access Gallery'}
          </button>
        </form>
      </div>
    </div>
  )
}
