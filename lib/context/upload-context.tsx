"use client"

import React, { createContext, useContext, useState, useRef, ReactNode, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import imageCompression from 'browser-image-compression'
import { encode } from 'blurhash'

// Types
export interface UploadFile extends File {
  id: string // Temp ID for tracking
}

interface UploadTask {
  id: string
  file: File
  status: 'pending' | 'compressing' | 'uploading' | 'completed' | 'error'
  progress: number
  error?: string
  // Additional metadata
  isPrivate: boolean
  caption?: string
  tags?: string[]
  events?: string[]
  sessionId?: string
  sessionTitle?: string
  sessionPassword?: string
  userId?: string // We need user ID for filename generation usually, or fetch fresh
}

interface UploadContextType {
  activeUploads: UploadTask[]
  queue: UploadTask[]
  completedUploads: UploadTask[]
  startUpload: (files: File[], metadata: UploadMetadata) => void
  cancelUpload: (id: string) => void
  clearCompleted: () => void
  isUploading: boolean
  totalProgress: number
}

interface UploadMetadata {
  isPrivate: boolean
  caption?: string
  tags?: string[]
  selectedEvents?: string[]
  sessionId?: string
  sessionTitle?: string // For creating new
  sessionPassword?: string // For creating new
  createNewSession?: boolean
}

const UploadContext = createContext<UploadContextType | undefined>(undefined)

// Helper: Generate BlurHash (Main Thread - CPU Bound)
const generateBlurHash = async (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = document.createElement("img")
    img.src = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement("canvas")
      // Limit canvas size for performance
      const MAX_WIDTH = 64
      const scale = MAX_WIDTH / img.width
      canvas.width = MAX_WIDTH
      canvas.height = img.height * scale

      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const hash = encode(imageData.data, imageData.width, imageData.height, 4, 4)
        resolve(hash)
      } else {
        resolve(null)
      }
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
        URL.revokeObjectURL(img.src)
        resolve(null)
    }
  })
}

// Helper: Video Thumbnail
const generateVideoThumbnail = (file: File): Promise<Blob | null> => {
  return new Promise((resolve) => {
    const video = document.createElement("video")
    video.preload = "metadata"
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration * 0.25)
    }
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext("2d")
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          window.URL.revokeObjectURL(video.src)
          resolve(blob)
        }, "image/jpeg", 0.7)
      } catch (e) {
        resolve(null)
      }
    }
    video.onerror = () => resolve(null)
    video.src = URL.createObjectURL(file)
  })
}

const CONCURRENCY_LIMIT = 3

