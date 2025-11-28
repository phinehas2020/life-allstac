import Link from "next/link"
import Image from "next/image"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { formatDistanceToNow, format } from "date-fns"
import type { User } from "@/lib/types/database"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, ChevronLeft, ChevronRight, User as UserIcon } from "lucide-react"

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string }
}) {
  const supabase = await createServerSupabaseClient()
  const page = Number(searchParams.page) || 1
  const query = searchParams.q || ""
  const pageSize = 20
  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  // Build query
  let dbQuery = supabase
    .from("users")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(start, end)

  if (query) {
    dbQuery = dbQuery.or(`username.ilike.%${query}%,email.ilike.%${query}%`)
  }

  const { data, count, error } = await dbQuery
  const users = data as User[] | null

  if (error) {
    console.error("Error fetching users:", error)
  }

  const totalPages = count ? Math.ceil(count / pageSize) : 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage and view all registered users
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>User Directory</CardTitle>
            <form className="flex w-full max-w-sm items-center space-x-2">
              <Input
                type="search"
                name="q"
                placeholder="Search users..."
                defaultValue={query}
                className="h-8"
              />
              <Button type="submit" size="sm" variant="secondary">
                <Search className="h-4 w-4" />
                <span className="sr-only">Search</span>
              </Button>
            </form>
          </div>
          <CardDescription>
            Total users: {count?.toLocaleString() ?? 0}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">User</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="h-10 w-10 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                      {user.avatar_url ? (
                        <Image
                          src={user.avatar_url}
                          alt={user.username || "User"}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {user.username}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.is_admin && (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
                          Admin
                        </span>
                      )}
                      {user.photographer_status === "approved" && (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                          Photographer
                        </span>
                      )}
                      {!user.is_admin && !user.photographer_status && (
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-muted text-muted-foreground">
                          Member
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {format(new Date(user.created_at), "MMM d, yyyy")}
                    <div className="text-xs">
                        {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/profile/${user.username}`}>
                        <Button variant="ghost" size="sm">
                            View Profile
                        </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-4">
              <Link
                href={{
                    pathname: '/admin/users',
                    query: { ...searchParams, page: Math.max(1, page - 1) }
                }}
                className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              >
                <Button variant="outline" size="icon" disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="text-sm font-medium">
                Page {page} of {totalPages}
              </div>
              <Link
                href={{
                    pathname: '/admin/users',
                    query: { ...searchParams, page: Math.min(totalPages, page + 1) }
                }}
                className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
              >
                <Button variant="outline" size="icon" disabled={page >= totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
