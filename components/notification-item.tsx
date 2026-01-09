"use client"

import { formatDistanceToNow } from "date-fns"
import { motion } from "framer-motion"
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
        return <Heart className="w-3.5 h-3.5 text-red-500 fill-current" />
      case "comment":
        return <MessageCircle className="w-3.5 h-3.5 text-blue-500 fill-current" />
      case "follow":
        return <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
      default:
        return <FileQuestion className="w-3.5 h-3.5 text-gray-400" />
    }
  }

  const getIconBg = () => {
    switch (type) {
      case "like":
        return "bg-red-50"
      case "comment":
        return "bg-blue-50"
      case "follow":
        return "bg-emerald-50"
      default:
        return "bg-gray-50"
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
    <motion.div
      initial={!notification.is_read ? { backgroundColor: "rgba(239, 246, 255, 0.8)" } : {}}
      animate={{ backgroundColor: "rgba(255, 255, 255, 0)" }}
      transition={{ duration: 2, delay: 0.5 }}
    >
      <Link
        href={getLinkHref()}
        className={cn(
          "flex items-start gap-4 p-4 hover:bg-gray-50/80 transition-colors"
        )}
      >
        <div className="relative">
          <Avatar className="w-11 h-11 border-2 border-white shadow-sm">
            <AvatarImage src={actor.avatar_url || ""} alt={actor.username} />
            <AvatarFallback className="bg-gradient-to-br from-gray-100 to-gray-50 text-gray-600 font-semibold">
              {actor.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <motion.div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 rounded-full p-1.5 shadow-sm border-2 border-white",
              getIconBg()
            )}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.2 }}
          >
            {getIcon()}
          </motion.div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <p className="text-sm text-gray-900">
              <span className="font-bold text-gray-900">{actor.username}</span>{" "}
              <span className="text-gray-600">{getMessage()}</span>
            </p>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
            </span>
          </div>

          {getContentPreview()}

          {resource && (resource.thumbnail_url || resource.media_url) && (type === "like" || type === "comment") && (
            <div className="mt-2 w-14 h-14 rounded-lg overflow-hidden bg-gray-100 border shadow-sm">
              <img
                src={resource.type === 'video' ? (resource.thumbnail_url || resource.media_url) : resource.media_url}
                alt="Post thumbnail"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
