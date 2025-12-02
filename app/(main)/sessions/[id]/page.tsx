'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils/cn'
import { Post } from '@/lib/types/database'
import { X, ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react'

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

  // Lightbox State
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)

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

  // Lightbox Handlers
  const openLightbox = (index: number) => {
    setSelectedPhotoIndex(index)
    document.body.style.overflow = 'hidden' // Prevent background scrolling
  }

  const closeLightbox = useCallback(() => {
    setSelectedPhotoIndex(null)
    document.body.style.overflow = 'auto'
  }, [])

  const nextPhoto = useCallback(() => {
    if (selectedPhotoIndex === null) return
    setSelectedPhotoIndex((prev) =>
      prev === null || prev === photos.length - 1 ? 0 : prev + 1
    )
  }, [selectedPhotoIndex, photos.length])

  const prevPhoto = useCallback(() => {
    if (selectedPhotoIndex === null) return
    setSelectedPhotoIndex((prev) =>
      prev === null || prev === 0 ? photos.length - 1 : prev - 1
    )
  }, [selectedPhotoIndex, photos.length])

  // Keyboard Navigation
  useEffect(() => {
    if (selectedPhotoIndex === null) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowRight') nextPhoto()
      if (e.key === 'ArrowLeft') prevPhoto()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedPhotoIndex, closeLightbox, nextPhoto, prevPhoto])

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
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-all"
              onClick={() => openLightbox(index)}
            >
              <Image
                src={photo.thumbnail_url || photo.media_url}
                alt={photo.caption || 'Session photo'}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <span className="text-white bg-black/50 px-3 py-1 rounded-full text-sm backdrop-blur-sm">View Fullscreen</span>
              </div>
            </div>
          ))}
        </div>

        {photos.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No photos found in this session.
          </div>
        )}

        {/* Lightbox Overlay */}
        {selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm">

              {/* Close Button */}
              <button
                onClick={closeLightbox}
                className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-50 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-8 h-8" />
              </button>

              {/* Download Button */}
              <a
                 href={photos[selectedPhotoIndex].media_url}
                 download
                 target="_blank"
                 rel="noopener noreferrer"
                 className="absolute top-4 left-4 text-white/70 hover:text-white p-2 z-50 flex items-center gap-2 rounded-full hover:bg-white/10 transition-colors"
                 onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-6 h-6" />
                <span className="hidden sm:inline">Download</span>
              </a>

              {/* Navigation Buttons */}
              <button
                onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors z-50"
              >
                <ChevronLeft className="w-10 h-10" />
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors z-50"
              >
                <ChevronRight className="w-10 h-10" />
              </button>

              {/* Main Image Container */}
              <div
                className="relative w-full h-full p-4 md:p-12 flex items-center justify-center"
                onClick={closeLightbox} // Click outside image to close
              >
                <div
                  className="relative w-full h-full max-w-7xl max-h-[90vh]"
                  onClick={(e) => e.stopPropagation()} // Prevent close when clicking image
                >
                   {photos[selectedPhotoIndex].type === 'video' ? (
                       <video
                         src={photos[selectedPhotoIndex].media_url}
                         controls
                         className="w-full h-full object-contain"
                         autoPlay
                       />
                   ) : (
                       <Image
                         src={photos[selectedPhotoIndex].media_url}
                         alt="Fullscreen view"
                         fill
                         className="object-contain"
                         priority
                         quality={90}
                       />
                   )}
                </div>
              </div>

              {/* Footer / Counter */}
              <div className="absolute bottom-4 left-0 right-0 text-center text-white/50 text-sm pointer-events-none">
                {selectedPhotoIndex + 1} of {photos.length}
              </div>
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
              "w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium transition-colors hover:bg-primary/90 flex justify-center items-center",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Access Gallery'}
          </button>
        </form>
      </div>
    </div>
  )
}
