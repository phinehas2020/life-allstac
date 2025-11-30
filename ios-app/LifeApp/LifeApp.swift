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

// MARK: - Design System (Theme)
// Defined here to be accessible globally without adding new files to Xcode project

struct Theme {
    static let background = Color(hex: "FAF9F6") // Cream
    static let text = Color(hex: "1A1A2E")       // Navy
    static let secondaryText = Color(hex: "4A4A5E")
    static let accent = Color(hex: "E94560")     // Reddish Pink for accents
    static let secondaryAccent = Color(hex: "0F3460") // Blue
    static let surface = Color.white

    struct Fonts {
        static func heading(size: CGFloat = 28) -> Font {
            return .system(size: size, weight: .bold, design: .serif)
        }

        static func body(size: CGFloat = 16) -> Font {
            return .system(size: size, weight: .regular, design: .rounded)
        }

        static func caption(size: CGFloat = 12) -> Font {
            return .system(size: size, weight: .medium, design: .rounded)
        }
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
