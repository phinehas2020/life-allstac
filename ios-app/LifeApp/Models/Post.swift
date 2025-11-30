//
//  Post.swift
//  LifeApp
//
//  Post model matching API response
//  Updated for modern UI support
//

import Foundation

struct Post: Codable, Identifiable {
    let id: String
    let caption: String?
    let mediaUrl: String  // camelCase from API
    let thumbnailUrl: String?
    let type: String
    let tags: [String]?
    let blurhash: String?
    let width: Int?
    let height: Int?
    let qualityScore: Double?  // camelCase from API
    let createdAt: String  // camelCase from API
    let user: PostUser?
    let stats: PostStats?
    let events: [EventSummary]?
    let likedByCurrentUser: Bool?
    
    // Comments are optional since they may not be in all responses
    var comments: [Comment]?
    
    enum CodingKeys: String, CodingKey {
        case id, caption, mediaUrl, thumbnailUrl, type, tags, blurhash, width, height
        case qualityScore, createdAt, user, stats, events, likedByCurrentUser, comments
    }
    
    struct PostUser: Codable {
        let id: String
        let username: String?
        let avatarUrl: String?  // camelCase from API
        let photographerStatus: String?  // camelCase from API
        let photographerInfluence: Double?  // camelCase from API
    }
    
    struct PostStats: Codable {
        let likes: Int
        let comments: Int
        let downloads: Int
    }
    
    struct EventSummary: Codable {
        let id: String
        let name: String
        let slug: String
        let coverImage: String?
    }
    
    struct Comment: Codable, Identifiable {
        let id: String
        let content: String
        let createdAt: String
        let user: CommentUser?
        
        struct CommentUser: Codable {
            let id: String
            let username: String?
            let avatarUrl: String?
        }
    }
    
    // Computed properties for compatibility
    var media_url: String {
        mediaUrl
    }
    
    var created_at: String {
        createdAt
    }
    
    var quality_score: Double? {
        qualityScore
    }
    
    var likeCount: Int {
        stats?.likes ?? 0
    }
    
    var commentCount: Int {
        stats?.comments ?? 0
    }
    
    var isVideo: Bool {
        type == "video"
    }
    
    var displayUsername: String {
        user?.username ?? "Unknown User"
    }
}

struct PostsResponse: Codable {
    let posts: [Post]
    let pagination: Pagination
    
    struct Pagination: Codable {
        let page: Int
        let limit: Int
        let hasMore: Bool
    }
    
    // Computed property for compatibility
    var hasMore: Bool {
        pagination.hasMore
    }
}
