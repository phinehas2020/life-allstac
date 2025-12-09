'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/lib/utils/cn'
import { Post } from '@/lib/types/database'
import { X, ChevronLeft, ChevronRight, Download, Loader2, ArrowLeft } from 'lucide-react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { useWindowSize } from '@/lib/hooks/use-window-size'
import { Button } from '@/components/ui/button'

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [sessionData, setSessionData] = useState<{
    title: string
    created_at: string
  } | null>(null)
  const [photos, setPhotos] = useState<Post[]>([])

  // Lightbox State
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)

  // Masonry State
  const { width } = useWindowSize()

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

  // Download All Handler
  const handleDownloadAll = async () => {
    if (photos.length === 0) return
    setDownloadingAll(true)
    try {
      const zip = new JSZip()
      const folder = zip.folder(sessionData?.title || 'session-photos')

      // Use Promise.all to fetch all images
      const promises = photos.map(async (photo, index) => {
        try {
          const response = await fetch(photo.media_url)
          const blob = await response.blob()
          const ext = photo.type === 'video' ? 'mp4' : 'jpg' // Simple extension logic
          const filename = `photo-${index + 1}.${ext}`
          folder?.file(filename, blob)
        } catch (e) {
          console.error(`Failed to download photo ${index}`, e)
        }
      })

      await Promise.all(promises)

      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, `${sessionData?.title || 'session'}-photos.zip`)
    } catch (e) {
      console.error('Error creating zip', e)
      alert('Failed to download photos. Please try again.')
    } finally {
      setDownloadingAll(false)
    }
  }

  // Masonry Columns Calculation
  const columnCount = useMemo(() => {
    if (!width) return 2 // Default for SSR / initial load
    if (width >= 1024) return 4
    if (width >= 768) return 3
    return 2 // Mobile friendly 2 columns
  }, [width])

  const columns = useMemo(() => {
    if (!photos || photos.length === 0) return []
    const cols: { photo: Post, originalIndex: number }[][] = Array.from({ length: columnCount }, () => [])

    photos.forEach((photo, index) => {
      const columnIndex = index % columnCount
      cols[columnIndex].push({ photo, originalIndex: index })
    })
    return cols
  }, [photos, columnCount])

  if (sessionData) {
    const headerImage = photos.length > 0 ? (photos[0].media_url) : null

    return (
      <div className="min-h-screen bg-background">
        {/* Hero Header */}
        <div className="relative w-full h-[50vh] md:h-[60vh] overflow-hidden mb-8">
           {headerImage ? (
             <>
                <Image
                  src={headerImage}
                  alt="Session Header"
                  fill
                  className="object-cover blur-sm opacity-50 scale-105"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
             </>
           ) : (
             <div className="absolute inset-0 bg-muted" />
           )}

           {/* Back Button */}
           <div className="absolute top-4 left-4 z-20">
             <Button
                variant="ghost"
                size="icon"
                className="text-foreground hover:bg-background/20 rounded-full"
                onClick={() => router.back()}
             >
                <ArrowLeft className="h-6 w-6" />
             </Button>
           </div>

           <div className="absolute bottom-0 left-0 right-0 p-8 container mx-auto flex flex-col items-start justify-end h-full z-10">
              <h1 className="text-4xl md:text-6xl font-bold font-heading text-foreground mb-2 drop-shadow-md">
                {sessionData.title}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground font-medium mb-6">
                 {new Date(sessionData.created_at).toLocaleDateString(undefined, {
                   weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                 })}
              </p>

              <div className="flex gap-4">
                 <Button
                   onClick={handleDownloadAll}
                   disabled={downloadingAll || photos.length === 0}
                   className="shadow-lg"
                   size="lg"
                 >
                   {downloadingAll ? (
                     <>
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                       Zipping Photos...
                     </>
                   ) : (
                     <>
                       <Download className="mr-2 h-4 w-4" />
                       Download All Photos
                     </>
                   )}
                 </Button>
              </div>
           </div>
        </div>

        <div className="container mx-auto px-4 pb-16">
          {/* Masonry Grid */}
          <div className="flex gap-4 items-start w-full">
            {columns.map((col, colIndex) => (
              <div key={colIndex} className="flex-1 min-w-0 flex flex-col gap-4">
                 {col.map(({ photo, originalIndex }) => (
                   <div
                     key={photo.id}
                     className="relative w-full group cursor-pointer overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-all"
                     onClick={() => openLightbox(originalIndex)}
                   >
                      <Image
                        src={photo.thumbnail_url || photo.media_url}
                        alt={photo.caption || 'Session photo'}
                        width={600}
                        height={0} // Allows auto height
                        className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                        style={{ width: '100%', height: 'auto' }}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                   </div>
                 ))}
              </div>
            ))}
          </div>

          {photos.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No photos found in this session.
            </div>
          )}
        </div>

        {/* Lightbox Overlay */}
        {selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">

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
                  className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()} // Prevent close when clicking image
                >
                   {photos[selectedPhotoIndex].type === 'video' ? (
                       <video
                         src={photos[selectedPhotoIndex].media_url}
                         controls
                         className="w-full h-full max-h-[90vh] object-contain"
                         autoPlay
                       />
                   ) : (
                       <img
                         src={photos[selectedPhotoIndex].media_url}
                         alt="Fullscreen view"
                         className="w-auto h-auto max-w-full max-h-[90vh] object-contain shadow-2xl rounded-sm"
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
    <div className="flex items-center justify-center min-h-[80vh] bg-background">
      <div className="w-full max-w-md p-8 bg-card rounded-xl shadow-lg border m-4">
        <h1 className="text-3xl font-bold font-heading text-center mb-2">Private Session</h1>
        <p className="text-center text-muted-foreground mb-8">
          Please enter the password provided by your photographer to view this gallery.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 rounded-lg border bg-background focus:ring-2 focus:ring-primary focus:outline-none transition-all"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 text-red-500 text-sm text-center rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 text-lg"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Access Gallery'}
          </Button>
        </form>
      </div>
    </div>
  )
}
