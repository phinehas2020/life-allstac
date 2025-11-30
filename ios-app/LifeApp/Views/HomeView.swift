//
//  HomeView.swift
//  LifeApp
//
//  Main feed showing posts.
//

import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()
    
    var body: some View {
        NavigationView {
            ZStack {
                Theme.background.ignoresSafeArea()

                ScrollView {
                    LazyVStack(spacing: 24) {
                        // Header
                        HStack {
                            Text("The Who")
                                .font(Theme.Fonts.heading())
                                .foregroundColor(Theme.text)
                            Spacer()
                            Image(systemName: "bell")
                                .font(.title2)
                                .foregroundColor(Theme.text)
                        }
                        .padding(.horizontal)
                        .padding(.top)

                        // Feed
                        if viewModel.isLoading && viewModel.posts.isEmpty {
                            ProgressView()
                                .padding(.top, 50)
                        } else if viewModel.posts.isEmpty && !viewModel.isLoading {
                            VStack(spacing: 16) {
                                Image(systemName: "camera")
                                    .font(.system(size: 48))
                                    .foregroundColor(Theme.secondaryText)
                                Text("No posts yet")
                                    .font(Theme.Fonts.body())
                                    .foregroundColor(Theme.secondaryText)
                                Button("Refresh") {
                                    Task { await viewModel.fetchPosts(refresh: true) }
                                }
                            }
                            .padding(.top, 100)
                        } else {
                            ForEach(viewModel.posts) { post in
                                PostCardView(post: post)
                                    .onAppear {
                                        if post.id == viewModel.posts.last?.id {
                                            Task {
                                                await viewModel.loadMore()
                                            }
                                        }
                                    }
                            }

                            if viewModel.isLoading {
                                ProgressView()
                                    .padding()
                            }
                        }
                    }
                    .padding(.bottom, 20)
                }
                .refreshable {
                    await viewModel.fetchPosts(refresh: true)
                }
            }
            .navigationBarHidden(true)
        }
        .onAppear {
            if viewModel.posts.isEmpty {
                Task {
                    await viewModel.fetchPosts()
                }
            }
        }
    }
}

class HomeViewModel: ObservableObject {
    @Published var posts: [Post] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var hasMore = true
    @Published var currentPage = 0
    
    func fetchPosts(refresh: Bool = false) async {
        guard !isLoading else { return }

        if refresh {
            await MainActor.run {
                self.currentPage = 0
                self.hasMore = true
                self.isLoading = true
                self.errorMessage = nil
            }
        } else {
            await MainActor.run { self.isLoading = true }
        }
        
        do {
            let response = try await ApiService.shared.fetchPosts(limit: 20, page: currentPage)
            await MainActor.run {
                if refresh {
                    self.posts = response.posts
                } else {
                    self.posts.append(contentsOf: response.posts)
                }
                self.hasMore = response.hasMore
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
                self.isLoading = false
            }
        }
    }
    
    func loadMore() async {
        guard hasMore && !isLoading else { return }
        await MainActor.run { self.currentPage += 1 }
        await fetchPosts()
    }
}
