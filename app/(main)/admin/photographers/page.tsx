"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X, Camera, TrendingUp } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/lib/hooks/use-toast"
import { PhotographerBadge } from "@/components/photographer-badge"
import type { Database, User } from "@/lib/types/database"
import Link from "next/link"

export default function PhotographersAdminPage() {
  const [pendingApplicants, setPendingApplicants] = useState<User[]>([])
  const [approvedPhotographers, setApprovedPhotographers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle<Pick<User, "is_admin">>()
      
      if (data?.is_admin) {
        setIsAdmin(true)
        fetchApplications()
      } else {
        setLoading(false)
      }
    }
  }

  const fetchApplications = async () => {
    setLoading(true)
    try {
      // Get pending applications
      const { data: pending } = await supabase
        .from("users")
        .select("*")
        .eq("photographer_status", "pending")
        .order("photographer_applied_at", { ascending: false })

      if (pending) {
        setPendingApplicants(pending)
      }

      // Get approved photographers
      const { data: approved } = await supabase
        .from("users")
        .select("*")
        .eq("photographer_status", "approved")
        .order("photographer_influence", { ascending: false })
        .limit(20)

      if (approved) {
        setApprovedPhotographers(approved)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId: string) => {
    const updates: Database["public"]["Tables"]["users"]["Update"] = {
      photographer_status: "approved",
      photographer_approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from<Database["public"]["Tables"]["users"]["Row"]>("users")
      .update(updates)
      .eq("id", userId)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to approve photographer",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Approved",
      description: "Photographer has been approved",
    })

    fetchApplications()
  }

  const handleDeny = async (userId: string) => {
    const updates: Database["public"]["Tables"]["users"]["Update"] = {
      photographer_status: "denied",
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from<Database["public"]["Tables"]["users"]["Row"]>("users")
      .update(updates)
      .eq("id", userId)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to deny application",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Denied",
      description: "Application has been denied",
    })

    fetchApplications()
  }

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-600">You must be an admin to view this page</p>
      </div>
    )
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
        <h1 className="text-3xl font-bold mb-2">Photographer Management</h1>
        <p className="text-gray-600">
          Approve or deny photographer applications
        </p>
      </div>

      {/* Pending Applications */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Pending Applications ({pendingApplicants.length})</CardTitle>
          <CardDescription>
            Review and approve photographers who can rate photos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingApplicants.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No pending applications</p>
          ) : (
            <div className="space-y-4">
              {pendingApplicants.map((applicant) => (
                <div
                  key={applicant.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-lg">
                      {applicant.username?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="font-semibold">{applicant.username}</p>
                      <p className="text-sm text-gray-500">{applicant.email}</p>
                      <p className="text-xs text-gray-400">
                        Applied {formatDistanceToNow(new Date(applicant.photographer_applied_at!), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link href={`/profile/${applicant.username}`} target="_blank">
                      <Button variant="outline" size="sm">
                        View Profile
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApprove(applicant.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeny(applicant.id)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Photographers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Photographers</CardTitle>
          <CardDescription>
            Current photographers ranked by influence
          </CardDescription>
        </CardHeader>
        <CardContent>
          {approvedPhotographers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No approved photographers yet</p>
          ) : (
            <div className="space-y-3">
              {approvedPhotographers.map((photographer, index) => (
                <div
                  key={photographer.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl font-bold text-gray-400 w-8">
                      #{index + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold">
                      {photographer.username?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <Link
                        href={`/profile/${photographer.username}`}
                        className="font-semibold hover:underline"
                      >
                        {photographer.username}
                      </Link>
                      <div className="flex items-center space-x-2 mt-1">
                        <PhotographerBadge
                          influence={photographer.photographer_influence}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      {photographer.photographer_influence.toFixed(1)}x
                    </p>
                    <p className="text-xs text-gray-500">
                      {photographer.photographer_accuracy_percentage.toFixed(0)}% accurate
                    </p>
                    <p className="text-xs text-gray-400">
                      {photographer.photographer_total_ratings} ratings
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
