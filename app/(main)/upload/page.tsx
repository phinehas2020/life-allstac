"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { UploadZone } from "@/components/upload-zone"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/lib/hooks/use-toast"
import { Loader2 } from "lucide-react"
import type { Event } from "@/lib/types/database"

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [caption, setCaption] = useState("")
  const [tags, setTags] = useState("")
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [uploading, setUploading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false })

    if (data && !error) {
      setEvents(data)
      
      // Pre-select event from URL parameter
      const preSelectedEventId = searchParams.get("event")
      if (preSelectedEventId && data.some(e => e.id === preSelectedEventId)) {
        setSelectedEvents([preSelectedEventId])
      }
    }
  }, [supabase, searchParams])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles)
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

    setUploading(true)

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

      const uploadPromises = files.map(async (file) => {
        // Generate unique filename
        const fileExt = file.name.split(".").pop()
        const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `posts/${fileName}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("posts")
          .upload(filePath, file)

        if (uploadError) {
          throw uploadError
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("posts")
          .getPublicUrl(filePath)

        // Determine file type
        const type = file.type.startsWith("video/") ? "video" : "image"

        // Process tags and add event names as tags
        const tagsArray = tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
        
        // Add event names as tags automatically
        const eventNames = events
          .filter(e => selectedEvents.includes(e.id))
          .map(e => e.name)
        
        const allTags = [...new Set([...tagsArray, ...eventNames])]

        // Create post record
        const { data: postData, error: postError } = await supabase
          .from("posts")
          .insert({
            user_id: user.id,
            media_url: publicUrl,
            type,
            caption,
            tags: allTags,
          } as any)
          .select()
          .single()

        if (postError) {
          throw postError
        }

        // Associate with events if any selected
        if (selectedEvents.length > 0 && postData) {
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

        return postData
      })

      await Promise.all(uploadPromises)

      toast({
        title: "Success",
        description: `Successfully uploaded ${files.length} ${files.length === 1 ? "file" : "files"}`,
      })

      // Reset form and redirect
      setFiles([])
      setCaption("")
      setTags("")
      setSelectedEvents([])
      router.push("/")
    } catch (error: any) {
      console.error("Upload error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to upload files",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload Photos & Videos</CardTitle>
          <CardDescription>
            Share your moments with the community
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <UploadZone onFilesSelected={handleFilesSelected} />

          {files.length > 0 && (
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
                <p className="text-xs text-muted-foreground">
                  Note: Event names will be automatically added as tags
                </p>
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
                  `Upload ${files.length} ${files.length === 1 ? "File" : "Files"}`
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}