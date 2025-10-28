"use client"

import { useState } from "react"
import { Star, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { cn } from "@/lib/utils/cn"

interface PhotoRatingProps {
  postId: string
  photographerId: string
  photographerInfluence: number
  postCreatedAt: string
  existingRating?: number
  onRatingSubmitted?: () => void
}

const RATING_LABELS: Record<number, { label: string; description: string }> = {
  1: { label: "Low Quality", description: "Poor composition, lighting, or technical issues" },
  2: { label: "Standard", description: "Acceptable but not remarkable" },
  3: { label: "Good", description: "Well composed, good technical execution" },
  4: { label: "High Quality", description: "Excellent work, notable composition" },
  5: { label: "Exceptional", description: "Outstanding, gallery-worthy photography" },
}

export function PhotoRating({
  postId,
  photographerId,
  photographerInfluence,
  postCreatedAt,
  existingRating,
  onRatingSubmitted,
}: PhotoRatingProps) {
  const [selectedRating, setSelectedRating] = useState(existingRating || 0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const hoursSincePost = (Date.now() - new Date(postCreatedAt).getTime()) / (1000 * 60 * 60)
  
  let timeBonus = "0.2x"
  let timeMessage = "Late rating"
  if (hoursSincePost <= 2) {
    timeBonus = "1.5x"
    timeMessage = "Early bird bonus!"
  } else if (hoursSincePost <= 24) {
    timeBonus = "1.0x"
    timeMessage = "Good timing"
  } else if (hoursSincePost <= 72) {
    timeBonus = "0.5x"
    timeMessage = "Moderate bonus"
  }

  const handleSubmit = async () => {
    if (selectedRating === 0) return

    setSubmitting(true)
    try {
      const ratingLabelMap: Record<number, string> = {
        1: "low_quality",
        2: "standard",
        3: "good",
        4: "high_quality",
        5: "exceptional",
      }

      if (existingRating) {
        const { error } = await supabase
          .from("photo_ratings")
          .update({
            rating: selectedRating,
            rating_label: ratingLabelMap[selectedRating],
          } as any)
          .eq("user_id", photographerId)
          .eq("post_id", postId)

        if (error) {
          toast({
            title: "Error",
            description: "Failed to update rating",
            variant: "destructive",
          })
          return
        }
      } else {
        const { error } = await supabase
          .from("photo_ratings")
          .insert({
            user_id: photographerId,
            post_id: postId,
            rating: selectedRating,
            rating_label: ratingLabelMap[selectedRating],
          } as any)

        if (error) {
          toast({
            title: "Error",
            description: "Failed to submit rating",
            variant: "destructive",
          })
          return
        }
      }

      toast({
        title: "Rating submitted",
        description: `You rated this photo ${selectedRating} stars`,
      })

      if (onRatingSubmitted) {
        onRatingSubmitted()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const currentRating = hoveredRating || selectedRating

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-1 flex items-center space-x-2">
            <Star className="w-4 h-4" />
            <span>Rate This Photo</span>
          </h4>
          <p className="text-xs text-gray-500">
            Your influence: {photographerInfluence.toFixed(1)}x • {timeMessage} ({timeBonus})
          </p>
        </div>

        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => setSelectedRating(rating)}
              onMouseEnter={() => setHoveredRating(rating)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "w-8 h-8",
                  rating <= currentRating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                )}
              />
            </button>
          ))}
        </div>

        {currentRating > 0 && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="font-medium text-sm">{RATING_LABELS[currentRating].label}</p>
            <p className="text-xs text-gray-600 mt-1">
              {RATING_LABELS[currentRating].description}
            </p>
          </div>
        )}

        {hoursSincePost > 24 && hoursSincePost <= 168 && (
          <div className="flex items-center space-x-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
            <Clock className="w-3 h-3" />
            <span>This photo is {Math.floor(hoursSincePost / 24)} days old - lower time bonus</span>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={selectedRating === 0 || submitting}
          className="w-full"
          size="sm"
        >
          {submitting ? "Submitting..." : existingRating ? "Update Rating" : "Submit Rating"}
        </Button>

        {existingRating && (
          <p className="text-xs text-center text-gray-500">
            You can update your rating until it's evaluated (7 days)
          </p>
        )}
      </div>
    </Card>
  )
}