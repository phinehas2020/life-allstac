//
//  PostDetailView.swift
//  LifeApp
//
//  Post detail view with comments
//

import SwiftUI

struct PostDetailView: View {
    let postId: String
    @State private var post: Post?
    @State private var isLoading = false
    @State private var newComment = ""
    @State private var isSubmittingComment = false
    @State private var isPhotographer = false
    @State private var photographerInfluence: Double = 1.0
    @State private var existingRating: Int?
    @State private var selectedRating: Int = 0
    @State private var showRatingSheet = false
    @EnvironmentObject var authManager: AuthenticationManager
    
    var body: some View {
        ScrollView {
            if let post = post {
                VStack(alignment: .leading, spacing: 16) {
                    // Media
                    if post.isVideo {
                        VideoPlayerView(url: post.mediaUrl)
                            .frame(height: 500)
                    } else {
                        PostImageView(url: post.mediaUrl, height: 500)
                    }
                    
                    // Post info
                    VStack(alignment: .leading, spacing: 12) {
                        // User info
                        HStack {
                            Circle()
                                .fill(Color.blue.opacity(0.3))
                                .frame(width: 40, height: 40)
                                .overlay(
                                    Text(post.displayUsername.prefix(1).uppercased())
                                        .font(.caption)
                                        .foregroundColor(.blue)
                                )
                            
                            Text(post.displayUsername)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            
                            Spacer()
                        }
                        
                        // Caption
                        if let caption = post.caption {
                            Text(caption)
                                .font(.body)
                        }
                        
                        // Tags
                        if let tags = post.tags, !tags.isEmpty {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack {
                                    ForEach(tags, id: \.self) { tag in
                                        Text("#\(tag)")
                                            .font(.caption)
                                            .foregroundColor(.blue)
                                    }
                                }
                            }
                        }
                        
                        // Comments section
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Comments")
                                .font(.headline)
                                .padding(.top)
                            
                            // Rating button for photographers (if not post owner)
                            if isPhotographer, let postUserId = post.user?.id, 
                               let currentUserId = authManager.currentUser?.id,
                               postUserId != currentUserId {
                                Button(action: { showRatingSheet = true }) {
                                    HStack {
                                        Image(systemName: "star.fill")
                                            .foregroundColor(.yellow)
                                        Text(existingRating != nil ? "Update Rating (\(existingRating!)★)" : "Rate This Photo")
                                            .fontWeight(.semibold)
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color.blue.opacity(0.1))
                                    .cornerRadius(8)
                                }
                            }
                            
                            // Comment input
                            HStack {
                                TextField("Add a comment...", text: $newComment)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                
                                Button(action: submitComment) {
                                    if isSubmittingComment {
                                        ProgressView()
                                    } else {
                                        Image(systemName: "paperplane.fill")
                                            .foregroundColor(.blue)
                                    }
                                }
                                .disabled(newComment.isEmpty || isSubmittingComment)
                            }
                            
                            // Comments list
                            ForEach(post.comments ?? []) { comment in
                                CommentRowView(comment: comment)
                            }
                        }
                    }
                    .padding()
                }
            } else if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .navigationTitle("Post")
        .task {
            await loadPost()
            await checkPhotographerStatus()
        }
        .sheet(isPresented: $showRatingSheet) {
            RatingSheetView(
                postId: postId,
                postCreatedAt: post?.createdAt ?? "",
                existingRating: existingRating,
                photographerInfluence: photographerInfluence,
                onRatingSubmitted: {
                    showRatingSheet = false
                    Task {
                        await checkExistingRating()
                        await loadPost()
                    }
                }
            )
        }
    }
    
    private func loadPost() async {
        print("📖 [PostDetailView] Loading post: \(postId)")
        isLoading = true
        do {
            let loadedPost = try await ApiService.shared.fetchPost(id: postId)
            await MainActor.run {
                post = loadedPost
                isLoading = false
                print("📖 [PostDetailView] Post loaded successfully")
            }
        } catch {
            let errorMsg = error.localizedDescription
            print("❌ [PostDetailView] Failed to load post: \(errorMsg)")
            await MainActor.run {
                isLoading = false
            }
        }
    }
    
    private func checkPhotographerStatus() async {
        guard let currentUser = authManager.currentUser else {
            print("📖 [PostDetailView] No current user for photographer check")
            return
        }
        
        do {
            let profile = try await ApiService.shared.fetchUserProfile(username: currentUser.id)
            await MainActor.run {
                if profile.user.photographerStatus == "approved" {
                    isPhotographer = true
                    photographerInfluence = profile.user.photographerInfluence ?? 1.0
                    print("📖 [PostDetailView] User is approved photographer, influence: \(photographerInfluence)")
                }
            }
            
            // Check existing rating
            await checkExistingRating()
        } catch {
            print("❌ [PostDetailView] Failed to check photographer status: \(error.localizedDescription)")
        }
    }
    
    private func checkExistingRating() async {
        guard let currentUser = authManager.currentUser else { return }
        
        do {
            let rating = try await ApiService.shared.fetchExistingRating(postId: postId)
            await MainActor.run {
                existingRating = rating
                selectedRating = rating ?? 0
                print("📖 [PostDetailView] Existing rating: \(rating?.description ?? "none")")
            }
        } catch {
            // No rating found is fine
            await MainActor.run {
                existingRating = nil
                selectedRating = 0
            }
        }
    }
    
    private func submitComment() {
        guard !newComment.isEmpty, let currentPost = post, let postId = post?.id else { return }
        
        isSubmittingComment = true
        
        Task {
            do {
                let comment = try await ApiService.shared.commentOnPost(postId: postId, content: newComment)
                await MainActor.run {
                    // Update comments array
                    var updatedPost = currentPost
                    if updatedPost.comments == nil {
                        updatedPost.comments = []
                    }
                    updatedPost.comments?.append(comment)
                    post = updatedPost
                    newComment = ""
                    isSubmittingComment = false
                }
            } catch {
                await MainActor.run {
                    isSubmittingComment = false
                }
            }
        }
    }
}

struct CommentRowView: View {
    let comment: Post.Comment
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Circle()
                .fill(Color.blue.opacity(0.3))
                .frame(width: 32, height: 32)
                .overlay(
                    Text(comment.user?.username?.prefix(1).uppercased() ?? "U")
                        .font(.caption2)
                        .foregroundColor(.blue)
                )
            
            VStack(alignment: .leading, spacing: 4) {
                Text(comment.user?.username ?? "Unknown")
                    .font(.caption)
                    .fontWeight(.semibold)
                
                Text(comment.content)
                    .font(.subheadline)
            }
            
            Spacer()
        }
        .padding(.vertical, 4)
    }
}

