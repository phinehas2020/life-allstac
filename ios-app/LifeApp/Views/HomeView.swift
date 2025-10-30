//
//  HomeView.swift
//  LifeApp
//
//  Home feed view
//

import SwiftUI

struct HomeView: View {
    @State private var posts: [Post] = []
    @State private var isLoading = false
    @State private var hasMore = true
    @State private var page = 0
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            ScrollView {
                LazyVStack(spacing: 16) {
                    if posts.isEmpty && !isLoading {
                        VStack(spacing: 16) {
                            Text("No posts yet")
                                .foregroundColor(.secondary)
                            if let error = errorMessage {
                                Text(error)
                                    .foregroundColor(.red)
                                    .font(.caption)
                            }
                        }
                        .padding()
                    }
                    
                    ForEach(posts) { post in
                        PostCardView(post: post)
                    }
                    
                    if isLoading {
                        ProgressView()
                            .padding()
                    }
                    
                    if hasMore && !isLoading && !posts.isEmpty {
                        Button("Load More") {
                            loadMorePosts()
                        }
                        .padding()
                    }
                }
                .padding()
            }
            .navigationTitle("Home")
            .refreshable {
                await loadPosts()
            }
            .task {
                await loadPosts()
            }
        }
    }
    
    private func loadPosts() async {
        print("🏠 [HomeView] Loading posts...")
        isLoading = true
        errorMessage = nil
        page = 0
        
        do {
            let response = try await ApiService.shared.fetchPosts(limit: 20, page: page)
            await MainActor.run {
                posts = response.posts
                hasMore = response.hasMore
                isLoading = false
                print("🏠 [HomeView] Loaded \(response.posts.count) posts")
            }
        } catch {
            let errorMsg = error.localizedDescription
            print("❌ [HomeView] Failed to load posts: \(errorMsg)")
            await MainActor.run {
                errorMessage = "Failed to load posts: \(errorMsg)"
                isLoading = false
            }
        }
    }
    
    private func loadMorePosts() {
        Task {
            page += 1
            isLoading = true
            
            do {
                let response = try await ApiService.shared.fetchPosts(limit: 20, page: page)
                await MainActor.run {
                    posts.append(contentsOf: response.posts)
                    hasMore = response.hasMore
                    isLoading = false
                    print("🏠 [HomeView] Loaded \(response.posts.count) more posts")
                }
            } catch {
                let errorMsg = error.localizedDescription
                print("❌ [HomeView] Failed to load more posts: \(errorMsg)")
                await MainActor.run {
                    errorMessage = "Failed to load more: \(errorMsg)"
                    isLoading = false
                }
            }
        }
    }
}

