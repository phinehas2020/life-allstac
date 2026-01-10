//
//  CommentsSheetView.swift
//  LifeApp
//
//  Bottom sheet for comments (slides up 1/3 of screen)
//

import SwiftUI

struct CommentsSheetView: View {
    let postId: String
    let initialComments: [Post.Comment]?
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var authManager: AuthenticationManager

    @State private var comments: [Post.Comment] = []
    @State private var newComment = ""
    @State private var isSubmitting = false
    @State private var isLoading = false
    @FocusState private var isInputFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            // Handle bar
            handleBar

            // Header
            headerView

            Divider()
                .background(Color.gray.opacity(0.3))

            // Comments list
            if isLoading && comments.isEmpty {
                loadingView
            } else if comments.isEmpty {
                emptyStateView
            } else {
                commentsList
            }

            Divider()
                .background(Color.gray.opacity(0.3))

            // Input field
            inputField
        }
        .background(Theme.surface)
        .onAppear {
            comments = initialComments ?? []
            if comments.isEmpty {
                Task { await loadComments() }
            }
        }
    }

    // MARK: - Handle Bar
    private var handleBar: some View {
        Capsule()
            .fill(Color.gray.opacity(0.4))
            .frame(width: 36, height: 5)
            .padding(.top, 10)
            .padding(.bottom, 6)
    }

    // MARK: - Header
    private var headerView: some View {
        HStack {
            Text("Comments")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Theme.text)

            Spacer()

            Button(action: { dismiss() }) {
                Image(systemName: "xmark.circle.fill")
                    .font(.title2)
                    .foregroundColor(Theme.secondaryText)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 12)
    }

    // MARK: - Loading View
    private var loadingView: some View {
        VStack {
            Spacer()
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: Theme.accent))
            Spacer()
        }
    }

    // MARK: - Empty State
    private var emptyStateView: some View {
        VStack(spacing: 12) {
            Spacer()

            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 50))
                .foregroundColor(Theme.secondaryText.opacity(0.5))

            Text("No comments yet")
                .font(.system(size: 17, weight: .semibold))
                .foregroundColor(Theme.text)

            Text("Be the first to comment")
                .font(.system(size: 15))
                .foregroundColor(Theme.secondaryText)

            Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Comments List
    private var commentsList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(comments) { comment in
                    CommentRow(comment: comment)
                        .padding(.horizontal)
                        .padding(.vertical, 12)

                    Divider()
                        .background(Color.gray.opacity(0.2))
                        .padding(.leading, 56)
                }
            }
        }
    }

    // MARK: - Input Field
    private var inputField: some View {
        HStack(spacing: 12) {
            // Avatar
            Circle()
                .fill(Theme.subtleGradient)
                .frame(width: 36, height: 36)
                .overlay(
                    Text(authManager.currentUser?.username?.prefix(1).uppercased() ?? "U")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Theme.accent)
                )

            // Text field
            TextField("Add a comment...", text: $newComment)
                .font(.system(size: 15))
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Theme.background)
                .cornerRadius(20)
                .focused($isInputFocused)

            // Send button
            Button(action: submitComment) {
                if isSubmitting {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: Theme.accent))
                        .frame(width: 32, height: 32)
                } else {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 32))
                        .foregroundColor(newComment.isEmpty ? Theme.secondaryText : Theme.accent)
                }
            }
            .disabled(newComment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSubmitting)
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
        .background(Theme.surface)
    }

    // MARK: - Actions
    private func loadComments() async {
        isLoading = true
        do {
            let post = try await ApiService.shared.fetchPost(id: postId)
            await MainActor.run {
                comments = post.comments ?? []
                isLoading = false
            }
        } catch {
            await MainActor.run {
                isLoading = false
            }
        }
    }

    private func submitComment() {
        let content = newComment.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !content.isEmpty else { return }

        isSubmitting = true
        HapticManager.impact(.light)

        Task {
            do {
                let comment = try await ApiService.shared.commentOnPost(postId: postId, content: content)
                await MainActor.run {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        comments.append(comment)
                    }
                    newComment = ""
                    isSubmitting = false
                    isInputFocused = false
                }
                HapticManager.notification(.success)
            } catch {
                await MainActor.run {
                    isSubmitting = false
                }
                HapticManager.notification(.error)
            }
        }
    }
}

// MARK: - Comment Row
struct CommentRow: View {
    let comment: Post.Comment

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Avatar
            Circle()
                .fill(Theme.subtleGradient)
                .frame(width: 36, height: 36)
                .overlay(
                    Text(comment.user?.username?.prefix(1).uppercased() ?? "U")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Theme.accent)
                )

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(comment.user?.username ?? "Unknown")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(Theme.text)

                    Text(formattedDate)
                        .font(.system(size: 12))
                        .foregroundColor(Theme.secondaryText)
                }

                Text(comment.content)
                    .font(.system(size: 15))
                    .foregroundColor(Theme.text)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer()

            // Like comment button
            Button(action: {}) {
                Image(systemName: "heart")
                    .font(.system(size: 14))
                    .foregroundColor(Theme.secondaryText)
            }
        }
    }

    private var formattedDate: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        var date = formatter.date(from: comment.createdAt)
        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: comment.createdAt)
        }

        guard let parsedDate = date else { return "" }

        let relativeFormatter = RelativeDateTimeFormatter()
        relativeFormatter.unitsStyle = .abbreviated
        return relativeFormatter.localizedString(for: parsedDate, relativeTo: Date())
    }
}
