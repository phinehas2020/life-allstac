//
//  EventsView.swift
//  LifeApp
//
//  Events list view
//

import SwiftUI

struct EventsView: View {
    @State private var events: [Event] = []
    @State private var isLoading = false
    
    var body: some View {
        NavigationView {
            List {
                ForEach(events) { event in
                    NavigationLink(destination: EventDetailView(eventId: event.id)) {
                        EventRowView(event: event)
                    }
                }
            }
            .navigationTitle("Events")
            .refreshable {
                await loadEvents()
            }
            .task {
                await loadEvents()
            }
        }
    }
    
    private func loadEvents() async {
        print("📅 [EventsView] Loading events...")
        isLoading = true
        do {
            let response = try await ApiService.shared.fetchEvents()
            await MainActor.run {
                events = response.events
                isLoading = false
                print("📅 [EventsView] Loaded \(response.events.count) events")
            }
        } catch {
            let errorMsg = error.localizedDescription
            print("❌ [EventsView] Failed to load events: \(errorMsg)")
            await MainActor.run {
                isLoading = false
            }
        }
    }
}

struct EventRowView: View {
    let event: Event
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(event.name)
                .font(.headline)
            
            if let description = event.description {
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
            
            HStack {
                if let followerCount = event.followerCount {
                    Label("\(followerCount)", systemImage: "heart")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                if let postCount = event.postCount {
                    Label("\(postCount)", systemImage: "photo")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct EventDetailView: View {
    let eventId: String
    @State private var posts: [Post] = []
    @State private var isLoading = false
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(posts) { post in
                    PostCardView(post: post)
                }
            }
            .padding()
        }
        .navigationTitle("Event")
        .task {
            await loadPosts()
        }
    }
    
    private func loadPosts() async {
        isLoading = true
        do {
            let response = try await ApiService.shared.fetchPosts(limit: 20, eventId: eventId)
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

