//
//  ExploreView.swift
//  LifeApp
//
//  Explore/discover view
//

import SwiftUI

struct ExploreView: View {
    @State private var posts: [Post] = []
    @State private var searchText = ""
    @State private var isLoading = false
    
    var body: some View {
        NavigationView {
            VStack {
                // Search bar
                SearchBar(text: $searchText)
                    .padding(.horizontal)
                
                // Grid of posts
                ScrollView {
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 2) {
                        ForEach(posts) { post in
                            NavigationLink(destination: PostDetailView(postId: post.id)) {
                                AsyncImage(url: URL(string: post.mediaUrl)) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    Rectangle()
                                        .fill(Color.gray.opacity(0.3))
                                }
                                .frame(width: 120, height: 120)
                                .clipped()
                            }
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .navigationTitle("Explore")
            .task {
                await loadPosts()
            }
        }
    }
    
    private func loadPosts() async {
        isLoading = true
        do {
            let response = try await ApiService.shared.fetchPosts(limit: 50)
            await MainActor.run {
                posts = response.posts
                isLoading = false
            }
        } catch {
            await MainActor.run {
                isLoading = false
            }
        }
    }
}

struct SearchBar: View {
    @Binding var text: String
    
    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.gray)
            
            TextField("Search...", text: $text)
                .autocapitalization(.none)
        }
        .padding(8)
        .background(Color.gray.opacity(0.1))
        .cornerRadius(8)
    }
}

