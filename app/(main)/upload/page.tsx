"use client"

import { useState, useEffect, useCallback, Suspense, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { UploadZone } from "@/components/upload-zone"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/lib/hooks/use-toast"
import { Loader2 } from "lucide-react"
import type { Event, Session } from "@/lib/types/database"
import imageCompression from 'browser-image-compression';
import { encode } from 'blurhash';
import { Switch } from "@/components/ui/switch"

const generateBlurHash = async (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const hash = encode(imageData.data, imageData.width, imageData.height, 4, 4);
        resolve(hash);
      } else {
        resolve(null);
      }
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      resolve(null);
    };
  });
};

// Helper function to generate video thumbnail
const generateVideoThumbnail = (file: File): Promise<Blob | null> => {
  return new Promise((resolve) => {
    const video = document.createElement("video")
    video.preload = "metadata"
    video.onloadedmetadata = () => {
      // Seek to 1 second or 25% of duration if shorter
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
        console.error("Error generating thumbnail", e)
        resolve(null)
      }
    }

    video.onerror = () => {
      resolve(null)
    }

    video.src = URL.createObjectURL(file)
  })
}

function UploadPageContent() {
  const [files, setFiles] = useState<File[]>([])
  const [caption, setCaption] = useState("")
  const [tags, setTags] = useState("")
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState("")

  // Private Session State
  const [isPrivateSession, setIsPrivateSession] = useState(false)
  const [sessionTitle, setSessionTitle] = useState("")
  const [sessionPassword, setSessionPassword] = useState("")
  const [existingSessions, setExistingSessions] = useState<Session[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [createNewSession, setCreateNewSession] = useState(true)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()

  // Use a ref to track accumulated progress points to avoid stale closures in loop
  const progressPointsRef = useRef(0)

  const fetchEvents = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50) // Optimized: Limit to 50 recent events

    if (data && !error) {
      setEvents(data)
      
      // Pre-select event from URL parameter
      const preSelectedEventId = searchParams.get("event")
      if (preSelectedEventId && data.some((e: any) => e.id === preSelectedEventId)) {
        setSelectedEvents([preSelectedEventId])
      }
    }
  }, [supabase, searchParams])

  const fetchSessions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq('photographer_id', user.id)
      .order("created_at", { ascending: false })

    if (data && !error) {
      setExistingSessions(data)
    }
  }, [supabase])

  useEffect(() => {
    fetchEvents()
    if (isPrivateSession) {
      fetchSessions()
    }
  }, [fetchEvents, fetchSessions, isPrivateSession])

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles)
    // Reset progress when files change
    setUploadProgress(0)
    setUploadStatus("")
  }

  const handleEventToggle = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    )
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one file to upload",
        variant: "destructive",
      })
      return
    }

    if (isPrivateSession) {
      if (createNewSession && (!sessionTitle || !sessionPassword)) {
        toast({
          title: "Error",
          description: "Session title and password are required",
          variant: "destructive"
        })
        return
      }
      if (!createNewSession && !selectedSessionId) {
        toast({
          title: "Error",
          description: "Please select a session",
          variant: "destructive"
        })
        return
      }
    }

    setUploading(true)
    setUploadProgress(1) // Start with a small progress
    setUploadStatus("Preparing files...")
    progressPointsRef.current = 0

    // Total points = 100 * files.length
    // Each file: 20 points for compression/prep, 80 points for upload/save
    const totalPoints = files.length * 100

    const updateProgress = (pointsToAdd: number) => {
      progressPointsRef.current += pointsToAdd
      const percentage = Math.min((progressPointsRef.current / totalPoints) * 100, 100)
      setUploadProgress(percentage)
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to upload",
          variant: "destructive",
        })
        router.push("/login")
        return
      }

      let targetSessionId = selectedSessionId

      // Create session if needed
      if (isPrivateSession && createNewSession) {
        setUploadStatus("Creating session...")
        // We cast as 'any' because TypeScript might not pick up the new table immediately
        // or inference is tricky with generic clients sometimes
        const { data: sessionData, error: sessionError } = await (supabase as any)
          .from("sessions")
          .insert({
            photographer_id: user.id,
            title: sessionTitle,
            password_hash: sessionPassword // In real app, hash this!
          })
          .select()
          .single()

        if (sessionError) throw sessionError
        targetSessionId = (sessionData as any).id
      }

      setUploadStatus("Processing & Uploading...")

      const uploadPromises = files.map(async (file) => {
        let fileToUpload = file;
        let blurhash = null;

        // Determine file type
        const type = file.type.startsWith("video/") ? "video" : "image";

        if (type === "image") {
          try {
            // Generate blurhash before compression (better quality source)
            blurhash = await generateBlurHash(file);

            // Compress image
            const options = {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            };
            fileToUpload = await imageCompression(file, options);
          } catch (error) {
            console.error("Error compressing image:", error);
            // Fallback to original file
          }
        }

        // Step 1 Complete: Compression/Prep
        updateProgress(20)

        // Generate unique filename
        const fileExt = file.name.split(".").pop()
        const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = isPrivateSession ? `sessions/${fileName}` : `posts/${fileName}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("posts")
          .upload(filePath, fileToUpload)

        if (uploadError) {
          throw uploadError
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("posts")
          .getPublicUrl(filePath)

        let thumbnailPublicUrl = null

        // Generate thumbnail for video
        if (type === "video") {
            try {
                const thumbnailBlob = await generateVideoThumbnail(file)
                if (thumbnailBlob) {
                    const thumbFileName = `thumb-${fileName.replace(/\.[^/.]+$/, "")}.jpg`
                    const thumbFilePath = isPrivateSession ? `sessions/${thumbFileName}` : `posts/${thumbFileName}`

                    const { error: thumbError } = await supabase.storage
                        .from("posts")
                        .upload(thumbFilePath, thumbnailBlob)

                    if (!thumbError) {
                         const { data: { publicUrl: thumbUrl } } = supabase.storage
                            .from("posts")
                            .getPublicUrl(thumbFilePath)
                        thumbnailPublicUrl = thumbUrl
                    }
                }
            } catch (e) {
                console.error("Failed to generate/upload thumbnail", e)
            }
        }

        // Process tags and add event names as tags
        const tagsArray = tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
        
        // Add event names as tags
        const eventNames = events
          .filter((e: any) => selectedEvents.includes(e.id))
          .map((e: any) => e.name)
        
        const allTags = Array.from(new Set([...tagsArray, ...eventNames]))

        // Create post record
        const { data: postData, error: postError } = await supabase
          .from("posts")
          .insert({
            user_id: user.id,
            media_url: publicUrl,
            thumbnail_url: thumbnailPublicUrl,
            type,
            caption: isPrivateSession ? null : caption, // Private photos might not need caption or reuse same
            tags: isPrivateSession ? [] : allTags,
            blurhash,
            session_id: isPrivateSession ? targetSessionId : null
          } as any)
          .select()
          .single()

        if (postError) {
          throw postError
        }

        // Associate with events if any selected (only for public posts)
        if (!isPrivateSession && selectedEvents.length > 0 && postData) {
          const eventAssociations = selectedEvents.map((eventId) => ({
            post_id: (postData as any).id,
            event_id: eventId,
          }))

          const { error: eventError } = await supabase
            .from("post_events")
            .insert(eventAssociations as any)

          if (eventError) {
            console.error("Error associating with events:", eventError)
          }
        }

        // Step 2 Complete: Upload & Save
        updateProgress(80)

        return postData
      })

      await Promise.all(uploadPromises)

      if (isPrivateSession && targetSessionId) {
        toast({
          title: "Session Created",
          description: "Files uploaded to private session.",
        })
        // Show session link
        const sessionUrl = `${window.location.origin}/sessions/${targetSessionId}`
        // Maybe copy to clipboard?
        await navigator.clipboard.writeText(`View photos here: ${sessionUrl} \nPassword: ${sessionPassword || '(Use existing password)'}`)
        toast({
          title: "Link Copied",
          description: "Session link and password copied to clipboard!",
        })
      } else {
        toast({
          title: "Success",
          description: `Successfully uploaded ${files.length} ${files.length === 1 ? "file" : "files"}`,
        })
      }

      // Reset form and redirect
      setFiles([])
      setCaption("")
      setTags("")
      setSelectedEvents([])
      setUploadStatus("")
      setUploadProgress(0)

      if (!isPrivateSession) {
        router.push("/")
      } else {
        // Maybe redirect to the session page?
        // router.push(`/sessions/${targetSessionId}`)
      }
    } catch (error: any) {
      console.error("Upload error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      })
      setUploadStatus("Error")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload Media</CardTitle>
          <CardDescription>
            Share your moments with the community or create a private client session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          <div className="flex items-center space-x-2 mb-4 p-4 bg-muted/50 rounded-lg">
             <Switch
                id="private-mode"
                checked={isPrivateSession}
                onCheckedChange={setIsPrivateSession}
              />
              <Label htmlFor="private-mode" className="font-medium cursor-pointer">
                Private Session Mode
              </Label>
              <span className="text-xs text-muted-foreground ml-2">
                (Upload photos for clients protected by a password)
              </span>
          </div>

          <UploadZone onFilesSelected={handleFilesSelected} />

          {files.length > 0 && (
            <>
              {isPrivateSession ? (
                <div className="space-y-6 border-l-2 border-primary pl-4 ml-1">
                  <div className="flex space-x-4 mb-4">
                    <button
                      onClick={() => setCreateNewSession(true)}
                      className={`text-sm font-medium pb-1 border-b-2 transition-colors ${createNewSession ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                    >
                      Create New Session
                    </button>
                    {existingSessions.length > 0 && (
                      <button
                        onClick={() => setCreateNewSession(false)}
                        className={`text-sm font-medium pb-1 border-b-2 transition-colors ${!createNewSession ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
                      >
                        Add to Existing
                      </button>
                    )}
                  </div>

                  {createNewSession ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="sessionTitle">Session Title</Label>
                        <Input
                          id="sessionTitle"
                          placeholder="e.g. Smith Family Portraits"
                          value={sessionTitle}
                          onChange={(e) => setSessionTitle(e.target.value)}
                          disabled={uploading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sessionPassword">Access Password</Label>
                        <Input
                          id="sessionPassword"
                          type="text"
                          placeholder="Create a password for clients"
                          value={sessionPassword}
                          onChange={(e) => setSessionPassword(e.target.value)}
                          disabled={uploading}
                        />
                        <p className="text-xs text-muted-foreground">You will share this with your client.</p>
                      </div>
                    </>
                  ) : (
                     <div className="space-y-2">
                        <Label>Select Session</Label>
                        <select
                          className="w-full p-2 rounded-md border bg-background"
                          onChange={(e) => setSelectedSessionId(e.target.value)}
                          value={selectedSessionId || ""}
                          disabled={uploading}
                        >
                          <option value="">-- Select a session --</option>
                          {existingSessions.map(s => (
                            <option key={s.id} value={s.id}>{s.title} ({new Date(s.created_at).toLocaleDateString()})</option>
                          ))}
                        </select>
                     </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="caption">Caption</Label>
                    <Input
                      id="caption"
                      placeholder="Write a caption..."
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      disabled={uploading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      placeholder="nature, sunset, community..."
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      disabled={uploading}
                    />
                  </div>

                  {events.length > 0 && (
                    <div className="space-y-2">
                      <Label>Add to Events (optional)</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                        {events.map((event) => (
                          <label
                            key={event.id}
                            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={selectedEvents.includes(event.id)}
                              onChange={() => handleEventToggle(event.id)}
                              disabled={uploading}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm">{event.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-4">
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{uploadStatus || "Uploading..."}</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}

                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    `Upload ${files.length} ${files.length === 1 ? "File" : "Files"} ${isPrivateSession ? 'to Session' : ''}`
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Upload Media</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <UploadPageContent />
    </Suspense>
  )
}
