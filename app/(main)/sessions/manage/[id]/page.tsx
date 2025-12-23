"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useToast } from "@/lib/hooks/use-toast"
import { Loader2, ArrowLeft, Trash2, Save, GripVertical } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Post, Session } from "@/lib/types/database"
import { UploadZone } from "@/components/upload-zone"
import { useUpload } from "@/lib/context/upload-context"

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Sortable Item Component
function SortablePhoto({ photo, onDelete }: { photo: Post; onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: photo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative aspect-square bg-muted rounded-lg overflow-hidden border shadow-sm touch-none"
    >
      <div className="absolute inset-0">
        <Image
          src={photo.thumbnail_url || photo.media_url}
          alt={photo.caption || "Session photo"}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      </div>

      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 p-1.5 bg-black/50 hover:bg-black/70 rounded text-white cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-20"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Delete Button */}
      <button
        onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete(photo.id)
        }}
        className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-600 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer"
        title="Delete Photo"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* Order Badge */}
      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 rounded text-white text-xs font-mono z-10">
        #{photo.position !== undefined ? photo.position + 1 : "?"}
      </div>
    </div>
  )
}

export default function SessionManageDetailPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [session, setSession] = useState<Session | null>(null)
  const [photos, setPhotos] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const { startUpload, isUploading } = useUpload()

  // Track if we are currently uploading to this session to trigger refresh
  const [wasUploading, setWasUploading] = useState(false)

  const fetchSession = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !data) {
      toast({ title: "Error", description: "Session not found", variant: "destructive" })
      router.push("/sessions/manage")
      return
    }

    if ((data as any).photographer_id !== user.id) {
      toast({ title: "Error", description: "Unauthorized", variant: "destructive" })
      router.push("/sessions/manage")
      return
    }

    setSession(data as any)
  }, [id, router, supabase, toast])

  const fetchPhotos = useCallback(async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("session_id", id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching photos:", error)
      toast({ title: "Error", description: "Failed to load photos: " + error.message, variant: "destructive" })
    }

    if (data) {
      setPhotos(data)
    }
  }, [id, supabase, toast])

  useEffect(() => {
    if (isUploading) {
        setWasUploading(true)
    } else if (wasUploading) {
        // Upload finished, refresh photos
        fetchPhotos()
        setWasUploading(false)
    }
  }, [isUploading, wasUploading, fetchPhotos])

  useEffect(() => {
    const load = async () => {
        await fetchSession()
        await fetchPhotos()
        setLoading(false)
    }
    load()
  }, [fetchSession, fetchPhotos])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setPhotos((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over?.id)

        const newOrder = arrayMove(items, oldIndex, newIndex)

        // Update position numbers locally
        const updated = newOrder.map((photo, index) => ({
            ...photo,
            position: index
        }))

        setHasChanges(true)
        return updated
      })
    }
  }

  const saveOrder = async () => {
    setSaving(true)
    try {
        const updates = photos.map((p, index) => ({
            id: p.id,
            position: index
        }))

        const { error } = await supabase.rpc('update_posts_order', { updates } as any)

        if (error) throw error

        toast({ title: "Success", description: "Order saved successfully" })
        setHasChanges(false)
    } catch (error: any) {
        console.error("Save order error", error)
        toast({ title: "Error", description: "Failed to save order", variant: "destructive" })
    } finally {
        setSaving(false)
    }
  }

  const handleDelete = async (photoId: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) return

    try {
        const { error } = await supabase
            .from("posts")
            .delete()
            .eq("id", photoId)

        if (error) throw error

        setPhotos(prev => prev.filter(p => p.id !== photoId))
        toast({ title: "Deleted", description: "Photo removed from session" })
    } catch (e) {
        toast({ title: "Error", description: "Failed to delete photo", variant: "destructive" })
    }
  }

  const handleFilesSelected = (files: File[]) => {
      if (!session) return
      // Start upload
      startUpload(files, {
          isPrivate: true,
          sessionId: session.id,
          createNewSession: false,
          tags: [],
          caption: ""
      })
      toast({ title: "Uploading", description: "Photos are being added..." })
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8,
        },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>
  }

  if (!session) return null

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
         <div className="flex items-center gap-4">
            <Link href="/sessions/manage">
                <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold font-heading">{session.title}</h1>
                <p className="text-muted-foreground text-sm">Manage Photos • {photos.length} items</p>
            </div>
         </div>
         <div className="flex gap-2">
            {hasChanges && (
                <Button onClick={saveOrder} disabled={saving} className="animate-pulse">
                    {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                    Save New Order
                </Button>
            )}
         </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Upload Zone */}
          <div className="lg:col-span-1 space-y-4">
             <div className="bg-card p-6 rounded-lg border shadow-sm sticky top-24">
                <h2 className="font-semibold mb-4 text-lg">Add Photos</h2>
                <UploadZone onFilesSelected={handleFilesSelected} maxFiles={100} />
                <p className="text-xs text-muted-foreground mt-4">
                    New photos will be added to the session.
                    <br />
                    Drag photos in the grid to reorder them.
                </p>
             </div>
          </div>

          {/* Right: Photo Grid */}
          <div className="lg:col-span-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={photos.map(p => p.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {photos.map((photo) => (
                        <SortablePhoto key={photo.id} photo={photo} onDelete={handleDelete} />
                    ))}
                </div>
              </SortableContext>
            </DndContext>

            {photos.length === 0 && (
                <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                    No photos in this session yet. Upload some to get started.
                </div>
            )}
          </div>
       </div>
    </div>
  )
}
