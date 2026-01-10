//
//  ToastManager.swift
//  LifeApp
//
//  Global toast/alert notification system
//

import SwiftUI
import Combine

enum ToastType {
    case success
    case error
    case info
    case warning
}

struct ToastMessage: Identifiable, Equatable {
    let id = UUID()
    let message: String
    let type: ToastType
    let duration: TimeInterval?
    
    static func == (lhs: ToastMessage, rhs: ToastMessage) -> Bool {
        lhs.id == rhs.id
    }
}

@MainActor
class ToastManager: ObservableObject {
    static let shared = ToastManager()
    
    @Published var currentToast: ToastMessage?
    private var workItem: DispatchWorkItem?
    
    private init() {}
    
    func show(_ message: String, type: ToastType = .info, duration: TimeInterval = 3.0) {
        let toast = ToastMessage(message: message, type: type, duration: duration)
        
        currentToast = toast
        
        workItem?.cancel()
        
        workItem = DispatchWorkItem { [weak self] in
            self?.currentToast = nil
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + duration, execute: workItem!)
    }
    
    func success(_ message: String) {
        show(message, type: .success, duration: 2.5)
        HapticManager.notification(.success)
    }
    
    func error(_ message: String) {
        show(message, type: .error, duration: 4.0)
        HapticManager.notification(.error)
    }
    
    func warning(_ message: String) {
        show(message, type: .warning, duration: 3.0)
        HapticManager.notification(.warning)
    }
    
    func info(_ message: String) {
        show(message, type: .info, duration: 3.0)
    }
    
    func dismiss() {
        currentToast = nil
        workItem?.cancel()
    }
}

struct ToastView: View {
    let toast: ToastMessage
    @Binding var isPresented: Bool
    
    var body: some View {
        VStack {
            Spacer()
            
            HStack(spacing: 12) {
                icon
                
                Text(toast.message)
                    .font(Theme.Fonts.body())
                    .foregroundColor(.white)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)
                
                Spacer()
                
                Button(action: {
                    withAnimation(.easeOut) {
                        isPresented = false
                    }
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.white.opacity(0.7))
                }
            }
            .padding(Theme.Spacing.md)
            .background(backgroundColor)
            .foregroundColor(.white)
            .cornerRadius(Theme.Radius.lg)
            .shadow(color: .black.opacity(0.15), radius: 12, x: 0, y: 4)
            .padding(.horizontal, Theme.Spacing.lg)
            .padding(.bottom, Theme.Spacing.xl)
            .transition(.move(edge: .bottom).combined(with: .opacity))
        }
    }
    
    private var icon: some View {
        Group {
            switch toast.type {
            case .success:
                Image(systemName: "checkmark.circle.fill")
            case .error:
                Image(systemName: "exclamationmark.triangle.fill")
            case .warning:
                Image(systemName: "exclamationmark.circle.fill")
            case .info:
                Image(systemName: "info.circle.fill")
            }
        }
        .font(.title3)
    }
    
    private var backgroundColor: Color {
        switch toast.type {
        case .success:
            return Theme.success
        case .error:
            return Theme.error
        case .warning:
            return Theme.warning
        case .info:
            return Theme.accent
        }
    }
}

struct ToastContainerView: View {
    @ObservedObject private var toastManager = ToastManager.shared
    
    var body: some View {
        VStack {
            if let toast = toastManager.currentToast {
                ToastView(toast: toast, isPresented: .constant(true))
            }
        }
    }
}

extension View {
    func toast() -> some View {
        self.overlay(ToastContainerView())
    }
}
