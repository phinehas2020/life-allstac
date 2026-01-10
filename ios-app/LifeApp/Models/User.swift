//
//  User.swift
//  LifeApp
//
//  User model matching API response
//

import Foundation

struct User: Codable, Identifiable {
    let id: String
    let username: String?
    let email: String?
    let avatar_url: String?
    let bio: String?
    let photographer_status: String?
    let photographer_influence: Double?
    let photographer_total_ratings: Int?
    let photographer_accuracy_percentage: Double?
    let is_admin: Bool?
    let created_at: String
    
    var displayName: String {
        username ?? email ?? "Unknown User"
    }
    
    var isApprovedPhotographer: Bool {
        photographer_status == "approved"
    }
}

struct UserProfile: Codable {
    let user: UserProfileData
    let stats: UserStats
    let recentPosts: [Post]
    let relationships: UserRelationships
    
    struct UserProfileData: Codable {
        let id: String
        let username: String?
        let avatarUrl: String?
        let bio: String?
        let photographerStatus: String?
        let photographerInfluence: Double?
        let createdAt: String
    }
    
    struct UserStats: Codable {
        let posts: Int
        let followers: Int
        let following: Int
    }
    
    struct UserRelationships: Codable {
        let isCurrentUser: Bool
        let isFollowing: Bool
    }
    
    // Computed property to convert to User type
    var userModel: User {
        User(
            id: user.id,
            username: user.username,
            email: nil,
            avatar_url: user.avatarUrl,
            bio: user.bio,
            photographer_status: user.photographerStatus,
            photographer_influence: user.photographerInfluence,
            photographer_total_ratings: nil,
            photographer_accuracy_percentage: nil,
            is_admin: nil,
            created_at: user.createdAt
        )
    }
    
    // Compatibility properties
    var followerCount: Int {
        stats.followers
    }
    
    var followingCount: Int {
        stats.following
    }
    
    var isFollowing: Bool {
        relationships.isFollowing
    }
    
    var postsList: [Post] {
        recentPosts
    }
}

// MARK: - Notifications

struct LifeNotification: Codable, Identifiable {
    let id: String
    let userId: String
    let actorId: String
    let type: NotificationType
    let resourceId: String?
    let content: String?
    var isRead: Bool
    let createdAt: String
    let actor: User?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case actorId = "actor_id"
        case type
        case resourceId = "resource_id"
        case content
        case isRead = "is_read"
        case createdAt = "created_at"
        case actor
    }
}

enum NotificationType: String, Codable {
    case like
    case comment
    case follow
    case message
}

struct NotificationsResponse: Codable {
    let notifications: [LifeNotification]
}


// MARK: - Direct Messages

struct MessageThread: Codable, Identifiable, Hashable {
    let id: String
    let userA: String
    let userB: String
    let createdAt: String
    let userAProfile: UserSummary?
    let userBProfile: UserSummary?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userA = "user_a"
        case userB = "user_b"
        case createdAt = "created_at"
        case userAProfile = "user_a_profile"
        case userBProfile = "user_b_profile"
    }
}

struct Message: Codable, Identifiable {
    let id: String
    let threadId: String
    let senderId: String
    let body: String
    let createdAt: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case threadId = "thread_id"
        case senderId = "sender_id"
        case body
        case createdAt = "created_at"
    }
}

struct UserSummary: Codable, Identifiable, Hashable {
    let id: String
    let username: String?
    let avatarUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case username
        case avatarUrl = "avatar_url"
    }
}

struct MessageThreadsResponse: Codable {
    let threads: [MessageThread]
}

struct MessagesResponse: Codable {
    let messages: [Message]
}

struct SendMessageResponse: Codable {
    let message: Message
}

struct CreateThreadResponse: Codable {
    let threadId: String
}
