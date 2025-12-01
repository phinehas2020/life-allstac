//
//  MainTabView.swift
//  LifeApp
//
//  Main navigation for the app after login.
//

import SwiftUI
import UIKit

struct MainTabView: View {
    @State private var selection = 0

    // Theme colors
    private let cream = Color(red: 0.99, green: 0.98, blue: 0.96)
    private let navy = Color(red: 0.1, green: 0.1, blue: 0.25)

    var body: some View {
        TabView(selection: $selection) {
            HomeView()
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("Home")
                }
                .tag(0)

            ExploreView()
                .tabItem {
                    Image(systemName: "magnifyingglass")
                    Text("Explore")
                }
                .tag(1)

            // Middle upload button placeholder (optional)
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
        .accentColor(navy)
        .onAppear {
            // Configure tab bar appearance
            let appearance = UITabBarAppearance()
            appearance.configureWithOpaqueBackground()
            appearance.backgroundColor = UIColor(cream)

            UITabBar.appearance().standardAppearance = appearance
            if #available(iOS 15.0, *) {
                UITabBar.appearance().scrollEdgeAppearance = appearance
            }
        }
    }
}
