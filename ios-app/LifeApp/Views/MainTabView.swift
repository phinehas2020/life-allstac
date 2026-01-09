//
//  MainTabView.swift
//  LifeApp
//
//  Main navigation with gradient accent and modern styling
//

import SwiftUI
import UIKit

struct MainTabView: View {
    @State private var selection = 0
    @State private var showUploadSheet = false

    var body: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: $selection) {
                HomeView()
                    .tag(0)

                ExploreView()
                    .tag(1)

                // Placeholder for center button
                Color.clear
                    .tag(2)

                EventsView()
                    .tag(3)

                ProfileView()
                    .tag(4)
            }

            // Custom Tab Bar
            customTabBar
        }
        .sheet(isPresented: $showUploadSheet) {
            UploadView()
        }
        .onAppear {
            // Configure tab bar appearance (hide default)
            UITabBar.appearance().isHidden = true
        }
    }

    // MARK: - Custom Tab Bar
    private var customTabBar: some View {
        HStack(spacing: 0) {
            // Home
            tabButton(icon: "house.fill", label: "Home", tag: 0)

            // Explore
            tabButton(icon: "magnifyingglass", label: "Explore", tag: 1)

            // Center Upload Button
            uploadButton

            // Events
            tabButton(icon: "calendar", label: "Events", tag: 3)

            // Profile
            tabButton(icon: "person.fill", label: "Profile", tag: 4)
        }
        .padding(.horizontal, Theme.Spacing.md)
        .padding(.top, Theme.Spacing.md)
        .padding(.bottom, getSafeAreaBottom() + Theme.Spacing.sm)
        .background(
            Theme.surface
                .shadow(color: Color.black.opacity(0.06), radius: 20, x: 0, y: -8)
                .ignoresSafeArea(edges: .bottom)
        )
    }

    private func tabButton(icon: String, label: String, tag: Int) -> some View {
        Button(action: {
            withAnimation(.snappy) {
                selection = tag
            }
            HapticManager.selection()
        }) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 22))
                    .foregroundColor(selection == tag ? Theme.accent : Theme.secondaryText)
                    .scaleEffect(selection == tag ? 1.1 : 1.0)

                Text(label)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(selection == tag ? Theme.accent : Theme.secondaryText)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(PlainButtonStyle())
    }

    private var uploadButton: some View {
        Button(action: {
            HapticManager.impact(.medium)
            showUploadSheet = true
        }) {
            ZStack {
                // Gradient background
                Circle()
                    .fill(Theme.brandGradient)
                    .frame(width: 56, height: 56)
                    .shadow(color: Theme.accent.opacity(0.4), radius: 8, x: 0, y: 4)

                Image(systemName: "plus")
                    .font(.system(size: 24, weight: .semibold))
                    .foregroundColor(.white)
            }
        }
        .offset(y: -20)
    }

    private func getSafeAreaBottom() -> CGFloat {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first else {
            return 0
        }
        return window.safeAreaInsets.bottom
    }
}

// MARK: - Preview
struct MainTabView_Previews: PreviewProvider {
    static var previews: some View {
        MainTabView()
    }
}
