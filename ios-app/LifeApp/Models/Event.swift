//
//  Event.swift
//  LifeApp
//
//  Event model matching API response
//

import Foundation

struct Event: Codable, Identifiable {
    let id: String
    let name: String
    let slug: String
    let description: String?
    let startDate: String?  // camelCase from API
    let endDate: String?  // camelCase from API
    let coverImage: String?  // camelCase from API
    let isFeatured: Bool?  // camelCase from API
    let isFollowing: Bool?  // camelCase from API
    let followerCount: Int?  // camelCase from API
    let postCount: Int?  // camelCase from API
    
    // Computed properties for compatibility
    var start_date: String? { startDate }
    var end_date: String? { endDate }
    var cover_image_url: String? { coverImage }
    var created_by: String { "" } // Not returned by mobile API
    var created_at: String { "" } // Not returned by mobile API
}

struct EventsResponse: Codable {
    let events: [Event]
}

