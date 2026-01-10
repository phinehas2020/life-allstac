//
//  ExploreView.swift
//  LifeApp
//
//  Explore/discover view with pagination and cached images
//

import SwiftUI

struct ExploreView: View {
    @StateObject private var viewModel = ExploreViewModel()
    @State private var searchText = ""
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
                    if viewModel.isLoading && viewModel.posts.isEmpty {
                        GridSkeleton(itemCount: 15)
                            .padding(.horizontal, 2)
                    } else if viewModel.posts.isEmpty && !viewModel.isLoading {
                        emptyStateView
                    } else {
                        gridView
                    }
                }
            }
            .navigationTitle("Explore")
            .navigationBarTitleDisplayMode(.large)
            .task {
                if viewModel.posts.isEmpty {
                    await viewModel.fetchPosts()
                }
            }
            .refreshable {
                await viewModel.fetchPosts(refresh: true)
            }
            .navigationDestination(item: $selectedPost) { post in
                PostDetailView(postId: post.id)
            }
        }
        .overlay(ToastContainerView())
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
                .onSubmit {
                    Task {
                        await viewModel.search(query: searchText)
                    }
                }

            if !searchText.isEmpty {
                Button(action: {
                    searchText = ""
                    Task {
                        await viewModel.fetchPosts(refresh: true)
                    }
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
                        .onAppear {
                            if post.id == filteredPosts.last?.id && viewModel.hasMore && !viewModel.isLoading {
                                Task {
                                    await viewModel.loadMore()
                                }
                            }
                        }
                }

                // Loading more indicator
                if viewModel.isLoading && !viewModel.posts.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding()
                }

                // End of feed indicator
                if !viewModel.hasMore && !viewModel.posts.isEmpty {
                    VStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.title)
                            .foregroundColor(Theme.success)
                        Text("You've seen it all!")
                            .font(Theme.Fonts.body())
                            .foregroundColor(Theme.secondaryText)
                    }
                    .padding(.vertical, Theme.Spacing.xl)
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

                    // Stats overlay
                    Color.black.opacity(0.001)
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
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, Theme.Spacing.xl)
    }

    // MARK: - Filtered Posts
    private var filteredPosts: [Post] {
        if searchText.isEmpty {
            return viewModel.posts
        }
        return viewModel.posts.filter { post in
            let caption = post.caption?.lowercased() ?? ""
            let username = post.user?.username?.lowercased() ?? ""
            let query = searchText.lowercased()
            return caption.contains(query) || username.contains(query)
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

// MARK: - View Model
@MainActor
class ExploreViewModel: ObservableObject {
    @Published var posts: [Post] = []
    @Published var isLoading = false
    @Published var hasMore = true
    @Published var currentPage = 0

    private let pageSize = 20

    func fetchPosts(refresh: Bool = false) async {
        guard !isLoading else { return }

        if refresh {
            currentPage = 0
            hasMore = true
        }

        isLoading = true

        do {
            let response = try await NetworkRetryManager.execute(policy: .default) {
                try await ApiService.shared.fetchPosts(limit: self.pageSize, page: self.currentPage)
            }

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
            self.isLoading = false
            ToastManager.shared.error("Failed to load posts: \(error.localizedDescription)")
        }
    }

    func loadMore() async {
        guard hasMore && !isLoading else { return }
        currentPage += 1
        await fetchPosts()
    }

    func search(query: String) async {
        guard !query.isEmpty else {
            await fetchPosts(refresh: true)
            return
        }

        isLoading = true
        do {
            // For search, we'll load more posts first then filter
            let response = try await NetworkRetryManager.execute(policy: .default) {
                try await ApiService.shared.fetchPosts(limit: 100, page: 0)
            }

            withAnimation(.smooth) {
                self.posts = response.posts
            }
            self.hasMore = false
            self.isLoading = false
        } catch {
            self.isLoading = false
            ToastManager.shared.error("Search failed: \(error.localizedDescription)")
        }
    }
}

// MARK: - Preview
struct ExploreView_Previews: PreviewProvider {
    static var previews: some View {
        ExploreView()
    }
}
