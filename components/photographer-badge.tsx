import { Camera, Star } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface PhotographerBadgeProps {
  influence: number
  accuracy?: number
  className?: string
  showStats?: boolean
}

export function getPhotographerLevel(influence: number): {
  level: string
  color: string
  bgColor: string
} {
  if (influence >= 4.0) {
    return { level: "Master", color: "text-purple-600", bgColor: "bg-purple-100" }
  } else if (influence >= 3.0) {
    return { level: "Expert", color: "text-yellow-600", bgColor: "bg-yellow-100" }
  } else if (influence >= 2.0) {
    return { level: "Advanced", color: "text-blue-600", bgColor: "bg-blue-100" }
  } else if (influence >= 1.5) {
    return { level: "Intermediate", color: "text-green-600", bgColor: "bg-green-100" }
  } else {
    return { level: "Beginner", color: "text-gray-600", bgColor: "bg-gray-100" }
  }
}

export function PhotographerBadge({ 
  influence, 
  accuracy, 
  className,
  showStats = false 
}: PhotographerBadgeProps) {
  const { level, color, bgColor } = getPhotographerLevel(influence)

  if (showStats) {
    return (
      <div className={cn("inline-flex items-center space-x-2 px-3 py-1.5 rounded-full", bgColor, className)}>
        <Camera className={cn("w-4 h-4", color)} />
        <div className="flex flex-col">
          <span className={cn("text-xs font-bold", color)}>{level} Photographer</span>
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <span>Influence: {influence.toFixed(1)}x</span>
            {accuracy !== undefined && (
              <>
                <span>•</span>
                <span>Accuracy: {accuracy.toFixed(0)}%</span>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("inline-flex items-center space-x-1 px-2 py-1 rounded-full", bgColor, className)}>
      <Camera className={cn("w-3 h-3", color)} />
      <span className={cn("text-xs font-semibold", color)}>{level}</span>
    </div>
  )
}