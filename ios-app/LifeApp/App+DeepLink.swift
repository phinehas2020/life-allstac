//
//  App+DeepLink.swift
//  LifeApp
//
//  Deep linking and Universal Links support
//

import SwiftUI
import UIKit

enum DeepLink: Equatable {
    case post(id: String)
    case profile(username: String)
    case event(id: String)
    case unknown

    static func parse(url: URL) -> DeepLink? {
        // Universal Links: https://life.allstac.com/post/123
        if url.host == "life.allstac.com" {
            let pathComponents = url.pathComponents.filter { $0 != "/" }

            if pathComponents.count >= 2 {
                let type = pathComponents[0]
                let id = pathComponents[1]

                switch type {
                case "post":
                    return .post(id: id)
                case "u", "profile", "user":
                    return .profile(username: id)
                case "event":
                    return .event(id: id)
                default:
                    break
                }
            }
        }

        // Custom URL Scheme: lifeapp://post/123
        if url.scheme == "lifeapp" {
            let pathComponents = url.pathComponents.filter { $0 != "/" }

            if pathComponents.count >= 2 {
                let type = pathComponents[0]
                let id = pathComponents[1]

                switch type {
                case "post":
                    return .post(id: id)
                case "profile":
                    return .profile(username: id)
                case "event":
                    return .event(id: id)
                default:
                    break
                }
            }
        }

        return .unknown
    }
}

class DeepLinkManager: ObservableObject {
    static let shared = DeepLinkManager()

    @Published var deepLink: DeepLink?

    private init() {}

    func handle(url: URL) {
        if let link = DeepLink.parse(url: url) {
            deepLink = link
        }
    }

    func buildURL(for link: DeepLink) -> URL? {
        switch link {
        case .post(let id):
            return URL(string: "https://life.allstac.com/post/\(id)")
        case .profile(let username):
            return URL(string: "https://life.allstac.com/u/\(username)")
        case .event(let id):
            return URL(string: "https://life.allstac.com/event/\(id)")
        case .unknown:
            return nil
        }
    }

    func shareURL(for link: DeepLink) -> String {
        switch link {
        case .post(let id):
            return "https://life.allstac.com/post/\(id)"
        case .profile(let username):
            return "https://life.allstac.com/u/\(username)"
        case .event(let id):
            return "https://life.allstac.com/event/\(id)"
        case .unknown:
            return "https://life.allstac.com"
        }
    }
}

// MARK: - AppDelegate for Deep Link Handling
class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        DeepLinkManager.shared.handle(url: url)
        return true
    }

    func application(
        _ application: UIApplication,
        continue userActivity: NSUserActivity,
        restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
    ) -> Bool {
        if let url = userActivity.webpageURL {
            DeepLinkManager.shared.handle(url: url)
            return true
        }
        return false
    }
}

// MARK: - Deep Link Handler View Modifier
struct DeepLinkHandler: ViewModifier {
    @ObservedObject private var deepLinkManager = DeepLinkManager.shared

    func body(content: Content) -> some View {
        content
            .onChange(of: deepLinkManager.deepLink) { _, newValue in
                if let link = newValue {
                    handleDeepLink(link)
                    deepLinkManager.deepLink = nil
                }
            }
    }

    private func handleDeepLink(_ link: DeepLink) {
        // This will be handled by the view that observes the deep link
        // Typically you'd have a navigation coordinator that processes this
    }
}

extension View {
    func handleDeepLinks() -> some View {
        modifier(DeepLinkHandler())
    }
}
