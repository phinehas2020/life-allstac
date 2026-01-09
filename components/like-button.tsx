"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface LikeButtonProps {
  isLiked: boolean
  likeCount: number
  onLike: () => Promise<void>
  disabled?: boolean
  size?: "sm" | "default" | "lg"
}

export function LikeButton({
  isLiked,
  likeCount,
  onLike,
  disabled,
  size = "default",
}: LikeButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [particles, setParticles] = useState<number[]>([])
  const [displayCount, setDisplayCount] = useState(likeCount)

  // Sync displayCount when likeCount prop changes (after API update)
  if (displayCount !== likeCount && !isAnimating) {
    setDisplayCount(likeCount)
  }

  const handleClick = useCallback(async () => {
    if (disabled || isAnimating) return

    const wasLiked = isLiked

    if (!wasLiked) {
      // Trigger particle burst on like
      setIsAnimating(true)
      setParticles([...Array(6)].map((_, i) => i))

      setTimeout(() => {
        setParticles([])
        setIsAnimating(false)
      }, 700)
    }

    await onLike()
  }, [isLiked, onLike, disabled, isAnimating])

  const sizeClasses = {
    sm: { icon: "w-4 h-4", text: "text-xs", particle: "w-1.5 h-1.5", spread: 18 },
    default: { icon: "w-5 h-5", text: "text-sm", particle: "w-2 h-2", spread: 25 },
    lg: { icon: "w-6 h-6", text: "text-base", particle: "w-2.5 h-2.5", spread: 32 },
  }

  const currentSize = sizeClasses[size]

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="relative flex items-center space-x-1.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 rounded-lg px-1 -mx-1"
      aria-label={isLiked ? "Unlike post" : "Like post"}
    >
      {/* Particle burst effect */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <AnimatePresence>
          {particles.map((i) => (
            <motion.span
              key={i}
              className={cn(
                "absolute rounded-full bg-red-500",
                currentSize.particle
              )}
              initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
              animate={{
                scale: [0, 1.2, 0],
                x: Math.cos((i * 60 * Math.PI) / 180) * currentSize.spread,
                y: Math.sin((i * 60 * Math.PI) / 180) * currentSize.spread,
                opacity: [1, 1, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Ring burst effect */}
      <AnimatePresence>
        {isAnimating && (
          <motion.span
            className="absolute left-0 w-8 h-8 rounded-full border-2 border-red-400 pointer-events-none"
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ left: "calc(50% - 16px)", top: "calc(50% - 16px)" }}
          />
        )}
      </AnimatePresence>

      {/* Heart icon */}
      <motion.div
        animate={
          isAnimating
            ? {
                scale: [1, 1.35, 0.9, 1.1, 1],
                rotate: [0, -10, 10, -5, 0],
              }
            : { scale: 1, rotate: 0 }
        }
        transition={{
          duration: 0.5,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
        whileTap={{ scale: 0.9 }}
      >
        <Heart
          className={cn(
            "transition-colors duration-200",
            currentSize.icon,
            isLiked
              ? "fill-red-500 text-red-500"
              : "text-muted-foreground group-hover:text-red-400"
          )}
        />
      </motion.div>

      {/* Count with animated increment */}
      <div className="relative overflow-hidden h-5">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={likeCount}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "font-semibold tabular-nums block",
              currentSize.text,
              isLiked ? "text-red-500" : "text-muted-foreground"
            )}
          >
            {likeCount}
          </motion.span>
        </AnimatePresence>
      </div>
    </button>
  )
}
