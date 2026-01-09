"use client"

import { useEffect, useMemo, useRef, useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/lib/hooks/use-toast"
import type { DirectMessage, DirectMessageThread, User } from "@/lib/types/database"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { MessageCircle } from "lucide-react"

type ThreadWithProfiles = DirectMessageThread & {
  user_a_profile: Pick<User, "id" | "username" | "avatar_url"> | null
  user_b_profile: Pick<User, "id" | "username" | "avatar_url"> | null
}

function MessagesContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null)
  const [threads, setThreads] = useState<ThreadWithProfiles[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [selectedThreadId, threads]
  )

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      setLoading(false)
    }

    fetchUser()
  }, [supabase])

  const loadThreads = async (preferredThreadId?: string) => {
    const { data, error } = await supabase
      .from("dm_threads")
      .select(`
        id,
        user_a,
        user_b,
        created_at,
        user_a_profile:users!dm_threads_user_a_fkey(id, username, avatar_url),
        user_b_profile:users!dm_threads_user_b_fkey(id, username, avatar_url)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      toast({
        title: "Error",
        description: "Unable to load messages",
        variant: "destructive",
      })
      return
    }

    const threadData = (data || []) as ThreadWithProfiles[]
    setThreads(threadData)

    if (preferredThreadId) {
      setSelectedThreadId(preferredThreadId)
      return
    }

    if (!selectedThreadId && threadData.length > 0) {
      setSelectedThreadId(threadData[0].id)
    }
  }

  const loadMessages = async (threadId: string) => {
    const { data, error } = await supabase
      .from("dm_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })

    if (error) {
      toast({
        title: "Error",
        description: "Unable to load messages",
        variant: "destructive",
      })
      return
    }

    setMessages((data || []) as DirectMessage[])
  }

  const ensureThreadForUser = async (targetUserId: string) => {
    if (!currentUser || !targetUserId || targetUserId === currentUser.id) return

    const [userA, userB] = [currentUser.id, targetUserId].sort()

    const { data: existing } = await supabase
      .from("dm_threads")
      .select("id")
      .eq("user_a", userA)
      .eq("user_b", userB)
      .maybeSingle<DirectMessageThread>()

    if (existing?.id) {
      await loadThreads(existing.id)
      return
    }

    const { data: created, error } = await supabase
      .from("dm_threads")
      .insert({ user_a: userA, user_b: userB } as any)
      .select("id")
      .single()

    if (error) {
      toast({
        title: "Error",
        description: "Unable to start a new conversation",
        variant: "destructive",
      })
      return
    }

    await loadThreads((created as any).id)
  }

  useEffect(() => {
    if (!currentUser) return
    loadThreads()
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return
    const targetUserId = searchParams.get("user")
    if (!targetUserId) return
    ensureThreadForUser(targetUserId)
  }, [currentUser, searchParams])

  useEffect(() => {
    if (!selectedThreadId) return
    loadMessages(selectedThreadId)
  }, [selectedThreadId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const getOtherParticipant = (thread: ThreadWithProfiles) => {
    if (!currentUser) return null
    return thread.user_a === currentUser.id ? thread.user_b_profile : thread.user_a_profile
  }

  const handleSend = async () => {
    if (!currentUser || !selectedThreadId || !draft.trim()) return
    setSending(true)

    const { data, error } = await supabase
      .from("dm_messages")
      .insert({
        thread_id: selectedThreadId,
        sender_id: currentUser.id,
        body: draft.trim(),
      } as any)
      .select("*")
      .single()

    if (error) {
      toast({
        title: "Error",
        description: "Message failed to send",
        variant: "destructive",
      })
      setSending(false)
      return
    }

    setMessages((prev) => [...prev, data as DirectMessage])
    setDraft("")
    setSending(false)
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="h-8 w-32 bg-muted/60 rounded-full animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">
          <div className="h-96 bg-muted/40 rounded-2xl animate-pulse" />
          <div className="h-96 bg-muted/40 rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto" />
        <h1 className="text-3xl font-bold text-primary">Sign in to message</h1>
        <p className="text-muted-foreground">Create conversations and send direct messages to other users.</p>
        <Link href="/login">
          <Button className="rounded-full">Sign in</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold font-heading text-primary">Messages</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6">
        <Card className="h-[70vh] overflow-hidden">
          <CardContent className="p-4 space-y-2 overflow-y-auto h-full">
            {threads.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-12">
                No conversations yet.
              </div>
            ) : (
              threads.map((thread) => {
                const other = getOtherParticipant(thread)
                const isActive = thread.id === selectedThreadId
                return (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                      isActive ? "bg-secondary" : "hover:bg-secondary/50"
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={other?.avatar_url || undefined} />
                      <AvatarFallback>
                        {other?.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {other?.username || "Unknown user"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        Tap to view conversation
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col h-[70vh]">
          <CardContent className="flex-1 flex flex-col p-4">
            {!selectedThread ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Select a conversation to start messaging.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b pb-3 mb-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={getOtherParticipant(selectedThread)?.avatar_url || undefined} />
                    <AvatarFallback>
                      {getOtherParticipant(selectedThread)?.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {getOtherParticipant(selectedThread)?.username || "Unknown user"}
                    </p>
                    <p className="text-xs text-muted-foreground">Direct messages</p>
                  </div>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                  {messages.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-10">
                      No messages yet. Start the conversation below.
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isSender = message.sender_id === currentUser.id
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isSender ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                              isSender
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-foreground"
                            }`}
                          >
                            <p>{message.body}</p>
                            <span className="block text-[10px] opacity-70 mt-1">
                              {new Date(message.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={bottomRef} />
                </div>
                <div className="pt-4 border-t mt-4">
                  <div className="flex flex-col gap-3">
                    <Textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Write a message..."
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSend}
                        disabled={sending || !draft.trim()}
                        className="rounded-full"
                      >
                        {sending ? "Sending..." : "Send message"}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-8">Loading messages...</div>}>
      <MessagesContent />
    </Suspense>
  )
}
