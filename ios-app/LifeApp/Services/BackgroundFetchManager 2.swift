//
//  BackgroundFetchManager.swift
//  LifeApp
//
//  Background fetch for notifications and content updates
//

import Foundation
import BackgroundTasks
import UserNotifications

@MainActor
class BackgroundFetchManager: ObservableObject {
    static let shared = BackgroundFetchManager()

    private let backgroundTaskIdentifier = "com.life.app.backgroundFetch"
    private let notificationsTaskIdentifier = "com.life.app.notificationsFetch"

    @Published var lastFetchDate: Date?
    @Published var unreadCount = 0

    private init() {}

    func registerBackgroundTasks() {
        // Register for background app refresh
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: backgroundTaskIdentifier,
            using: nil
        ) { [weak self] task in
            self?.handleBackgroundFetch(task: task as! BGAppRefreshTask)
        }

        // Register for scheduled notifications fetch
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: notificationsTaskIdentifier,
            using: nil
        ) { [weak self] task in
            self?.handleNotificationsFetch(task: task as! BGProcessingTask)
        }

        scheduleBackgroundFetch()
    }

    func scheduleBackgroundFetch() {
        let request = BGAppRefreshTaskRequest(identifier: backgroundTaskIdentifier)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60) // 15 minutes

        do {
            try BGTaskScheduler.shared.submit(request)
            print("🔄 [BackgroundFetch] Scheduled background fetch")
        } catch {
            print("❌ [BackgroundFetch] Failed to schedule: \(error)")
        }
    }

    func scheduleNotificationsFetch() {
        let request = BGProcessingTaskRequest(identifier: notificationsTaskIdentifier)
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = false

        do {
            try BGTaskScheduler.shared.submit(request)
            print("🔔 [BackgroundFetch] Scheduled notifications fetch")
        } catch {
            print("❌ [BackgroundFetch] Failed to schedule notifications: \(error)")
        }
    }

    private func handleBackgroundFetch(task: BGAppRefreshTask) {
        scheduleBackgroundFetch() // Schedule next fetch

        Task {
            await fetchNewContent()

            task.setTaskCompleted(success: true)
        }

        task.expirationHandler = {
            task.setTaskCompleted(success: false)
        }
    }

    private func handleNotificationsFetch(task: BGProcessingTask) {
        Task {
            await fetchNotifications()
            task.setTaskCompleted(success: true)
        }

        task.expirationHandler = {
            task.setTaskCompleted(success: false)
        }
    }

    private func fetchNewContent() async {
        guard AuthTokenManager.shared.getAccessToken() != nil else { return }

        do {
            let response = try await ApiService.shared.fetchPosts(limit: 10, page: 0)
            print("🔄 [BackgroundFetch] Fetched \(response.posts.count) new posts")

            // Update badge count with unread notifications
            await updateBadgeCount()

            lastFetchDate = Date()
        } catch {
            print("❌ [BackgroundFetch] Failed: \(error)")
        }
    }

    private func fetchNotifications() async {
        guard AuthTokenManager.shared.getAccessToken() != nil else { return }

        do {
            let response = try await ApiService.shared.fetchNotifications()
            let unread = response.notifications.filter { !$0.isRead }
            unreadCount = unread.count

            print("🔔 [BackgroundFetch] Found \(unreadCount) unread notifications")

            // Update badge
            await updateBadgeCount()

            // Schedule local notifications for important ones
            await scheduleLocalNotifications(for: unread.prefix(3))
        } catch {
            print("❌ [BackgroundFetch] Failed to fetch notifications: \(error)")
        }
    }

    private func updateBadgeCount() async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()

        guard settings.badgeSetting == .enabled else { return }

        do {
            let response = try await ApiService.shared.fetchNotifications()
            let unread = response.notifications.filter { !$0.isRead }
            unreadCount = unread.count

            await MainActor.run {
                UIApplication.shared.applicationIconBadgeNumber = unreadCount
            }
        } catch {
            print("❌ [BackgroundFetch] Failed to update badge: \(error)")
        }
    }

    private func scheduleLocalNotifications(for notifications: ArraySlice<LifeNotification>) async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()

        guard settings.authorizationStatus == .authorized else { return }

        for notification in notifications {
            let content = UNMutableNotificationContent()
            content.sound = .default
            content.badge = unreadCount

            switch notification.type {
            case .like:
                content.title = "New Like"
                content.body = notification.actor?.displayName ?? "Someone" + " liked your post"
            case .comment:
                content.title = "New Comment"
                content.body = notification.actor?.displayName ?? "Someone" + " commented on your post"
            case .follow:
                content.title = "New Follower"
                content.body = notification.actor?.displayName ?? "Someone" + " started following you"
            case .message:
                content.title = "New Message"
                content.body = notification.actor?.displayName ?? "Someone" + " sent you a message"
            }

            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
            let request = UNNotificationRequest(
                identifier: notification.id,
                content: content,
                trigger: trigger
            )

            try? await center.add(request)
        }
    }
}

// MARK: - User Notification Extension
extension LifeNotification {
    var displayName: String {
        actor?.username ?? actor?.email ?? "Someone"
    }
}
