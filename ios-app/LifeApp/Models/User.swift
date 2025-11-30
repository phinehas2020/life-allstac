//
//  User.swift
//  LifeApp
//
//  User model matching API response
//  Updated for modern UI support
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
