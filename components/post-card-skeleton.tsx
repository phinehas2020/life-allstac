"use client"

import { motion } from "framer-motion"

export function PostCardSkeleton() {
  return (
    <motion.div
      className="bg-card rounded-2xl overflow-hidden shadow-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Image placeholder with shimmer */}
      <div className="relative aspect-[4/5] bg-gray-100 overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer"
          style={{ backgroundSize: "200% 100%" }}
        />
      </div>

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* User info row */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded-full w-24 animate-pulse" />
            <div className="h-2 bg-gray-100 rounded-full w-16 animate-pulse" />
          </div>
        </div>

        {/* Caption lines */}
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded-full w-full animate-pulse" />
          <div className="h-3 bg-gray-200 rounded-full w-2/3 animate-pulse" />
        </div>

        {/* Tags */}
        <div className="flex gap-2 pt-1">
          <div className="h-5 bg-gray-100 rounded-full w-14 animate-pulse" />
          <div className="h-5 bg-gray-100 rounded-full w-16 animate-pulse" />
          <div className="h-5 bg-gray-100 rounded-full w-12 animate-pulse" />
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-border/40">
          <div className="flex items-center space-x-3">
            <div className="h-5 bg-gray-200 rounded w-12 animate-pulse" />
            <div className="h-5 bg-gray-200 rounded w-10 animate-pulse" />
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse" />
            <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
