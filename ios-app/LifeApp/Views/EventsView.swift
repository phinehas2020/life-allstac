//
//  EventsView.swift
//  LifeApp
//
//  Events list with modern card design and cached images
//

import SwiftUI

struct EventsView: View {
    @State private var events: [Event] = []
    @State private var isLoading = false
    @State private var selectedEvent: Event?

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()

                ScrollView {
                    if isLoading && events.isEmpty {
                        // Loading skeletons
                        VStack(spacing: Theme.Spacing.md) {
                            ForEach(0..<4, id: \.self) { _ in
                                EventCardSkeleton()
                            }
                        }
                        .padding()
                    } else if events.isEmpty {
                        emptyStateView
                    } else {
                        LazyVStack(spacing: Theme.Spacing.md) {
                            ForEach(events) { event in
                                EventCard(event: event)
                                    .onTapGesture {
                                        HapticManager.selection()
                                        selectedEvent = event
                                    }
                            }
                        }
                        .padding()
                    }
                }
                .refreshable {
                    await loadEvents()
                }
            }
            .navigationTitle("Events")
            .navigationBarTitleDisplayMode(.large)
            .task {
                await loadEvents()
            }
            .navigationDestination(item: $selectedEvent) { event in
                EventDetailView(eventId: event.id)
            }
        }
    }

    // MARK: - Empty State
    private var emptyStateView: some View {
        VStack(spacing: Theme.Spacing.lg) {
            FloatingIconView(systemName: "calendar")

            Text("No events yet")
                .font(Theme.Fonts.heading(size: 24))
                .foregroundColor(Theme.text)

            Text("Events you're following will\nappear here")
                .font(Theme.Fonts.body())
                .foregroundColor(Theme.secondaryText)
                .multilineTextAlignment(.center)
                .lineSpacing(4)

            Button(action: {
                Task { await loadEvents() }
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
        .padding(.top, 100)
        .padding(.horizontal, Theme.Spacing.xl)
    }

    private func loadEvents() async {
        isLoading = true
        do {
            let response = try await ApiService.shared.fetchEvents()
            withAnimation(.smooth) {
                events = response.events
                isLoading = false
            }
        } catch {
            withAnimation {
                isLoading = false
            }
        }
    }
}

// MARK: - Event Card
struct EventCard: View {
    let event: Event

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Cover image
            ZStack(alignment: .bottomLeading) {
                if let coverImage = event.coverImage, let url = URL(string: coverImage) {
                    CachedAsyncImage(url: url) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Rectangle()
                            .fill(Theme.subtleGradient)
                            .overlay(
                                Image(systemName: "calendar")
                                    .font(.system(size: 40))
                                    .foregroundColor(Theme.secondaryText.opacity(0.5))
                            )
                    }
                    .frame(height: 160)
                    .clipped()
                } else {
                    Rectangle()
                        .fill(Theme.subtleGradient)
                        .frame(height: 160)
                        .overlay(
                            Image(systemName: "calendar")
                                .font(.system(size: 40))
                                .foregroundColor(Theme.accent.opacity(0.5))
                        )
                }

                // Gradient overlay
                LinearGradient(
                    colors: [Color.black.opacity(0), Color.black.opacity(0.6)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 80)

                // Stats overlay
                HStack(spacing: Theme.Spacing.md) {
                    if let followerCount = event.followerCount {
                        statLabel(icon: "heart.fill", value: followerCount)
                    }
                    if let postCount = event.postCount {
                        statLabel(icon: "photo.fill", value: postCount)
                    }
                }
                .padding(Theme.Spacing.md)
            }
            .cornerRadius(Theme.Radius.lg, corners: [.topLeft, .topRight])

            // Content
            VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                Text(event.name)
                    .font(Theme.Fonts.heading(size: 18))
                    .foregroundColor(Theme.text)
                    .lineLimit(1)

                if let description = event.description {
                    Text(description)
                        .font(Theme.Fonts.body())
                        .foregroundColor(Theme.secondaryText)
                        .lineLimit(2)
                }

                if let startDate = event.startDate {
                    HStack(spacing: 6) {
                        Image(systemName: "calendar.badge.clock")
                            .font(.caption)
                            .foregroundColor(Theme.accent)
                        Text(formattedDate(startDate))
                            .font(Theme.Fonts.caption())
                            .foregroundColor(Theme.secondaryText)
                    }
                }
            }
            .padding(Theme.Spacing.md)
        }
        .background(Theme.surface)
        .cornerRadius(Theme.Radius.xl)
        .shadow(color: Color.black.opacity(0.06), radius: 12, x: 0, y: 6)
    }

    private func statLabel(icon: String, value: Int) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption)
            Text("\(value)")
                .font(Theme.Fonts.caption())
        }
        .foregroundColor(.white)
    }

    private func formattedDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else {
            return dateString
        }

        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "MMM d, yyyy"
        return displayFormatter.string(from: date)
    }
}

// MARK: - Corner Radius Extension
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

// MARK: - Event Detail View
struct EventDetailView: View {
    let eventId: String
    @State private var posts: [Post] = []
    @State private var isLoading = false

    private let columns = [
        GridItem(.flexible(), spacing: 2),
        GridItem(.flexible(), spacing: 2),
        GridItem(.flexible(), spacing: 2)
    ]

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            ScrollView {
                if isLoading && posts.isEmpty {
                    GridSkeleton(itemCount: 12)
                        .padding(2)
                } else if posts.isEmpty {
                    VStack(spacing: Theme.Spacing.lg) {
                        Image(systemName: "photo.on.rectangle")
                            .font(.system(size: 48))
                            .foregroundColor(Theme.secondaryText)
                        Text("No posts in this event yet")
                            .font(Theme.Fonts.body())
                            .foregroundColor(Theme.secondaryText)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 100)
                } else {
                    LazyVGrid(columns: columns, spacing: 2) {
                        ForEach(posts) { post in
                            NavigationLink(destination: PostDetailView(postId: post.id)) {
                                gridItem(post)
                            }
                        }
                    }
                    .padding(2)
                }
            }
        }
        .navigationTitle("Event")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadPosts()
        }
    }

    private func gridItem(_ post: Post) -> some View {
        let displayUrl = post.isVideo ? (post.thumbnailUrl ?? post.mediaUrl) : post.mediaUrl

        return GeometryReader { geometry in
            ZStack {
                CachedAsyncImage(url: URL(string: displayUrl)) { image in
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
            }
        }
        .aspectRatio(1, contentMode: .fit)
    }

    private func loadPosts() async {
        isLoading = true
        do {
            let response = try await ApiService.shared.fetchPosts(limit: 50, eventId: eventId)
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

// MARK: - Preview
struct EventsView_Previews: PreviewProvider {
    static var previews: some View {
        EventsView()
    }
}
