//
//  ContentView.swift
//  LifeApp
//
//  Created for Life iOS App
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    
    var body: some View {
        Group {
            if authManager.isAuthenticated {
                MainTabView()
            } else {
                AuthView()
            }
        }
        .onAppear {
            print("🚀 [ContentView] Checking authentication status...")
            Task {
                await authManager.checkSession()
            }
        }
    }
}
