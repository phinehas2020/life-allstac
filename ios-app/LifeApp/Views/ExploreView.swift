//
//  ExploreView.swift
//  LifeApp
//
//  Explore/discover view with cached images and modern grid
//

import SwiftUI

struct ExploreView: View {
    @State private var posts: [Post] = []
    @State private var searchText = ""
    @State private var isLoading = false
    @State private var selectedPost: Post?

    private let columns = [
        GridItem(.flexible(), spacing: 2),
        GridItem(.flexible(), spacing: 2),
        GridItem(.flexible(), spacing: 2)
    ]

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Search bar
                    searchBar
                        .padding(.horizontal)
                        .padding(.vertical, Theme.Spacing.sm)

                    // Content
                    if isLoading && posts.isEmpty {
                        GridSkeleton(itemCount: 15)
                            .padding(.horizontal, 2)
                    } else if posts.isEmpty {
                        emptyStateView
                    } else {
                        gridView
                    }
                }
            }
            .navigationTitle("Explore")
            .navigationBarTitleDisplayMode(.large)
            .task {
                await loadPosts()
            }
            .refreshable {
                await loadPosts()
            }
            .navigationDestination(item: $selectedPost) { post in
                PostDetailView(postId: post.id)
            }
        }
    }

    // MARK: - Search Bar
    private var searchBar: some View {
        HStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .font(.title3)
                .foregroundColor(Theme.secondaryText)

            TextField("Search posts, events, people...", text: $searchText)
                .font(Theme.Fonts.body())
                .autocapitalization(.none)
                .disableAutocorrection(true)

            if !searchText.isEmpty {
                Button(action: {
                    searchText = ""
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(Theme.secondaryText)
                }
            }
        }
        .padding(Theme.Spacing.md)
        .background(Theme.surface)
        .cornerRadius(Theme.Radius.lg)
        .shadow(color: Color.black.opacity(0.04), radius: 8, x: 0, y: 4)
    }

    // MARK: - Grid View
    private var gridView: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 2) {
                ForEach(filteredPosts) { post in
                    gridItem(post)
                }
            }
            .padding(.horizontal, 2)
        }
    }

    private func gridItem(_ post: Post) -> some View {
        Button(action: {
            HapticManager.selection()
            selectedPost = post
        }) {
            GeometryReader { geometry in
                ZStack {
                    // Cached image
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

                    // Video indicator
                    if post.isVideo {
                        VStack {
                            HStack {
                                Spacer()
                                Image(systemName: "play.fill")
                                    .font(.caption)
                                    .foregroundColor(.white)
                                    .padding(6)
                                    .background(Color.black.opacity(0.5))
                                    .clipShape(Circle())
                                    .padding(6)
                            }
                            Spacer()
                        }
                    }

                    // Stats overlay on hover/press
                    Color.black.opacity(0.001) // Invisible touch target
                }
            }
            .aspectRatio(1, contentMode: .fit)
        }
        .buttonStyle(GridItemButtonStyle())
    }

    // MARK: - Empty State
    private var emptyStateView: some View {
        VStack(spacing: Theme.Spacing.lg) {
            FloatingIconView(systemName: "magnifyingglass")

            Text("Discover something new")
                .font(Theme.Fonts.heading(size: 24))
                .foregroundColor(Theme.text)

            Text("Explore photos and videos from\nthe community")
                .font(Theme.Fonts.body())
                .foregroundColor(Theme.secondaryText)
                .multilineTextAlignment(.center)
                .lineSpacing(4)

            Button(action: {
                Task { await loadPosts() }
            }) {
                HStack {
                    Image(systemName: "arrow.clockwise")
                    Text("Refresh")
                }
            }
            .buttonStyle(GradientButtonStyle())
            .padding(.top, Theme.Spacing.md)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, Theme.Spacing.xl)
    }

    // MARK: - Filtered Posts
    private var filteredPosts: [Post] {
        if searchText.isEmpty {
            return posts
        }
        return posts.filter { post in
            let caption = post.caption?.lowercased() ?? ""
            let username = post.user?.username?.lowercased() ?? ""
            let query = searchText.lowercased()
            return caption.contains(query) || username.contains(query)
        }
    }

    // MARK: - Load Posts
    private func loadPosts() async {
        isLoading = true
        do {
            let response = try await ApiService.shared.fetchPosts(limit: 50)
            withAnimation(.smooth) {
                posts = response.posts
                isLoading = false
            }
        } catch {
            withAnimation {
                isLoading = false
            }
        }
    }
}

// MARK: - Grid Item Button Style
struct GridItemButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.snappy, value: configuration.isPressed)
    }
}

// MARK: - Preview
struct ExploreView_Previews: PreviewProvider {
    static var previews: some View {
        ExploreView()
    }
}
