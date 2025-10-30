//
//  LifeApp.swift
//  LifeApp
//
//  Created for Life iOS App
//

import SwiftUI

@main
struct LifeApp: App {
    @StateObject private var authManager = AuthenticationManager()
    
    init() {
        print("🚀 [LifeApp] App starting...")
        print("🚀 [LifeApp] SupabaseConfig will initialize...")
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
                .onAppear {
                    print("🚀 [LifeApp] ContentView appeared")
                    print("🚀 [LifeApp] Auth state: isAuthenticated = \(authManager.isAuthenticated)")
                }
        }
    }
}

