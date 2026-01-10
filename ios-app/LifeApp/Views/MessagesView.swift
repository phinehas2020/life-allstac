import SwiftUI

struct MessagesView: View {
    @StateObject private var viewModel = MessagesViewModel()
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var authManager: AuthenticationManager
    
    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            
            VStack(spacing: 0) {
                headerView
                
                if viewModel.isLoading && viewModel.threads.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.threads.isEmpty {
                    emptyStateView
                } else {
                    threadsList
                }
            }
        }
        .navigationBarHidden(true)
        .onAppear {
            viewModel.fetchThreads()
        }
    }
    
    private var headerView: some View {
        HStack {
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left")
                    .font(.title3.weight(.bold))
                    .foregroundColor(Theme.text)
                    .frame(width: 40, height: 40)
                    .background(Theme.surface)
                    .clipShape(Circle())
                    .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
            }
            
            Text("Messages")
                .font(Theme.Fonts.heading(size: 24))
                .foregroundColor(Theme.text)
                .padding(.leading, Theme.Spacing.sm)
            
            Spacer()
        }
        .padding(.horizontal, Theme.Spacing.md)
        .padding(.top, Theme.Spacing.md)
        .padding(.bottom, Theme.Spacing.sm)
    }
    
    private var threadsList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(viewModel.threads) { thread in
                    NavigationLink(destination: ChatView(thread: thread)) {
                        ThreadRow(thread: thread, currentUserId: authManager.currentUser?.id ?? "")
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding(Theme.Spacing.md)
        }
        .refreshable {
            viewModel.fetchThreads()
        }
    }
    
    private var emptyStateView: some View {
        VStack(spacing: Theme.Spacing.lg) {
            Image(systemName: "message.circle")
                .font(.system(size: 80))
                .gradientForeground()
                .opacity(0.5)
            
            Text("No messages yet")
                .font(Theme.Fonts.heading(size: 20))
                .foregroundColor(Theme.text)
            
            Text("Start a conversation with someone from their profile.")
                .font(Theme.Fonts.body())
                .foregroundColor(Theme.secondaryText)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct ThreadRow: View {
    let thread: MessageThread
    let currentUserId: String
    
    var otherParticipant: UserSummary? {
        thread.userA == currentUserId ? thread.userBProfile : thread.userAProfile
    }
    
    var body: some View {
        HStack(spacing: Theme.Spacing.md) {
            // Avatar
            if let avatarUrl = otherParticipant?.avatarUrl, let url = URL(string: avatarUrl) {
                AsyncImage(url: url) { image in
                    image.resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle().fill(Theme.subtleGradient)
                }
                .frame(width: 56, height: 56)
                .clipShape(Circle())
            } else {
                Circle()
                    .fill(Theme.subtleGradient)
                    .frame(width: 56, height: 56)
                    .overlay(
                        Text(otherParticipant?.username?.prefix(1).uppercased() ?? "?")
                            .font(Theme.Fonts.label(size: 20))
                            .foregroundColor(Theme.accent)
                    )
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(otherParticipant?.username ?? "Unknown User")
                    .font(Theme.Fonts.label(size: 16))
                    .foregroundColor(Theme.text)
                
                Text("Tap to message")
                    .font(Theme.Fonts.body(size: 14))
                    .foregroundColor(Theme.secondaryText)
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(Theme.secondaryText.opacity(0.4))
        }
        .padding(Theme.Spacing.md)
        .background(Theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .shadow(color: Color.black.opacity(0.04), radius: 8, x: 0, y: 4)
    }
}

class MessagesViewModel: ObservableObject {
    @Published var threads: [MessageThread] = []
    @Published var isLoading = false
    
    func fetchThreads() {
        isLoading = true
        Task {
            do {
                let response = try await ApiService.shared.fetchMessageThreads()
                await MainActor.run {
                    self.threads = response.threads
                    self.isLoading = false
                }
            } catch {
                print("❌ [Messages] Error: \(error)")
                await MainActor.run {
                    self.isLoading = false
                }
            }
        }
    }
}
