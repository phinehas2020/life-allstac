"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/lib/hooks/use-toast"
import { Loader2, Trash2, Key, ExternalLink, Copy, Eye } from "lucide-react"
import Link from "next/link"

interface Session {
  id: string
  title: string
  created_at: string
  password_hash: string // We will display this as "Hidden" or allow overwrite
}

export default function SessionManagePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [newPassword, setNewPassword] = useState("")

  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  const fetchSessions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("photographer_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setSessions(data || [])
    } catch (error) {
      console.error("Error fetching sessions:", error)
      toast({
        title: "Error",
        description: "Failed to load sessions",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [supabase, router, toast])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this session? All photos in it will be deleted permanently.")) {
      return
    }

    setActionLoading(true)
    try {
      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("id", id)

      if (error) throw error

      setSessions(sessions.filter(s => s.id !== id))
      toast({
        title: "Success",
        description: "Session deleted successfully",
      })
    } catch (error: any) {
      console.error("Error deleting session:", error)
      toast({
        title: "Error",
        description: "Failed to delete session",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const openPasswordDialog = (session: Session) => {
    setSelectedSession(session)
    setNewPassword(session.password_hash || "") // Pre-fill with existing (it's plain text currently)
    setPasswordDialogOpen(true)
  }

  const handleUpdatePassword = async () => {
    if (!selectedSession || !newPassword) return

    setActionLoading(true)
    try {
      const { error } = await supabase
        .from("sessions")
        .update({ password_hash: newPassword })
        .eq("id", selectedSession.id)

      if (error) throw error

      setSessions(sessions.map(s =>
        s.id === selectedSession.id ? { ...s, password_hash: newPassword } : s
      ))

      toast({
        title: "Success",
        description: "Password updated successfully",
      })
      setPasswordDialogOpen(false)
    } catch (error: any) {
      console.error("Error updating password:", error)
      toast({
        title: "Error",
        description: "Failed to update password",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/sessions/${id}`
    navigator.clipboard.writeText(url)
    toast({
      title: "Copied",
      description: "Session link copied to clipboard",
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-3xl font-bold font-heading">My Sessions</h1>
           <p className="text-muted-foreground mt-1">Manage your private client galleries</p>
        </div>
        <Link href="/upload">
          <Button>Create New Session</Button>
        </Link>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>Link</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  You haven&apos;t created any private sessions yet.
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.title}</TableCell>
                  <TableCell>{new Date(session.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                       <span className="text-muted-foreground text-sm font-mono bg-muted px-2 py-0.5 rounded">
                         {session.password_hash}
                       </span>
                       <Button
                         variant="ghost"
                         size="icon"
                         className="h-6 w-6"
                         onClick={() => openPasswordDialog(session)}
                         title="Change Password"
                       >
                         <Key className="h-3 w-3" />
                       </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                       <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => copyLink(session.id)}
                        >
                          <Copy className="mr-1 h-3 w-3" />
                          Copy
                       </Button>
                       <Link href={`/sessions/${session.id}`} target="_blank">
                         <Button variant="ghost" size="icon" className="h-8 w-8">
                           <ExternalLink className="h-4 w-4" />
                         </Button>
                       </Link>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(session.id)}
                      disabled={actionLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Session Password</DialogTitle>
            <DialogDescription>
              Update the password for <strong>{selectedSession?.title}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdatePassword} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
