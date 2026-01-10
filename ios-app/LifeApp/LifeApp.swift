//
//  LifeApp.swift
//  LifeApp
//
//  Main app entry point with deep linking, background fetch, and push notifications
//

import SwiftUI
import UserNotifications

@main
struct LifeApp: App {
    @StateObject private var authManager = AuthenticationManager()
    @StateObject private var pushManager = PushNotificationManager.shared
    @StateObject private var deepLinkManager = DeepLinkManager.shared

    init() {
        print("🚀 [LifeApp] App starting...")
        print("🚀 [LifeApp] SupabaseConfig will initialize...")
        setupNotificationDelegate()
    }

    var body: some Scene {
        WindowGroup {
            SplashView()
                .environmentObject(authManager)
                .environmentObject(pushManager)
                .environmentObject(deepLinkManager)
                .toast()
                .onOpenURL { url in
                    DeepLinkManager.shared.handle(url: url)
                }
                .task {
                    // Request push notification authorization after a short delay
                    try? await Task.sleep(nanoseconds: 1_000_000_000)
                    _ = await PushNotificationManager.shared.requestAuthorization()
                }
        }
    }

    private func setupNotificationDelegate() {
        DispatchQueue.main.async {
            UNUserNotificationCenter.current().delegate = NotificationDelegate()
            BackgroundFetchManager.shared.registerBackgroundTasks()
        }
    }
}
