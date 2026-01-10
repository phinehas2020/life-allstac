//
//  LaunchScreen.swift
//  LifeApp
//
//  Modern animated launch screen
//

import SwiftUI

struct LaunchScreenView: View {
    @State private var isAnimating = false
    @State private var logoScale: CGFloat = 0.5
    @State private var showText = false

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Theme.gradientStart.opacity(0.1),
                    Theme.gradientMid.opacity(0.1),
                    Theme.gradientEnd.opacity(0.1)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            // Content
            VStack(spacing: Theme.Spacing.lg) {
                // Animated logo
                ZStack {
                    // Outer circle
                    Circle()
                        .stroke(
                            Theme.brandGradient,
                            lineWidth: 4
                        )
                        .frame(width: 120, height: 120)
                        .scaleEffect(isAnimating ? 1.0 : 0.8)
                        .opacity(isAnimating ? 1.0 : 0.0)

                    // Inner circle
                    Circle()
                        .fill(Theme.brandGradient)
                        .frame(width: 80, height: 80)
                        .scaleEffect(isAnimating ? 1.0 : 0.5)
                }
                .onAppear {
                    withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
                        isAnimating = true
                    }
                }

                // App name
                if showText {
                    Text("Life")
                        .font(Theme.Fonts.heading(size: 48))
                        .gradientForeground()
                        .scaleEffect(logoScale)
                        .transition(.scale.combined(with: .opacity))
                }

                // Tagline
                if showText {
                    Text("Capture Moments")
                        .font(Theme.Fonts.body())
                        .foregroundColor(Theme.secondaryText)
                        .opacity(0.7)
                        .transition(.opacity)
                }
            }
        }
        .onChange(of: isAnimating) { _, newValue in
            if newValue {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                        showText = true
                    }
                }

                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    withAnimation(.spring(response: 0.4, dampingFraction: 0.9)) {
                        logoScale = 1.0
                    }
                }
            }
        }
    }
}

struct SplashView: View {
    @State private var isActive = false

    var body: some View {
        if isActive {
            ContentView()
        } else {
            LaunchScreenView()
                .onAppear {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                        withAnimation {
                            isActive = true
                        }
                    }
                }
        }
    }
}

// MARK: - Preview
struct LaunchScreen_Previews: PreviewProvider {
    static var previews: some View {
        LaunchScreenView()
    }
}
