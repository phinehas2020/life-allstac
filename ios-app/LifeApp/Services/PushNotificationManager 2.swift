//
//  PushNotificationManager.swift
//  LifeApp
//
//  Push notification registration and handling
//

import Foundation
import UserNotifications
import UIKit

@MainActor
class PushNotificationManager: ObservableObject {
    static let shared = PushNotificationManager()

    @Published var isAuthorized = false
    @Published var deviceToken: String?

    private init() {
        checkAuthorizationStatus()
    }

    // MARK: - Registration
    func requestAuthorization() async -> Bool {
        let center = UNUserNotificationCenter.current()

        do {
            let granted = try await center.requestAuthorization(
                options: [.alert, .sound, .badge]
            )

            isAuthorized = granted

            if granted {
                await registerForRemoteNotifications()
                setupNotificationCategories()
            }

            return granted
        } catch {
            print("❌ [Push] Failed to request authorization: \(error)")
            isAuthorized = false
            return false
        }
    }

    private func registerForRemoteNotifications() async {
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    func didRegisterForRemoteNotifications(deviceToken: Data) {
        let tokenString = deviceToken.map {
            String(format: "%02.2hhx", $0)
        }.joined()

        self.deviceToken = tokenString
        print("📱 [Push] Device token: \(tokenString)")

        // Send device token to backend
        Task {
            await sendDeviceTokenToServer(token: tokenString)
        }
    }

    func didFailToRegisterForRemoteNotifications(error: Error) {
        print("❌ [Push] Failed to register: \(error)")
        ToastManager.shared.error("Failed to enable notifications")
    }

    // MARK: - Server Registration
    private func sendDeviceTokenToServer(token: String) async {
        guard AuthTokenManager.shared.getAccessToken() != nil else {
            print("⚠️ [Push] User not logged in, skipping token registration")
            return
        }

        // Note: This would need to be implemented in ApiService
        // POST /api/push/register with device token
        print("📡 [Push] Sending device token to server: \(token)")
    }

    // MARK: - Notification Handling
    func handleNotification(userInfo: [AnyHashable: Any]) {
        print("🔔 [Push] Received notification: \(userInfo)")

        // Parse notification data
        if let notification = parseNotification(userInfo: userInfo) {
            processNotification(notification)
        }
    }

    private func parseNotification(userInfo: [AnyHashable: Any]) -> LifeNotification? {
        guard let notificationData = userInfo["notification"] as? [String: Any],
              let id = notificationData["id"] as? String,
              let typeString = notificationData["type"] as? String,
              let type = NotificationType(rawValue: typeString) else {
            return nil
        }

        var notification = LifeNotification(
            id: id,
            userId: notificationData["userId"] as? String ?? "",
            actorId: notificationData["actorId"] as? String ?? "",
            type: type,
            resourceId: notificationData["resourceId"] as? String,
            content: notificationData["content"] as? String,
            isRead: notificationData["isRead"] as? Bool ?? false,
            createdAt: notificationData["createdAt"] as? String ?? "",
            actor: nil
        )

        // Parse actor if present
        if let actorData = notificationData["actor"] as? [String: Any],
           let actorId = actorData["id"] as? String {
            notification = LifeNotification(
                id: id,
                userId: notification.userId,
                actorId: actorId,
                type: type,
                resourceId: notification.resourceId,
                content: notification.content,
                isRead: notification.isRead,
                createdAt: notification.createdAt,
                actor: User(
                    id: actorId,
                    username: actorData["username"] as? String,
                    email: actorData["email"] as? String,
                    avatar_url: actorData["avatarUrl"] as? String,
                    bio: nil,
                    photographer_status: nil,
                    photographer_influence: nil,
                    photographer_total_ratings: nil,
                    photographer_accuracy_percentage: nil,
                    is_admin: nil,
                    created_at: actorData["createdAt"] as? String ?? ""
                )
            )
        }

        return notification
    }

    private func processNotification(_ notification: LifeNotification) {
        // Mark as read
        Task {
            do {
                try await ApiService.shared.markNotificationsAsRead(ids: [notification.id])
            } catch {
                print("❌ [Push] Failed to mark notification as read: \(error)")
            }
        }

        // Update badge
        UIApplication.shared.applicationIconBadgeNumber = max(0, UIApplication.shared.applicationIconBadgeNumber - 1)

        // Show in-app alert
        switch notification.type {
        case .like:
            ToastManager.shared.success("\(notification.displayName) liked your post!")
        case .comment:
            ToastManager.shared.info("\(notification.displayName) commented on your post")
        case .follow:
            ToastManager.shared.info("\(notification.displayName) started following you")
        case .message:
            ToastManager.shared.info("New message from \(notification.displayName)")
        }

        // Trigger navigation to relevant content
        // This would typically be handled by a navigation coordinator
        if let resourceId = notification.resourceId {
            switch notification.type {
            case .like, .comment:
                // Navigate to post
                print("🔔 [Push] Would navigate to post: \(resourceId)")
            case .follow:
                // Navigate to profile
                print("🔔 [Push] Would navigate to profile: \(notification.actorId)")
            case .message:
                // Navigate to messages
                print("🔔 [Push] Would navigate to messages")
            }
        }
    }

    // MARK: - Helper Methods
    private func checkAuthorizationStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                self.isAuthorized = settings.authorizationStatus == .authorized
            }
        }
    }

    private func setupNotificationCategories() {
        let likeAction = UNNotificationAction(
            identifier: "VIEW_POST_ACTION",
            title: "View Post",
            options: .foreground
        )

        let followAction = UNNotificationAction(
            identifier: "FOLLOW_BACK_ACTION",
            title: "Follow Back",
            options: .foreground
        )

        let messageAction = UNNotificationAction(
            identifier: "REPLY_MESSAGE_ACTION",
            title: "Reply",
            options: .foreground
        )

        let likeCategory = UNNotificationCategory(
            identifier: "LIKE_CATEGORY",
            actions: [likeAction],
            intentIdentifiers: []
        )

        let followCategory = UNNotificationCategory(
            identifier: "FOLLOW_CATEGORY",
            actions: [followAction],
            intentIdentifiers: []
        )

        let messageCategory = UNNotificationCategory(
            identifier: "MESSAGE_CATEGORY",
            actions: [messageAction],
            intentIdentifiers: []
        )

        UNUserNotificationCenter.current().setNotificationCategories([
            likeCategory,
            followCategory,
            messageCategory
        ])
    }
}

// MARK: - UNUserNotificationCenterDelegate
class NotificationDelegate: NSObject, UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo

        // Handle action button taps
        if response.actionIdentifier == UNNotificationDefaultActionIdentifier {
            // User tapped the notification
            PushNotificationManager.shared.handleNotification(userInfo: userInfo)
        } else if response.actionIdentifier != UNNotificationDismissActionIdentifier {
            // User tapped an action button
            handleNotificationAction(actionIdentifier: response.actionIdentifier, userInfo: userInfo)
        }

        completionHandler()
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .sound, .badge])
    }

    private func handleNotificationAction(actionIdentifier: String, userInfo: [AnyHashable: Any]) {
        switch actionIdentifier {
        case "VIEW_POST_ACTION":
            // Navigate to post
            print("🔔 [Push] View post action")
        case "FOLLOW_BACK_ACTION":
            // Follow user back
            print("🔔 [Push] Follow back action")
        case "REPLY_MESSAGE_ACTION":
            // Open message thread
            print("🔔 [Push] Reply to message action")
        default:
            break
        }
    }
}
