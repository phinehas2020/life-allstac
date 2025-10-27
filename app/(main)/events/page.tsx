"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Users, Image as ImageIcon, Plus, Edit, Trash2 } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { useToast } from "@/lib/hooks/use-toast"
import type { Event, User } from "@/lib/types/database"

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
  })
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchCurrentUser()
    fetchEvents()
  }, [])

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single()
      
      if (data) {
        setCurrentUser(data)
      }
    }
  }

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("events")
        .select(`
          *,
          post_events(count),
          event_follows(count)
        `)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching events:", error)
        return
      }

      if (data) {
        setEvents(data)
      }
    } finally {
      setLoading(false)
    }
  }

  const createSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-")
      .trim()
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentUser?.is_admin) {
      toast({
        title: "Unauthorized",
        description: "Only admins can create events",
        variant: "destructive",
      })
      return
    }

    try {
      const slug = createSlug(formData.name)
      
      const { data, error } = await supabase
        .from("events")
        .insert([{
          name: formData.name,
          slug,
          description: formData.description,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          created_by: currentUser.id,
        }] as any)
        .select()
        .single()

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Error",
            description: "An event with this name already exists",
            variant: "destructive",
          })
        } else {
          throw error
        }
        return
      }

      if (data) {
        setEvents((prev) => [data, ...prev])
        setShowCreateForm(false)
        setFormData({
          name: "",
          description: "",
          start_date: "",
          end_date: "",
        })
        toast({
          title: "Success",
          description: "Event created successfully",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create event",
        variant: "destructive",
      })
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!currentUser?.is_admin) return

    const confirmed = window.confirm("Are you sure you want to delete this event?")
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId)

      if (error) throw error

      setEvents((prev) => prev.filter((e) => e.id !== eventId))
      toast({
        title: "Success",
        description: "Event deleted successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete event",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Events</h1>
          <p className="text-gray-600">
            Browse and join community events
          </p>
        </div>
        {currentUser?.is_admin && (
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        )}
      </div>

      {showCreateForm && currentUser?.is_admin && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Event</CardTitle>
            <CardDescription>
              Create a new event for the community to share photos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Event Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Church Fair 2025"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Annual church fair with games, food, and fellowship"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false)
                    setFormData({
                      name: "",
                      description: "",
                      start_date: "",
                      end_date: "",
                    })
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Event</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <Link key={event.id} href={`/events/${event.slug}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{event.name}</CardTitle>
                  {event.is_featured && (
                    <span className="text-xs bg-primary text-white px-2 py-1 rounded">
                      Featured
                    </span>
                  )}
                </div>
                {event.description && (
                  <CardDescription>{event.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  {event.start_date && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(new Date(event.start_date), "PPP")}
                        {event.end_date && ` - ${format(new Date(event.end_date), "PPP")}`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center space-x-1">
                        <ImageIcon className="w-4 h-4" />
                        <span>{(event as any).post_events?.[0]?.count || 0} photos</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{(event as any).event_follows?.[0]?.count || 0} followers</span>
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
              {currentUser?.is_admin && (
                <CardFooter className="flex justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault()
                      // TODO: Implement edit functionality
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault()
                      handleDeleteEvent(event.id)
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardFooter>
              )}
            </Card>
          </Link>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No events created yet</p>
          {currentUser?.is_admin && (
            <p className="text-sm text-gray-400 mt-2">
              Click "Create Event" to add your first event
            </p>
          )}
        </div>
      )}
    </div>
  )
}