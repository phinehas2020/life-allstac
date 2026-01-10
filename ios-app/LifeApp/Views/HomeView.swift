//
//  HomeView.swift
//  LifeApp
//
//  Main feed with optimized loading and animations
//

import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()
    @State private var showScrollToTop = false
    @State private var showingNotifications = false
    @State private var showingMessages = false
    @State private var selectedPost: Post?
    @State private var showComments = false
    @State private var commentPost: Post?
    @Namespace private var scrollNamespace

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()

                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 24) {
                            // Header
                            headerView
                                .id("top")

                            // Content
                            contentView

                            // Bottom padding
                            Spacer()
                                .frame(height: 20)
                        }
                    }
                    .refreshable {
                        await viewModel.fetchPosts(refresh: true)
                    }
                    .onChange(of: showScrollToTop) { _, newValue in
                        if newValue {
                            withAnimation(.smooth) {
                                proxy.scrollTo("top", anchor: .top)
                            }
                            showScrollToTop = false
                        }
                    }
                }

                // Scroll to top button (floating)
                if viewModel.posts.count > 3 {
                    VStack {
                        Spacer()
                        HStack {
                            Spacer()
                            scrollToTopButton
                        }
                    }
                    .padding(.trailing, 20)
                    .padding(.bottom, 100)
                }
            }
            .navigationBarHidden(true)
            .navigationDestination(isPresented: $showingNotifications) {
                NotificationsView()
            }
            .navigationDestination(isPresented: $showingMessages) {
                MessagesView()
            }
            .fullScreenCover(item: $selectedPost) { post in
                PostFullScreenView(post: post, showComments: $showComments)
                    .onDisappear {
                        if showComments, let selected = selectedPost {
                            commentPost = selected
                        }
                    }
            }
            .sheet(isPresented: $showComments) {
                if let post = commentPost ?? selectedPost {
                    CommentsSheetView(postId: post.id, initialComments: post.comments)
                        .presentationDetents([.fraction(0.4), .large] as Set<PresentationDetent>)
                        .presentationDragIndicator(.hidden)
                }
            }
        }
        .onAppear {
            if viewModel.posts.isEmpty {
                Task {
                    await viewModel.fetchPosts()
                }
            }
        }
    }

    // MARK: - Header
    private var headerView: some View {
        HStack {
            // Gradient logo text
            Text("Life")
                .font(Theme.Fonts.heading(size: 32))
                .gradientForeground()

            Spacer()

            // Notification button
            Button(action: {
                HapticManager.impact(.light)
                showingNotifications = true
            }) {
                ZStack {
                    Image(systemName: "bell")
                        .font(.title2)
                        .foregroundColor(Theme.text)

                    // Notification dot
                    Circle()
                        .fill(Theme.likeColor)
                        .frame(width: 8, height: 8)
                        .offset(x: 8, y: -8)
                }
            }
            .padding(.trailing, Theme.Spacing.sm)

            // Message button
            Button(action: {
                HapticManager.impact(.light)
                showingMessages = true
            }) {
                Image(systemName: "message")
                    .font(.title2)
                    .foregroundColor(Theme.text)
            }
        }
        .padding(.horizontal, Theme.Spacing.md)
        .padding(.top, Theme.Spacing.md)
    }

    // MARK: - Content
    @ViewBuilder
    private var contentView: some View {
        if viewModel.isLoading && viewModel.posts.isEmpty {
            // Skeleton loading
            FeedSkeleton(count: 3)
                .transition(.opacity)
        } else if viewModel.posts.isEmpty && !viewModel.isLoading {
            // Empty state
            emptyStateView
                .transition(.scale.combined(with: .opacity))
        } else {
            // Posts feed
            feedView
        }
    }

    // MARK: - Feed
    @ViewBuilder
    private var feedView: some View {
        ForEach(Array(viewModel.posts.enumerated()), id: \.element.id) { index, post in
            PostCardView(post: post, onCommentTap: {
                commentPost = post
                showComments = true
            })
            .onTapGesture {
                HapticManager.selection()
                selectedPost = post
            }
            .onAppear {
                // Efficient threshold-based pagination
                let threshold = viewModel.posts.count - 5
                if index >= threshold && viewModel.hasMore && !viewModel.isLoading {
                    Task {
                        await viewModel.loadMore()
                    }
                }
            }
            .transition(.asymmetric(
                insertion: .opacity.combined(with: .move(edge: .bottom)),
                removal: .opacity
            ))
        }

        // Loading more indicator
        if viewModel.isLoading && !viewModel.posts.isEmpty {
            HStack {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: Theme.accent))
                Text("Loading more...")
                    .font(Theme.Fonts.caption())
                    .foregroundColor(Theme.secondaryText)
            }
            .padding()
        }

        // End of feed indicator
        if !viewModel.hasMore && !viewModel.posts.isEmpty {
            VStack(spacing: 8) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title)
                    .foregroundColor(Theme.success)
                Text("You're all caught up!")
                    .font(Theme.Fonts.body().weight(.semibold))
                    .foregroundColor(Theme.text)
            }
            .padding(.vertical, Theme.Spacing.xl)
        }
    }

    // MARK: - Empty State
    private var emptyStateView: some View {
        VStack(spacing: Theme.Spacing.lg) {
            // Animated floating icon
            FloatingIconView(systemName: "camera.fill")

            Text("No posts yet")
                .font(Theme.Fonts.heading(size: 24))
                .foregroundColor(Theme.text)

            Text("Share your first moment or follow\nsome friends to see their posts here.")
                .font(Theme.Fonts.body())
                .foregroundColor(Theme.secondaryText)
                .multilineTextAlignment(.center)
                .lineSpacing(4)

            Button(action: {
                Task { await viewModel.fetchPosts(refresh: true) }
            }) {
                HStack {
                    Image(systemName: "arrow.clockwise")
                    Text("Refresh")
                }
            }
            .buttonStyle(GradientButtonStyle())
            .padding(.top, Theme.Spacing.md)
        }
        .padding(.top, 80)
        .padding(.horizontal, Theme.Spacing.xl)
    }

    // MARK: - Scroll to Top Button
    private var scrollToTopButton: some View {
        Button(action: {
            HapticManager.impact(.light)
            showScrollToTop = true
        }) {
            Image(systemName: "arrow.up")
                .font(.headline)
                .foregroundColor(.white)
                .frame(width: 44, height: 44)
                .background(Theme.brandGradient)
                .clipShape(Circle())
                .shadow(color: Theme.accent.opacity(0.3), radius: 8, x: 0, y: 4)
        }
    }
}

