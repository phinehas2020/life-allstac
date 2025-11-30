import { NotificationList } from "@/components/notification-list"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Notifications | Life.Allstac",
  description: "View your latest notifications",
}

export default function NotificationsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold font-heading text-primary mb-6">Notifications</h1>
      <NotificationList />
    </div>
  )
}
