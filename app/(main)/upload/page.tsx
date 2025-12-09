"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { UploadZone } from "@/components/upload-zone"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/lib/hooks/use-toast"
import { Loader2 } from "lucide-react"
import type { Event, Session } from "@/lib/types/database"
import { Switch } from "@/components/ui/switch"
import { useUpload } from "@/lib/context/upload-context"

function UploadPageContent() {
  const [files, setFiles] = useState<File[]>([])
  const [caption, setCaption] = useState("")
  const [tags, setTags] = useState("")
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [events, setEvents] = useState<Event[]>([])

  // Use Global Upload Context
  const { startUpload, isUploading } = useUpload()

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

    // Process tags
    const tagsArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

    // Add event names as tags (to keep backward compatibility with how logic was)
    const eventNames = events
        .filter((e: any) => selectedEvents.includes(e.id))
        .map((e: any) => e.name)

    const allTags = Array.from(new Set([...tagsArray, ...eventNames]))


    // Trigger global upload
    startUpload(files, {
        isPrivate: isPrivateSession,
        caption,
        tags: allTags,
        selectedEvents: isPrivateSession ? [] : selectedEvents,
        sessionId: selectedSessionId || undefined,
        createNewSession,
        sessionTitle,
        sessionPassword
    })

    toast({
        title: "Upload Started",
        description: "Your files are uploading in the background."
    })

    // Reset Form
    setFiles([])
    setCaption("")
    setTags("")
    setSelectedEvents([])

    // Navigation logic:
    // If private session, we might want to stay here or go to manage sessions?
    // If public, go to home?
    // The previous logic redirected immediately after start, but since we are async now,
    // we can redirect immediately to home/dashboard and let the user see the progress toast.

    if (!isPrivateSession) {
        router.push("/")
    } else {
        // If it was a private session, maybe go to sessions list or stay
        router.push("/sessions/manage")
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

          <UploadZone
            onFilesSelected={handleFilesSelected}
            maxFiles={isPrivateSession ? 100 : 10}
          />

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
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      placeholder="nature, sunset, community..."
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
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
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full"
                  size="lg"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding to Queue...
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
