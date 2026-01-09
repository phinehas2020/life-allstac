//
//  Theme.swift
//  LifeApp
//
//  Bold & Playful Design System
//

import SwiftUI

struct Theme {
    // MARK: - Core Colors
    static let background = Color(hex: "FAF9F6") // Warm cream
    static let text = Color(hex: "1A1A2E")       // Deep navy
    static let secondaryText = Color(hex: "6B7280") // Gray-500
    static let surface = Color.white
    static let surfaceElevated = Color.white

    // MARK: - Brand Gradient Colors (Bold & Playful)
    static let gradientStart = Color(hex: "E040A0")  // Vibrant pink/magenta
    static let gradientMid = Color(hex: "F5A623")     // Warm orange
    static let gradientEnd = Color(hex: "9B59B6")     // Rich purple

    // MARK: - Accent Colors
    static let accent = Color(hex: "E040A0")     // Primary accent (pink)
    static let accentSecondary = Color(hex: "F5A623") // Secondary accent (orange)
    static let secondaryAccent = Color(hex: "0F3460") // Blue for links

    // MARK: - Semantic Colors
    static let likeColor = Color(hex: "EF4444")  // Vibrant red for likes
    static let success = Color(hex: "10B981")    // Green
    static let warning = Color(hex: "F59E0B")    // Amber
    static let error = Color(hex: "EF4444")      // Red

    // MARK: - Gradient Definitions
    static var brandGradient: LinearGradient {
        LinearGradient(
            colors: [gradientStart, gradientMid, gradientEnd],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    static var subtleGradient: LinearGradient {
        LinearGradient(
            colors: [gradientStart.opacity(0.1), gradientEnd.opacity(0.1)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    static var cardGradient: LinearGradient {
        LinearGradient(
            colors: [Color.black.opacity(0), Color.black.opacity(0.3)],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    // MARK: - Shadows
    static func cardShadow(_ opacity: Double = 0.08) -> some View {
        return RoundedRectangle(cornerRadius: 24)
            .fill(Color.white)
            .shadow(color: Color.black.opacity(opacity), radius: 16, x: 0, y: 8)
    }

    // MARK: - Fonts
    struct Fonts {
        static func heading(size: CGFloat = 28) -> Font {
            return .system(size: size, weight: .bold, design: .rounded)
        }

        static func body(size: CGFloat = 16) -> Font {
            return .system(size: size, weight: .regular, design: .rounded)
        }

        static func caption(size: CGFloat = 12) -> Font {
            return .system(size: size, weight: .medium, design: .rounded)
        }

        static func label(size: CGFloat = 14) -> Font {
            return .system(size: size, weight: .semibold, design: .rounded)
        }
    }

    // MARK: - Spacing
    struct Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
    }

    // MARK: - Radii
    struct Radius {
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 24
        static let full: CGFloat = 9999
    }
}

// MARK: - Color Extension
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

// MARK: - View Modifiers
struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Theme.surface)
            .cornerRadius(Theme.Radius.xl)
            .shadow(color: Color.black.opacity(0.06), radius: 16, x: 0, y: 8)
    }
}

struct GradientButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.Fonts.label())
            .foregroundColor(.white)
            .padding(.horizontal, Theme.Spacing.lg)
            .padding(.vertical, Theme.Spacing.md)
            .background(Theme.brandGradient)
            .cornerRadius(Theme.Radius.full)
            .scaleEffect(configuration.isPressed ? 0.96 : 1.0)
            .animation(.spring(response: 0.2), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.Fonts.label())
            .foregroundColor(Theme.text)
            .padding(.horizontal, Theme.Spacing.lg)
            .padding(.vertical, Theme.Spacing.md)
            .background(Theme.background)
            .cornerRadius(Theme.Radius.full)
            .overlay(
                RoundedRectangle(cornerRadius: Theme.Radius.full)
                    .stroke(Color.gray.opacity(0.2), lineWidth: 1)
            )
            .scaleEffect(configuration.isPressed ? 0.96 : 1.0)
            .animation(.spring(response: 0.2), value: configuration.isPressed)
    }
}

// MARK: - View Extensions
extension View {
    func cardStyle() -> some View {
        modifier(CardStyle())
    }

    func gradientForeground() -> some View {
        self.overlay(Theme.brandGradient)
            .mask(self)
    }
}

// MARK: - Haptic Feedback
struct HapticManager {
    static func impact(_ style: UIImpactFeedbackGenerator.FeedbackStyle = .medium) {
        let generator = UIImpactFeedbackGenerator(style: style)
        generator.impactOccurred()
    }

    static func notification(_ type: UINotificationFeedbackGenerator.FeedbackType) {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(type)
    }

    static func selection() {
        let generator = UISelectionFeedbackGenerator()
        generator.selectionChanged()
    }
}

// MARK: - Spring Animations
extension Animation {
    static var bouncy: Animation {
        .spring(response: 0.35, dampingFraction: 0.6)
    }

    static var snappy: Animation {
        .spring(response: 0.25, dampingFraction: 0.8)
    }

    static var smooth: Animation {
        .spring(response: 0.4, dampingFraction: 0.9)
    }
}
