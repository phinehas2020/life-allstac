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
            ZStack {
                Theme.background.ignoresSafeArea()

                ScrollView {
                    if let profile = profile {
                        VStack(spacing: 24) {
                            // Profile header
                            VStack(spacing: 12) {
                                // Avatar
                                Circle()
                                    .fill(Color.gray.opacity(0.1))
                                    .frame(width: 100, height: 100)
                                    .overlay(
                                        Group {
                                            if let avatarUrl = profile.userModel.avatar_url, let url = URL(string: avatarUrl) {
                                                AsyncImage(url: url) { image in
                                                    image.resizable().aspectRatio(contentMode: .fill)
                                                } placeholder: {
                                                    Text(profile.userModel.displayName.prefix(1).uppercased())
                                                }
                                            } else {
                                                Text(profile.userModel.displayName.prefix(1).uppercased())
                                                    .font(Theme.Fonts.heading(size: 32))
                                                    .foregroundColor(Theme.secondaryText)
                                            }
                                        }
                                    )
                                    .clipShape(Circle())
                                    .shadow(color: Color.black.opacity(0.1), radius: 5)

                                Text(profile.userModel.displayName)
                                    .font(Theme.Fonts.heading(size: 24))
                                    .foregroundColor(Theme.text)

                                if let bio = profile.userModel.bio {
                                    Text(bio)
                                        .font(Theme.Fonts.body())
                                        .foregroundColor(Theme.secondaryText)
                                        .multilineTextAlignment(.center)
                                        .padding(.horizontal)
                                }

                                // Stats
                                HStack(spacing: 40) {
                                    StatView(value: "\(profile.stats.posts)", label: "Posts")
                                    StatView(value: "\(profile.stats.followers)", label: "Followers")
                                    StatView(value: "\(profile.stats.following)", label: "Following")
                                }
                                .padding(.top, 8)
                            }
                            .padding()
                            
                            // Posts grid
                            LazyVGrid(columns: [
                                GridItem(.flexible(), spacing: 2),
                                GridItem(.flexible(), spacing: 2),
                                GridItem(.flexible(), spacing: 2)
                            ], spacing: 2) {
                                ForEach(profile.recentPosts) { post in
                                    NavigationLink(destination: PostDetailView(postId: post.id)) {
                                        AsyncImage(url: URL(string: post.mediaUrl)) { phase in
                                            switch phase {
                                            case .empty:
                                                Rectangle()
                                                    .fill(Theme.background)
                                                    .aspectRatio(1, contentMode: .fill)
                                            case .success(let image):
                                                image
                                                    .resizable()
                                                    .aspectRatio(contentMode: .fill)
                                                    .frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity)
                                                    .clipped()
                                            case .failure:
                                                Rectangle()
                                                    .fill(Color.gray.opacity(0.1))
                                                    .aspectRatio(1, contentMode: .fill)
                                            @unknown default:
                                                EmptyView()
                                            }
                                        }
                                        .aspectRatio(1, contentMode: .fit)
                                    }
                                }
                            }
                        }
                    } else if isLoading {
                        ProgressView()
                            .padding(.top, 50)
                    } else {
                        VStack(spacing: 16) {
                            Text("Failed to load profile")
                                .font(Theme.Fonts.body())
                                .foregroundColor(Theme.secondaryText)

                            if let error = errorMessage {
                                Text(error)
                                    .foregroundColor(.red)
                                    .font(Theme.Fonts.caption())
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal)
                            }

                            Button(action: {
                                Task {
                                    await loadProfile()
                                }
                            }) {
                                Text("Retry")
                                    .font(Theme.Fonts.body().weight(.semibold))
                                    .padding()
                                    .background(Theme.text)
                                    .foregroundColor(Theme.surface)
                                    .cornerRadius(8)
                            }
                        }
                        .padding(.top, 50)
                    }
                }
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button(action: {
                            authManager.logout()
                        }) {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                                .foregroundColor(Theme.text)
                        }
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
                .font(Theme.Fonts.heading(size: 20))
                .foregroundColor(Theme.text)
            Text(label)
                .font(Theme.Fonts.caption())
                .foregroundColor(Theme.secondaryText)
        }
    }
}
