//
//  ProfileView.swift
//  LifeApp
//
//  User profile view with cached images and modern design
//

import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    let username: String?
    @State private var profile: UserProfile?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedPost: Post?
    @State private var navigatingToChat: MessageThread? = nil
    
    init(username: String? = nil) {
        self.username = username
    }

    private let columns = [
        GridItem(.flexible(), spacing: 2),
        GridItem(.flexible(), spacing: 2),
        GridItem(.flexible(), spacing: 2)
    ]

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()

                ScrollView {
                    if let profile = profile {
                        VStack(spacing: Theme.Spacing.lg) {
                            // Profile header
                            profileHeader(profile)

                            // Action buttons
                            actionButtons

                            // Posts grid
                            postsGrid(profile)
                        }
                    } else if isLoading {
                        ProfileHeaderSkeleton()
                        GridSkeleton(itemCount: 9)
                            .padding(.horizontal, 2)
                    } else {
                        errorView
                    }
                }
                .refreshable {
                    await loadProfile()
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button(action: {}) {
                            Label("Settings", systemImage: "gearshape")
                        }

                        Button(action: {}) {
                            Label("Edit Profile", systemImage: "pencil")
                        }

                        Divider()

                        Button(role: .destructive, action: {
                            authManager.logout()
                        }) {
                            Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                        }
                    } label: {
                        Image(systemName: "line.3.horizontal")
                            .font(.title3)
                            .foregroundColor(Theme.text)
                    }
                }
            }
            .task {
                await loadProfile()
            }
            .navigationDestination(item: $selectedPost) { post in
                PostDetailView(postId: post.id)
            }
            .navigationDestination(item: $navigatingToChat) { thread in
                ChatView(thread: thread)
            }
        }
    }

    // MARK: - Profile Header
    private func profileHeader(_ profile: UserProfile) -> some View {
        VStack(spacing: Theme.Spacing.md) {
            // Avatar with gradient ring
            ZStack {
                Circle()
                    .stroke(Theme.brandGradient, lineWidth: 4)
                    .frame(width: 110, height: 110)

                if let avatarUrl = profile.userModel.avatar_url, let url = URL(string: avatarUrl) {
                    CachedAsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        avatarPlaceholder(profile)
                    }
                    .frame(width: 100, height: 100)
                    .clipShape(Circle())
                } else {
                    avatarPlaceholder(profile)
                        .frame(width: 100, height: 100)
                }
            }
            .shadow(color: Theme.accent.opacity(0.2), radius: 12, x: 0, y: 6)

            // Name
            Text(profile.userModel.displayName)
                .font(Theme.Fonts.heading(size: 24))
                .foregroundColor(Theme.text)

            // Username
            Text("@\(profile.userModel.username ?? "user")")
                .font(Theme.Fonts.body())
                .foregroundColor(Theme.secondaryText)

            // Bio
            if let bio = profile.userModel.bio, !bio.isEmpty {
                Text(bio)
                    .font(Theme.Fonts.body())
                    .foregroundColor(Theme.text)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .padding(.horizontal, Theme.Spacing.xl)
            }

            // Stats
            HStack(spacing: Theme.Spacing.xxl) {
                statView(value: profile.stats.posts, label: "Posts")
                statView(value: profile.stats.followers, label: "Followers")
                statView(value: profile.stats.following, label: "Following")
            }
            .padding(.top, Theme.Spacing.sm)
        }
        .padding(.top, Theme.Spacing.lg)
        .padding(.horizontal)
    }

    private func avatarPlaceholder(_ profile: UserProfile) -> some View {
        Circle()
            .fill(Theme.subtleGradient)
            .overlay(
                Text(profile.userModel.displayName.prefix(1).uppercased())
                    .font(Theme.Fonts.heading(size: 36))
                    .foregroundColor(Theme.accent)
            )
    }

    private func statView(value: Int, label: String) -> some View {
        VStack(spacing: 4) {
            Text("\(value)")
                .font(Theme.Fonts.heading(size: 22))
                .foregroundColor(Theme.text)

            Text(label)
                .font(Theme.Fonts.caption())
                .foregroundColor(Theme.secondaryText)
        }
    }

    // MARK: - Action Buttons
    private var actionButtons: some View {
        HStack(spacing: Theme.Spacing.md) {
            if isCurrentUser {
                Button(action: {}) {
                    Text("Edit Profile")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SecondaryButtonStyle())
            } else {
                Button(action: {}) {
                    Text("Follow")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(GradientButtonStyle())
                
                Button(action: startChat) {
                    Text("Message")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SecondaryButtonStyle())
            }

            Button(action: {}) {
                Image(systemName: "square.and.arrow.up")
            }
            .buttonStyle(SecondaryButtonStyle())
        }
        .padding(.horizontal)
    }
    
    private var isCurrentUser: Bool {
        guard let profile = profile else { return true }
        return profile.userModel.id == authManager.currentUser?.id
    }
    
    private func startChat() {
        guard let profile = profile else { return }
        HapticManager.impact(.light)
        
        Task {
            do {
                let threadId = try await ApiService.shared.getOrCreateThread(targetUserId: profile.userModel.id)
                let thread = MessageThread(
                    id: threadId,
                    userA: authManager.currentUser?.id ?? "",
                    userB: profile.userModel.id,
                    createdAt: "",
                    userAProfile: nil,
                    userBProfile: UserSummary(
                        id: profile.userModel.id,
                        username: profile.userModel.username,
                        avatarUrl: profile.userModel.avatar_url
                    )
                )
                await MainActor.run {
                    navigatingToChat = thread
                }
            } catch {
                print("❌ [Profile] Failed to start chat: \(error)")
            }
        }
    }

    // MARK: - Posts Grid
    private func postsGrid(_ profile: UserProfile) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.md) {
            // Section header
            HStack {
                Image(systemName: "square.grid.3x3.fill")
                    .foregroundColor(Theme.accent)
                Text("Posts")
                    .font(Theme.Fonts.label())
                    .foregroundColor(Theme.text)
                Spacer()
            }
            .padding(.horizontal)

            // Grid
            if profile.recentPosts.isEmpty {
                emptyPostsView
            } else {
                LazyVGrid(columns: columns, spacing: 2) {
                    ForEach(profile.recentPosts) { post in
                        gridItem(post)
                    }
                }
                .padding(.horizontal, 2)
            }
        }
        .padding(.top, Theme.Spacing.md)
    }

    private func gridItem(_ post: Post) -> some View {
        Button(action: {
            HapticManager.selection()
            selectedPost = post
        }) {
            GeometryReader { geometry in
                CachedAsyncImage(url: URL(string: post.mediaUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: geometry.size.width, height: geometry.size.width)
                        .clipped()
                } placeholder: {
                    BlurHashPlaceholder(
                        blurhash: post.blurhash,
                        size: CGSize(width: 32, height: 32)
                    )
                }
            }
            .aspectRatio(1, contentMode: .fit)
        }
        .buttonStyle(GridItemButtonStyle())
    }

    private var emptyPostsView: some View {
        VStack(spacing: Theme.Spacing.md) {
            Image(systemName: "camera.fill")
                .font(.system(size: 40))
                .foregroundColor(Theme.secondaryText)

            Text("No posts yet")
                .font(Theme.Fonts.body().weight(.semibold))
                .foregroundColor(Theme.text)

            Text("Share your first moment!")
                .font(Theme.Fonts.caption())
                .foregroundColor(Theme.secondaryText)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Theme.Spacing.xxl)
    }

    // MARK: - Error View
    private var errorView: some View {
        VStack(spacing: Theme.Spacing.lg) {
            FloatingIconView(systemName: "person.crop.circle.badge.exclamationmark")

            Text("Couldn't load profile")
                .font(Theme.Fonts.heading(size: 20))
                .foregroundColor(Theme.text)

            if let error = errorMessage {
                Text(error)
                    .font(Theme.Fonts.caption())
                    .foregroundColor(Theme.error)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }

            Button(action: {
                Task { await loadProfile() }
            }) {
                HStack {
                    Image(systemName: "arrow.clockwise")
                    Text("Try Again")
                }
            }
            .buttonStyle(GradientButtonStyle())
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, 100)
    }

    // MARK: - Load Profile
    private func loadProfile() async {
        let usernameToFetch: String
        
        if let username = username {
            usernameToFetch = username
        } else if let currentUser = authManager.currentUser {
            usernameToFetch = currentUser.username ?? currentUser.email ?? currentUser.id
        } else {
            print("ProfileView: No user context")
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            let userProfile = try await ApiService.shared.fetchUserProfile(username: usernameToFetch)
            withAnimation(.smooth) {
                profile = userProfile
                isLoading = false
            }
        } catch {
            withAnimation {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }
}

// MARK: - Preview
struct ProfileView_Previews: PreviewProvider {
    static var previews: some View {
        ProfileView()
            .environmentObject(AuthenticationManager())
    }
}
