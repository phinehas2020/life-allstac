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
            // Corrected method name from checkSession to checkAuthenticationStatus
            authManager.checkAuthenticationStatus()
        }
    }
}

// MARK: - Main Tab View
// Defined here to be accessible without adding new files to Xcode project

struct MainTabView: View {
    @State private var selection = 0
    
    var body: some View {
        TabView(selection: $selection) {
            HomeView()
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("Home")
                }
                .tag(0)
            
            // Explore View (Simple placeholder if file not in project, checking...)
            // If ExploreView.swift is in project, fine. If not, use Text.
            // Assuming ExploreView exists from previous file list.
            ExploreView()
                .tabItem {
                    Image(systemName: "magnifyingglass")
                    Text("Explore")
                }
                .tag(1)
            
            Text("Upload")
                .tabItem {
                    Image(systemName: "plus.square.fill")
                    Text("Post")
                }
                .tag(2)
            
            EventsView()
                .tabItem {
                    Image(systemName: "calendar")
                    Text("Events")
                }
                .tag(3)

            ProfileView()
                .tabItem {
                    Image(systemName: "person.fill")
                    Text("Profile")
                }
                .tag(4)
        }
        .accentColor(Theme.secondaryAccent)
        .onAppear {
            let appearance = UITabBarAppearance()
            appearance.configureWithOpaqueBackground()
            appearance.backgroundColor = UIColor(Theme.background)

            UITabBar.appearance().standardAppearance = appearance
            if #available(iOS 15.0, *) {
                UITabBar.appearance().scrollEdgeAppearance = appearance
            }
        }
    }
}
