//
//  MainTabView.swift
//  LifeApp
//
//  Main navigation with gradient accent and modern styling
//

import SwiftUI

struct MainTabView: View {
    @State private var selection = 0
    @State private var showUploadSheet = false

    init() {
        // Style the default tab bar
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(Theme.surface)
        appearance.shadowColor = UIColor.black.withAlphaComponent(0.1)

        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
        UITabBar.appearance().tintColor = UIColor(Theme.accent)
    }

    var body: some View {
        TabView(selection: $selection) {
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
                .tag(0)

            ExploreView()
                .tabItem {
                    Label("Explore", systemImage: "magnifyingglass")
                }
                .tag(1)

            // Upload tab - opens sheet instead
            Color.clear
                .tabItem {
                    Label("Upload", systemImage: "plus.circle.fill")
                }
                .tag(2)

            EventsView()
                .tabItem {
                    Label("Events", systemImage: "calendar")
                }
                .tag(3)

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.fill")
                }
                .tag(4)
        }
        .onChange(of: selection) { _, newValue in
            if newValue == 2 {
                // Reset to previous tab and show upload sheet
                HapticManager.impact(.medium)
                showUploadSheet = true
                // Go back to home after a short delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    selection = 0
                }
            }
        }
        .sheet(isPresented: $showUploadSheet) {
            UploadView()
        }
    }
}

// MARK: - Preview
struct MainTabView_Previews: PreviewProvider {
    static var previews: some View {
        MainTabView()
    }
}
