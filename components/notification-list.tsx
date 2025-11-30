"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { NotificationItem } from "@/components/notification-item"
import { Loader2, BellOff } from "lucide-react"
import { type NotificationWithActor } from "@/lib/types/database"

export function NotificationList() {
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          actor:users!actor_id(*),
          resource:posts(*)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) {
        console.error("Error fetching notifications:", error)
      } else {
        const typedData = data as NotificationWithActor[]
        setNotifications(typedData)

        // Mark unread notifications as read
        const unreadIds = typedData
          .filter((n) => !n.is_read)
          .map((n) => n.id)

        if (unreadIds.length > 0) {
          await supabase
            .from("notifications")
            // @ts-ignore
            .update({ is_read: true })
            .in("id", unreadIds)
        }
      }
      setLoading(false)
    }

    fetchNotifications()

    // Real-time subscription
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
              // Re-fetch or append
               fetchNotifications()
          }
        )
        .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }

    const unsubscribe = setupSubscription()

    return () => {
      unsubscribe.then(unsub => unsub && unsub())
    }

  }, [supabase])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <BellOff className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">No notifications yet</h3>
        <p className="text-gray-500 mt-1 max-w-sm">
          When people like your posts or follow you, you&apos;ll see them here.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="divide-y divide-gray-100">
        {notifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}
      </div>
    </div>
  )
}
