"use client"

import { formatDistanceToNow } from "date-fns"
import { Heart, MessageCircle, UserPlus, FileQuestion } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils/cn"
import type { NotificationWithActor } from "@/lib/types/database"

interface NotificationItemProps {
  notification: NotificationWithActor
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const { actor, type, resource, created_at, content } = notification

  const getIcon = () => {
    switch (type) {
      case "like":
        return <Heart className="w-4 h-4 text-red-500 fill-current" />
      case "comment":
        return <MessageCircle className="w-4 h-4 text-blue-500 fill-current" />
      case "follow":
        return <UserPlus className="w-4 h-4 text-green-500 fill-current" />
      default:
        return <FileQuestion className="w-4 h-4 text-gray-500" />
    }
  }

  const getMessage = () => {
    switch (type) {
      case "like":
        return "liked your post"
      case "comment":
        return "commented on your post"
      case "follow":
        return "started following you"
      default:
        return "interacted with you"
    }
  }

  const getContentPreview = () => {
    if (type === "comment" && content) {
      return <p className="text-sm text-gray-500 mt-1 line-clamp-1">&quot;{content}&quot;</p>
    }
    return null
  }

  const getLinkHref = () => {
    if (type === "follow") {
      return `/profile/${actor.username}`
    }
    if (resource && (type === "like" || type === "comment")) {
      return `/post/${resource.id}`
    }
    return "#"
  }

  return (
    <Link
      href={getLinkHref()}
      className={cn(
        "flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors border-b last:border-0",
        !notification.is_read && "bg-blue-50/50"
      )}
    >
      <div className="relative">
        <Avatar className="w-10 h-10 border">
          <AvatarImage src={actor.avatar_url || ""} alt={actor.username} />
          <AvatarFallback>{actor.username.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-gray-100">
          {getIcon()}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <p className="text-sm text-gray-900">
            <span className="font-semibold text-gray-900">{actor.username}</span>{" "}
            {getMessage()}
          </p>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
          </span>
        </div>

        {getContentPreview()}

        {resource && (resource.thumbnail_url || resource.media_url) && (type === "like" || type === "comment") && (
          <div className="mt-2 w-12 h-12 rounded-md overflow-hidden bg-gray-100 border relative">
             {/* Simple visual indicator of the post */}
            {resource.type === 'video' ? (
                <img
                    src={resource.thumbnail_url || resource.media_url}
                    alt="Post thumbnail"
                    className="w-full h-full object-cover"
                />
            ) : (
                <img
                    src={resource.media_url}
                    alt="Post thumbnail"
                    className="w-full h-full object-cover"
                />
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
