//
//  ProfileView.swift
//  LifeApp
//
//  User profile view
//

import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @State private var profile: UserProfile?
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            ScrollView {
                if let profile = profile {
                    VStack(spacing: 24) {
                        // Profile header
                        VStack(spacing: 12) {
                            // Avatar
                            Circle()
                                .fill(Color.blue.opacity(0.3))
                                .frame(width: 80, height: 80)
                                .overlay(
                                    Text(profile.user.username ?? profile.user.id.prefix(1).uppercased())
                                        .font(.title)
                                        .foregroundColor(.blue)
                                )
                            
                            Text(profile.user.username ?? "User")
                                .font(.title2)
                                .fontWeight(.semibold)
                            
                            if let bio = profile.user.bio {
                                Text(bio)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                            }
                            
                            // Stats
                            HStack(spacing: 24) {
                                StatView(value: "\(profile.stats.posts)", label: "Posts")
                                StatView(value: "\(profile.stats.followers)", label: "Followers")
                                StatView(value: "\(profile.stats.following)", label: "Following")
                            }
                        }
                        .padding()
                        
                        // Posts grid
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 2) {
                            ForEach(profile.recentPosts) { post in
                                NavigationLink(destination: PostDetailView(postId: post.id)) {
                                    AsyncImage(url: URL(string: post.mediaUrl)) { phase in
                                        switch phase {
                                        case .empty:
                                            ProgressView()
                                                .frame(width: 120, height: 120)
                                        case .success(let image):
                                            image
                                                .resizable()
                                                .aspectRatio(contentMode: .fill)
                                        case .failure:
                                            Rectangle()
                                                .fill(Color.gray.opacity(0.3))
                                        @unknown default:
                                            EmptyView()
                                        }
                                    }
                                    .frame(width: 120, height: 120)
                                    .clipped()
                                }
                            }
                        }
                    }
                } else if isLoading {
                    ProgressView()
                        .padding()
                } else {
                    VStack(spacing: 16) {
                        Text("Failed to load profile")
                            .foregroundColor(.secondary)
                        if let error = errorMessage {
                            Text(error)
                                .foregroundColor(.red)
                                .font(.caption)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                        }
                        Button("Retry") {
                            Task {
                                await loadProfile()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding()
                }
            }
            .navigationTitle("Profile")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Logout") {
                        authManager.logout()
                    }
                }
            }
            .task {
                await loadProfile()
            }
        }
    }
    
    private func loadProfile() async {
        guard let currentUser = authManager.currentUser else {
            print("❌ [ProfileView] No current user")
            await MainActor.run {
                isLoading = false
            }
            return
        }
        
        // Try username first, fallback to email if username is nil
        let username = currentUser.username ?? currentUser.email ?? currentUser.id
        print("👤 [ProfileView] Loading profile for: \(username)")
        
        isLoading = true
        errorMessage = nil
        do {
            let userProfile = try await ApiService.shared.fetchUserProfile(username: username)
            await MainActor.run {
                profile = userProfile
                isLoading = false
                print("✅ [ProfileView] Profile loaded successfully")
            }
        } catch {
            let errorMsg = error.localizedDescription
            print("❌ [ProfileView] Failed to load profile: \(errorMsg)")
            if let apiError = error as? ApiError {
                switch apiError {
                case .invalidURL:
                    print("❌ [ProfileView] Invalid URL")
                case .invalidResponse:
                    print("❌ [ProfileView] Invalid response")
                case .httpError(let code):
                    print("❌ [ProfileView] HTTP error: \(code)")
                case .decodingError(let err):
                    print("❌ [ProfileView] Decoding error: \(err.localizedDescription)")
                }
            }
            await MainActor.run {
                isLoading = false
                errorMessage = "Failed to load: \(errorMsg)"
            }
        }
    }
}

struct StatView: View {
    let value: String
    let label: String
    
    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.headline)
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