// MARK: - Floating Icon Animation
struct FloatingIconView: View {
    let systemName: String
    @State private var isFloating = false

    var body: some View {
        ZStack {
            // Background circles
            Circle()
                .fill(Theme.subtleGradient)
                .frame(width: 120, height: 120)

            Circle()
                .fill(Theme.brandGradient.opacity(0.2))
                .frame(width: 100, height: 100)

            // Icon
            Image(systemName: systemName)
                .font(.system(size: 40))
                .foregroundColor(Theme.accent)
        }
        .offset(y: isFloating ? -8 : 0)
        .animation(
            .easeInOut(duration: 2.0).repeatForever(autoreverses: true),
            value: isFloating
        )
        .onAppear {
            isFloating = true
        }
    }
}

// MARK: - View Model
@MainActor
class HomeViewModel: ObservableObject {
    @Published var posts: [Post] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var hasMore = true
    @Published var currentPage = 0

    func fetchPosts(refresh: Bool = false) async {
        guard !isLoading else { return }

        if refresh {
            currentPage = 0
            hasMore = true
            errorMessage = nil
        }

        isLoading = true

        do {
            let response = try await ApiService.shared.fetchPosts(limit: 20, page: currentPage)

            if refresh {
                withAnimation(.smooth) {
                    self.posts = response.posts
                }
            } else {
                withAnimation(.smooth) {
                    self.posts.append(contentsOf: response.posts)
                }
            }
            self.hasMore = response.hasMore
            self.isLoading = false
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
        }
    }

    func loadMore() async {
        guard hasMore && !isLoading else { return }
        currentPage += 1
        await fetchPosts()
    }
}

// MARK: - Preview
struct HomeView_Previews: PreviewProvider {
    static var previews: some View {
        HomeView()
    }
}