export function UploadProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<UploadTask[]>([])
  const [processing, setProcessing] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  // Derived state
  const activeUploads = tasks.filter(t => ['pending', 'compressing', 'uploading'].includes(t.status))
  const queue = tasks.filter(t => t.status === 'pending')
  const inProgress = tasks.filter(t => ['compressing', 'uploading'].includes(t.status))
  const completedUploads = tasks.filter(t => t.status === 'completed')
  const isUploading = activeUploads.length > 0

  // Calculate total progress
  const totalProgress = activeUploads.length === 0 ? 0 :
    activeUploads.reduce((acc, curr) => acc + curr.progress, 0) / activeUploads.length

  const startUpload = useCallback(async (files: File[], metadata: UploadMetadata) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to upload", variant: "destructive" })
      return
    }

    // If creating a new session, do it once first to get ID
    let targetSessionId = metadata.sessionId
    if (metadata.isPrivate && metadata.createNewSession && !targetSessionId) {
        try {
            // @ts-ignore
            const { data: sessionData, error } = await supabase.from("sessions").insert({
                photographer_id: user.id,
                title: metadata.sessionTitle,
                password_hash: metadata.sessionPassword
            }).select().single()

            if (error) throw error
            targetSessionId = (sessionData as any).id

            // Show toast for session creation
            toast({ title: "Session Created", description: "Session created successfully. Uploads starting..." })
        } catch (e: any) {
             toast({ title: "Error", description: "Failed to create session: " + e.message, variant: "destructive" })
             return
        }
    }

    const newTasks: UploadTask[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending',
      progress: 0,
      isPrivate: metadata.isPrivate,
      caption: metadata.caption,
      tags: metadata.tags,
      events: metadata.selectedEvents,
      sessionId: targetSessionId,
      userId: user.id
    }))

    setTasks(prev => [...prev, ...newTasks])
    setProcessing(true)
  }, [supabase, toast])

  const processQueue = useCallback(async () => {
    // If we have slots available and items in queue
    const currentInProgress = tasks.filter(t => ['compressing', 'uploading'].includes(t.status))
    const currentPending = tasks.filter(t => t.status === 'pending')

    if (currentInProgress.length < CONCURRENCY_LIMIT && currentPending.length > 0) {
      const slotsAvailable = CONCURRENCY_LIMIT - currentInProgress.length
      const toProcess = currentPending.slice(0, slotsAvailable)

      // Mark as compressing
      setTasks(prev => prev.map(t => toProcess.find(tp => tp.id === t.id) ? { ...t, status: 'compressing', progress: 5 } : t))

      // Trigger processing for each
      toProcess.forEach(task => processTask(task))
    }
  }, [tasks]) // tasks dependency ensures we re-evaluate when tasks change

  // Watch for changes and trigger queue processing
  useEffect(() => {
    if (processing && tasks.some(t => t.status === 'pending') && tasks.filter(t => ['compressing', 'uploading'].includes(t.status)).length < CONCURRENCY_LIMIT) {
        processQueue()
    } else if (processing && tasks.every(t => t.status === 'completed' || t.status === 'error')) {
        setProcessing(false)
        if (tasks.some(t => t.status === 'completed')) {
             toast({ title: "Uploads Completed", description: "All files have been processed." })
        }
    }
  }, [tasks, processing, processQueue, toast])


  const updateTaskStatus = (id: string, updates: Partial<UploadTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  const processTask = async (task: UploadTask) => {
    try {
        const { file, userId } = task
        let fileToUpload = file
        let blurhash = null
        const type = file.type.startsWith("video/") ? "video" : "image"

        // 1. Compression / Blurhash
        if (type === "image") {
            try {
                updateTaskStatus(task.id, { progress: 10 })
                blurhash = await generateBlurHash(file)
                updateTaskStatus(task.id, { progress: 20 })

                const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true }
                fileToUpload = await imageCompression(file, options)
                updateTaskStatus(task.id, { progress: 30 })
            } catch (e) {
                console.error("Compression failed", e)
            }
        } else {
             updateTaskStatus(task.id, { progress: 30 })
        }

        updateTaskStatus(task.id, { status: 'uploading' })

        // 2. Upload
        const fileExt = file.name.split(".").pop()
        const fileName = `${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = task.isPrivate ? `sessions/${fileName}` : `posts/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from("posts")
            .upload(filePath, fileToUpload)

        if (uploadError) throw uploadError
        updateTaskStatus(task.id, { progress: 60 })

        const { data: { publicUrl } } = supabase.storage.from("posts").getPublicUrl(filePath)
        let thumbnailPublicUrl = null

        // Video Thumbnail
        if (type === "video") {
             const thumbnailBlob = await generateVideoThumbnail(file)
             if (thumbnailBlob) {
                 const thumbPath = task.isPrivate ? `sessions/thumb-${fileName}.jpg` : `posts/thumb-${fileName}.jpg`
                 await supabase.storage.from("posts").upload(thumbPath, thumbnailBlob)
                 const { data: { publicUrl: tUrl } } = supabase.storage.from("posts").getPublicUrl(thumbPath)
                 thumbnailPublicUrl = tUrl
             }
        }
        updateTaskStatus(task.id, { progress: 80 })

        // 3. Database Insert
        // Process tags
        const tagsArray = task.tags ? task.tags.map(t => t.trim()).filter(Boolean) : []

        // @ts-ignore
        const { data: postData, error: postError } = await supabase.from("posts").insert({
            user_id: userId,
            media_url: publicUrl,
            thumbnail_url: thumbnailPublicUrl,
            type,
            caption: task.isPrivate ? null : task.caption,
            tags: task.isPrivate ? [] : tagsArray,
            blurhash,
            session_id: task.sessionId || null
        }).select().single()

        if (postError) throw postError

        // Event Association
        if (!task.isPrivate && task.events && task.events.length > 0 && postData) {
            const eventAssociations = task.events.map(eid => ({
                post_id: (postData as any).id,
                event_id: eid
            }))
             // @ts-ignore
            await supabase.from("post_events").insert(eventAssociations)
        }

        updateTaskStatus(task.id, { status: 'completed', progress: 100 })

    } catch (error: any) {
        console.error("Task failed", error)
        updateTaskStatus(task.id, { status: 'error', error: error.message || "Failed" })
        toast({ title: "Upload Error", description: `File ${task.file.name} failed: ${error.message}`, variant: "destructive" })
    }
  }

  const cancelUpload = (id: string) => {
    // We can't easily cancel promises, but we can remove from queue if pending
    setTasks(prev => prev.filter(t => t.id !== id || t.status !== 'pending'))
    // If uploading, we just let it fail or finish but remove from view?
    // For now, simple removal.
  }

  const clearCompleted = () => {
    setTasks(prev => prev.filter(t => t.status !== 'completed'))
  }

  return (
    <UploadContext.Provider value={{
      activeUploads,
      queue,
      completedUploads,
      startUpload,
      cancelUpload,
      clearCompleted,
      isUploading,
      totalProgress
    }}>
      {children}
    </UploadContext.Provider>
  )
}

export function useUpload() {
  const context = useContext(UploadContext)
  if (!context) throw new Error("useUpload must be used within UploadProvider")
  return context
}
