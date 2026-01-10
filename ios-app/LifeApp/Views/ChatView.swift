import SwiftUI

struct ChatView: View {
    let thread: MessageThread
    @StateObject private var viewModel: ChatViewModel
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var authManager: AuthenticationManager
    @State private var messageText: String = ""
    @FocusState private var isFocused: Bool
    
    init(thread: MessageThread) {
        self.thread = thread
        self._viewModel = StateObject(wrappedValue: ChatViewModel(threadId: thread.id))
    }
    
    var otherParticipant: UserSummary? {
        thread.userA == authManager.currentUser?.id ? thread.userBProfile : thread.userAProfile
    }
    
    var body: some View {
        VStack(spacing: 0) {
            headerView
            
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(viewModel.messages) { message in
                            MessageBubble(
                                message: message,
                                isFromCurrentUser: message.senderId == authManager.currentUser?.id
                            )
                            .id(message.id)
                        }
                    }
                    .padding(Theme.Spacing.md)
                }
                .onChange(of: viewModel.messages.count) { _ in
                    if let lastMessageId = viewModel.messages.last?.id {
                        withAnimation {
                            proxy.scrollTo(lastMessageId, anchor: .bottom)
                        }
                    }
                }
            }
            
            inputView
        }
        .background(Theme.background.ignoresSafeArea())
        .navigationBarHidden(true)
        .onAppear {
            viewModel.fetchMessages()
        }
    }
    
    private var headerView: some View {
        HStack(spacing: Theme.Spacing.md) {
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left")
                    .font(.title3.weight(.bold))
                    .foregroundColor(Theme.text)
            }
            
            // Avatar
            if let avatarUrl = otherParticipant?.avatarUrl, let url = URL(string: avatarUrl) {
                AsyncImage(url: url) { image in
                    image.resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle().fill(Theme.subtleGradient)
                }
                .frame(width: 40, height: 40)
                .clipShape(Circle())
            } else {
                Circle()
                    .fill(Theme.subtleGradient)
                    .frame(width: 40, height: 40)
                    .overlay(
                        Text(otherParticipant?.username?.prefix(1).uppercased() ?? "?")
                            .font(Theme.Fonts.label())
                            .foregroundColor(Theme.accent)
                    )
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(otherParticipant?.username ?? "Chat")
                    .font(Theme.Fonts.label(size: 16))
                    .foregroundColor(Theme.text)
                
                Text("Online")
                    .font(Theme.Fonts.caption())
                    .foregroundColor(Theme.success)
            }
            
            Spacer()
        }
        .padding(.horizontal, Theme.Spacing.md)
        .padding(.vertical, Theme.Spacing.sm)
        .background(Theme.surface)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
    
    private var inputView: some View {
        VStack(spacing: 0) {
            Divider()
            
            HStack(spacing: Theme.Spacing.sm) {
                TextField("Message...", text: $messageText)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Theme.background)
                    .cornerRadius(20)
                    .focused($isFocused)
                
                Button(action: sendMessage) {
                    Image(systemName: "paperplane.fill")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)
                        .frame(width: 40, height: 40)
                        .background(
                            messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty 
                            ? Color.gray.opacity(0.3) 
                            : Theme.accent
                        )
                        .clipShape(Circle())
                }
                .disabled(messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            .padding(.horizontal, Theme.Spacing.md)
            .padding(.vertical, Theme.Spacing.sm)
            .background(Theme.surface)
        }
    }
    
    private func sendMessage() {
        let trimmed = messageText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        
        HapticManager.impact(.light)
        let body = trimmed
        messageText = ""
        
        viewModel.sendMessage(body: body)
    }
}

struct MessageBubble: View {
    let message: Message
    let isFromCurrentUser: Bool
    
    var body: some View {
        HStack {
            if isFromCurrentUser { Spacer() }
            
            VStack(alignment: isFromCurrentUser ? .trailing : .leading, spacing: 4) {
                Text(message.body)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .font(Theme.Fonts.body(size: 15))
                    .background(isFromCurrentUser ? Theme.accent : Theme.surface)
                    .foregroundColor(isFromCurrentUser ? .white : Theme.text)
                    .clipShape(ChatBubbleShape(isFromCurrentUser: isFromCurrentUser))
                    .shadow(color: Color.black.opacity(0.03), radius: 4, x: 0, y: 2)
                
                Text(timeString(from: message.createdAt))
                    .font(Theme.Fonts.caption())
                    .foregroundColor(Theme.secondaryText.opacity(0.6))
                    .padding(.horizontal, 4)
            }
            
            if !isFromCurrentUser { Spacer() }
        }
    }
    
    private func timeString(from dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: dateString) else { return "" }
        
        let displayFormatter = DateFormatter()
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
}

struct ChatBubbleShape: Shape {
    let isFromCurrentUser: Bool
    
    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: [
                .topLeft,
                .topRight,
                isFromCurrentUser ? .bottomLeft : .bottomRight
            ],
            cornerRadii: CGSize(width: 16, height: 16)
        )
        return Path(path.cgPath)
    }
}

class ChatViewModel: ObservableObject {
    let threadId: String
    @Published var messages: [Message] = []
    @Published var isLoading = false
    
    init(threadId: String) {
        self.threadId = threadId
    }
    
    func fetchMessages() {
        isLoading = true
        Task {
            do {
                let response = try await ApiService.shared.fetchMessages(threadId: threadId)
                await MainActor.run {
                    self.messages = response.messages
                    self.isLoading = false
                }
            } catch {
                print("❌ [Chat] Error fetching messages: \(error)")
                await MainActor.run {
                    self.isLoading = false
                }
            }
        }
    }
    
    func sendMessage(body: String) {
        Task {
            do {
                let message = try await ApiService.shared.sendMessage(threadId: threadId, body: body)
                await MainActor.run {
                    self.messages.append(message)
                }
            } catch {
                print("❌ [Chat] Error sending message: \(error)")
            }
        }
    }
}
