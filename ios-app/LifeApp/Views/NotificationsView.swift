//
//  NotificationsView.swift
//  LifeApp
//
//  View to display user notifications
//

import SwiftUI

struct NotificationsView: View {
    @StateObject private var viewModel = NotificationsViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            VStack(spacing: 0) {
                // Custom Header
                headerView

                if viewModel.isLoading && viewModel.notifications.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.notifications.isEmpty {
                    emptyStateView
                } else {
                    notificationsList
                }
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            Task {
                await viewModel.fetchNotifications()
            }
        }
        .onDisappear {
            // Mark all unfollowed/read as read when leaving
            Task {
                await viewModel.markAllAsRead()
            }
        }
    }

    // MARK: - Header
    private var headerView: some View {
        HStack {
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left")
                    .font(.title3.weight(.bold))
                    .foregroundColor(Theme.text)
                    .frame(width: 40, height: 40)
                    .background(Theme.surface)
                    .clipShape(Circle())
                    .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
            }

            Text("Notifications")
                .font(Theme.Fonts.heading(size: 24))
                .foregroundColor(Theme.text)
                .padding(.leading, Theme.Spacing.sm)

            Spacer()
        }
        .padding(.horizontal, Theme.Spacing.md)
        .padding(.top, Theme.Spacing.md)
        .padding(.bottom, Theme.Spacing.sm)
    }

    // MARK: - Notifications List
    private var notificationsList: some View {
        ScrollView {
            LazyVStack(spacing: 1) {
                ForEach(viewModel.notifications) { notification in
                    NotificationRow(notification: notification)
                        .background(Theme.surface)
                }
            }
            .padding(.top, Theme.Spacing.sm)
        }
        .refreshable {
            await viewModel.fetchNotifications()
        }
    }

    // MARK: - Empty State
    private var emptyStateView: some View {
        VStack(spacing: Theme.Spacing.lg) {
            Image(systemName: "bell.slash")
                .font(.system(size: 60))
                .foregroundColor(Theme.secondaryText.opacity(0.5))

            Text("No notifications yet")
                .font(Theme.Fonts.heading(size: 20))
                .foregroundColor(Theme.text)

            Text("When people like or comment on your posts, or follow you, you'll see them here.")
                .font(Theme.Fonts.body())
                .foregroundColor(Theme.secondaryText)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Notification Row
struct NotificationRow: View {
    let notification: LifeNotification

    var body: some View {
        HStack(spacing: Theme.Spacing.md) {
            // Actor Avatar
            if let avatarUrl = notification.actor?.avatar_url, let url = URL(string: avatarUrl) {
                AsyncImage(url: url) { image in
                    image.resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle().fill(Theme.subtleGradient)
                }
                .frame(width: 48, height: 48)
                .clipShape(Circle())
            } else {
                Circle()
                    .fill(Theme.subtleGradient)
                    .frame(width: 48, height: 48)
                    .overlay(
                        Text(notification.actor?.username?.prefix(1).uppercased() ?? "?")
                            .font(Theme.Fonts.label())
                            .foregroundColor(Theme.accent)
                    )
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(notification.actor?.username ?? "Someone")
                        .font(Theme.Fonts.label())
                        .foregroundColor(Theme.text)
                    
                    Text(notificationText)
                        .font(Theme.Fonts.body(size: 15))
                        .foregroundColor(Theme.secondaryText)
                }

                Text(timeAgo)
                    .font(Theme.Fonts.caption())
                    .foregroundColor(Theme.secondaryText.opacity(0.7))
            }

            Spacer()

            // Notification Type Icon
            notificationIcon
        }
        .padding(.horizontal, Theme.Spacing.md)
        .padding(.vertical, Theme.Spacing.md)
        .background(notification.isRead ? Color.clear : Theme.accent.opacity(0.03))
    }

    private var notificationText: String {
        switch notification.type {
        case .like:
            return "liked your post"
        case .comment:
            return "commented: \"\(notification.content ?? "")\""
        case .follow:
            return "started following you"
        case .message:
            return "sent you a message"
        }
    }

    private var notificationIcon: some View {
        Group {
            switch notification.type {
            case .like:
                Image(systemName: "heart.fill")
                    .foregroundColor(Theme.likeColor)
            case .comment:
                Image(systemName: "bubble.right.fill")
                    .foregroundColor(Theme.accentSecondary)
            case .follow:
                Image(systemName: "person.badge.plus.fill")
                    .foregroundColor(Theme.secondaryAccent)
            case .message:
                Image(systemName: "tray.fill")
                    .foregroundColor(Theme.accentSecondary)
            }
        }
        .font(.system(size: 14))
    }

    private var timeAgo: String {
        // Simple time ago formatter
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: notification.createdAt) else { return "" }
        
        let now = Date()
        let components = Calendar.current.dateComponents([.minute, .hour, .day], from: date, to: now)
        
        if let day = components.day, day > 0 {
            return "\(day)d ago"
        } else if let hour = components.hour, hour > 0 {
            return "\(hour)h ago"
        } else if let minute = components.minute, minute > 0 {
            return "\(minute)m ago"
        } else {
            return "Just now"
        }
    }
}

// MARK: - View Model
class NotificationsViewModel: ObservableObject {
    @Published var notifications: [LifeNotification] = []
    @Published var isLoading = false

    @MainActor
    func fetchNotifications() async {
        isLoading = true
        do {
            let response = try await ApiService.shared.fetchNotifications()
            withAnimation {
                self.notifications = response.notifications
            }
        } catch {
            print("❌ [Notifications] Error: \(error)")
        }
        isLoading = false
    }

    @MainActor
    func markAllAsRead() async {
        let unreadIds = notifications.filter { !$0.isRead }.map { $0.id }
        guard !unreadIds.isEmpty else { return }

        do {
            try await ApiService.shared.markNotificationsAsRead(ids: unreadIds)
            for i in 0..<notifications.count {
                if unreadIds.contains(notifications[i].id) {
                    notifications[i].isRead = true
                }
            }
        } catch {
            print("❌ [Notifications] Error marking as read: \(error)")
        }
    }
}
