"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PhotographerBadge } from "@/components/photographer-badge"
import { Trophy, TrendingUp, Target, Award } from "lucide-react"
import type { User } from "@/lib/types/database"

export default function PhotographersLeaderboard() {
  const [photographers, setPhotographers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchPhotographers()
  }, [])

  const fetchPhotographers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("photographer_status", "approved")
        .order("photographer_influence", { ascending: false })
        .limit(50)

      if (data && !error) {
        setPhotographers(data)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center space-x-3">
          <Trophy className="w-8 h-8 text-amber-500" />
          <span>Photographer Leaderboard</span>
        </h1>
        <p className="text-gray-600">
          Top-rated photographers ranked by influence and accuracy
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Trophy className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{photographers.length}</p>
                <p className="text-sm text-gray-600">Active Photographers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Target className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {photographers.length > 0 
                    ? (photographers.reduce((sum, p) => sum + p.photographer_accuracy_percentage, 0) / photographers.length).toFixed(0)
                    : 0}%
                </p>
                <p className="text-sm text-gray-600">Avg Accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {photographers.reduce((sum, p) => sum + p.photographer_total_ratings, 0)}
                </p>
                <p className="text-sm text-gray-600">Total Ratings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Rankings</CardTitle>
          <CardDescription>
            Photographers sorted by influence score
          </CardDescription>
        </CardHeader>
        <CardContent>
          {photographers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No photographers yet</p>
          ) : (
            <div className="space-y-2">
              {photographers.map((photographer, index) => (
                <Link
                  key={photographer.id}
                  href={`/profile/${photographer.username}`}
                  className="block"
                >
                  <div className={`flex items-center justify-between p-4 rounded-lg border transition-colors hover:bg-gray-50 ${
                    index === 0 ? 'bg-amber-50 border-amber-200' :
                    index === 1 ? 'bg-gray-50 border-gray-300' :
                    index === 2 ? 'bg-orange-50 border-orange-200' : ''
                  }`}>
                    <div className="flex items-center space-x-4">
                      <div className={`text-2xl font-bold w-12 text-center ${
                        index === 0 ? 'text-amber-500' :
                        index === 1 ? 'text-gray-400' :
                        index === 2 ? 'text-orange-400' :
                        'text-gray-300'
                      }`}>
                        {index < 3 && <Trophy className="w-8 h-8 mx-auto" />}
                        {index >= 3 && `#${index + 1}`}
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-lg">
                        {photographer.username?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{photographer.username}</p>
                        <div className="mt-1">
                          <PhotographerBadge influence={photographer.photographer_influence} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div>
                        <p className="text-xl font-bold text-primary">
                          {photographer.photographer_influence.toFixed(2)}x
                        </p>
                        <p className="text-xs text-gray-500">Influence</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-green-600">
                          {photographer.photographer_accuracy_percentage.toFixed(0)}%
                        </p>
                        <p className="text-xs text-gray-500">Accuracy</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-blue-600">
                          {photographer.photographer_total_ratings}
                        </p>
                        <p className="text-xs text-gray-500">Ratings</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How Photographer Influence Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">Time-Weighted Ratings:</h4>
            <ul className="space-y-1 text-gray-600 ml-4">
              <li>• Rate within 2 hours: 1.5x influence bonus</li>
              <li>• Rate within 24 hours: 1.0x influence bonus</li>
              <li>• Rate within 3 days: 0.5x influence bonus</li>
              <li>• Late ratings: 0.2x influence bonus</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Accuracy Evaluation (after 7 days):</h4>
            <ul className="space-y-1 text-gray-600 ml-4">
              <li>• Exceptional (5 stars): Photo gets 50+ likes</li>
              <li>• High Quality (4 stars): 30-69 likes</li>
              <li>• Good (3 stars): 10-39 likes</li>
              <li>• Standard (2 stars): 3-14 likes</li>
              <li>• Low Quality (1 star): &lt;5 likes</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Influence Range:</h4>
            <p className="text-gray-600 ml-4">
              0.1x (minimum) to 5.0x (maximum) • Accurate early ratings increase influence • Inaccurate ratings decrease influence
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
