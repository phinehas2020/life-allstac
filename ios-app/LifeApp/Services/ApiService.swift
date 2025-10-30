//
//  ApiService.swift
//  LifeApp
//
//  API service for communicating with Life backend
//

import Foundation

class ApiService {
    static let shared = ApiService()
    
    // Update this with your deployed backend URL
    private let baseURL = "https://life.allstac.com/api/mobile"
    
    private init() {
        // Verify Supabase is configured
        let config = SupabaseConfig.shared
        if config.supabaseURL == "https://your-project.supabase.co" {
            print("⚠️ WARNING: Supabase credentials not configured!")
            print("Update SupabaseConfig.swift..swift with your Supabase URL and anon key")
        }
    }
    
    // MARK: - Authentication
    
    /// Authenticate directly with Supabase
    /// Note: You need to configure SupabaseConfig.swift with your credentials
    func login(email: String, password: String) async throws -> AuthResponse {
        let config = SupabaseConfig.shared
        print("🔐 [LOGIN] Starting authentication...")
        print("🔐 [LOGIN] Supabase URL: \(config.supabaseURL)")
        print("🔐 [LOGIN] Anon Key configured: \(!config.supabaseAnonKey.isEmpty ? "Yes" : "No")")
        print("🔐 [LOGIN] Email: \(email)")
        
        guard let url = URL(string: "\(config.supabaseURL)/auth/v1/token?grant_type=password") else {
            print("❌ [LOGIN] Invalid URL: \(config.supabaseURL)/auth/v1/token?grant_type=password")
            throw ApiError.invalidURL
        }
        
        print("🔐 [LOGIN] Request URL: \(url.absoluteString)")
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(config.supabaseAnonKey, forHTTPHeaderField: "apikey")
        
        let body: [String: Any] = [
            "email": email,
            "password": password
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        print("🔐 [LOGIN] Sending request...")
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ [LOGIN] Invalid response type")
                throw ApiError.invalidResponse
            }
            
            print("🔐 [LOGIN] Response status code: \(httpResponse.statusCode)")
            
            if let responseString = String(data: data, encoding: .utf8) {
                print("🔐 [LOGIN] Response body: \(responseString.prefix(500))")
            }
            
            if httpResponse.statusCode == 200 {
                // Parse Supabase response
                let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                print("🔐 [LOGIN] Parsing response JSON...")
                
                guard let accessToken = json?["access_token"] as? String,
                      let refreshToken = json?["refresh_token"] as? String,
                      let userDict = json?["user"] as? [String: Any],
                      let userId = userDict["id"] as? String else {
                    print("❌ [LOGIN] Missing required fields in response")
                    print("❌ [LOGIN] JSON keys: \(json?.keys.joined(separator: ", ") ?? "none")")
                    throw ApiError.invalidResponse
                }
                
                print("✅ [LOGIN] Success! User ID: \(userId)")
                print("✅ [LOGIN] Access token: \(accessToken.prefix(20))...")
                
                // Create User object (simplified - you may need to fetch full user profile)
                let user = User(
                    id: userId,
                    username: userDict["email"] as? String,
                    email: userDict["email"] as? String,
                    avatar_url: nil,
                    bio: nil,
                    photographer_status: nil,
                    photographer_influence: nil,
                    photographer_total_ratings: nil,
                    photographer_accuracy_percentage: nil,
                    is_admin: nil,
                    created_at: (userDict["created_at"] as? String) ?? ""
                )
                
                return AuthResponse(access_token: accessToken, refresh_token: refreshToken, user: user)
            } else {
                let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
                print("❌ [LOGIN] HTTP Error \(httpResponse.statusCode): \(errorMessage)")
                throw ApiError.httpError(httpResponse.statusCode)
            }
        } catch {
            print("❌ [LOGIN] Exception: \(error.localizedDescription)")
            if let urlError = error as? URLError {
                print("❌ [LOGIN] URL Error code: \(urlError.code.rawValue)")
                print("❌ [LOGIN] URL Error description: \(urlError.localizedDescription)")
            }
            throw error
        }
    }
    
    /// Sign up directly with Supabase
    /// Note: You need to configure SupabaseConfig.swift with your credentials
    func signup(email: String, password: String, username: String) async throws -> AuthResponse {
        let config = SupabaseConfig.shared
        guard let url = URL(string: "\(config.supabaseURL)/auth/v1/signup") else {
            throw ApiError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(config.supabaseAnonKey, forHTTPHeaderField: "apikey")
        
        let body: [String: Any] = [
            "email": email,
            "password": password,
            "data": ["username": username] // Custom user metadata
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw ApiError.invalidResponse
        }
        
        if httpResponse.statusCode == 200 {
            // Parse Supabase response
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            guard let accessToken = json?["access_token"] as? String,
                  let refreshToken = json?["refresh_token"] as? String,
                  let userDict = json?["user"] as? [String: Any],
                  let userId = userDict["id"] as? String else {
                throw ApiError.invalidResponse
            }
            
            // Create User object (simplified - you may need to fetch full user profile)
            let user = User(
                id: userId,
                username: username,
                email: email,
                avatar_url: nil,
                bio: nil,
                photographer_status: nil,
                photographer_influence: nil,
                photographer_total_ratings: nil,
                photographer_accuracy_percentage: nil,
                is_admin: nil,
                created_at: (userDict["created_at"] as? String) ?? ""
            )
            
            return AuthResponse(access_token: accessToken, refresh_token: refreshToken, user: user)
        } else {
            throw ApiError.httpError(httpResponse.statusCode)
        }
    }
    
    // MARK: - Posts
    
    func fetchPosts(limit: Int = 20, page: Int = 0, eventId: String? = nil) async throws -> PostsResponse {
        var urlString = "\(baseURL)/posts?limit=\(limit)&page=\(page)"
        if let eventId = eventId {
            urlString += "&event_id=\(eventId)"
        }
        
        print("📡 [API] Fetching posts - URL: \(urlString)")
        
        guard let url = URL(string: urlString) else {
            print("❌ [API] Invalid URL: \(urlString)")
            throw ApiError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = AuthTokenManager.shared.getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            print("📡 [API] Authorization header added")
        } else {
            print("⚠️ [API] No auth token available")
        }
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ [API] Invalid response type")
                throw ApiError.invalidResponse
            }
            
            print("📡 [API] Response status: \(httpResponse.statusCode)")
            
            if httpResponse.statusCode != 200 {
                let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
                print("❌ [API] Error response: \(errorBody)")
                throw ApiError.httpError(httpResponse.statusCode)
            }
            
            if let responseString = String(data: data, encoding: .utf8) {
                print("📡 [API] Response body preview: \(responseString.prefix(500))")
            }
            
            let decoded = try JSONDecoder().decode(PostsResponse.self, from: data)
            print("✅ [API] Decoded \(decoded.posts.count) posts, hasMore: \(decoded.hasMore)")
            return decoded
        } catch {
            print("❌ [API] Decode error: \(error.localizedDescription)")
            if let decodingError = error as? DecodingError {
                print("❌ [API] Decoding details: \(decodingError)")
            }
            throw error
        }
    }
    
    func fetchPost(id: String) async throws -> Post {
        let urlString = "\(baseURL)/posts/\(id)"
        print("📡 [API] Fetching post - ID: \(id)")
        print("📡 [API] URL: \(urlString)")
        
        guard let url = URL(string: urlString) else {
            print("❌ [API] Invalid URL: \(urlString)")
            throw ApiError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = AuthTokenManager.shared.getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            print("📡 [API] Authorization header added")
        }
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ [API] Invalid response type")
                throw ApiError.invalidResponse
            }
            
            print("📡 [API] Response status: \(httpResponse.statusCode)")
            
            if httpResponse.statusCode != 200 {
                let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
                print("❌ [API] Error response: \(errorBody)")
                throw ApiError.httpError(httpResponse.statusCode)
            }
            
            if let responseString = String(data: data, encoding: .utf8) {
                print("📡 [API] Response body preview: \(responseString.prefix(500))")
            }
            
            // Check if response has "post" wrapper
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let postData = json["post"] as? [String: Any] {
                // Response is wrapped: { post: {...} }
                let postDataJson = try JSONSerialization.data(withJSONObject: postData)
                let decoded = try JSONDecoder().decode(Post.self, from: postDataJson)
                print("✅ [API] Decoded post successfully")
                return decoded
            } else {
                // Response is direct Post object
                let decoded = try JSONDecoder().decode(Post.self, from: data)
                print("✅ [API] Decoded post successfully")
                return decoded
            }
        } catch {
            print("❌ [API] Decode error: \(error.localizedDescription)")
            if let decodingError = error as? DecodingError {
                print("❌ [API] Decoding details: \(decodingError)")
            }
            throw error
        }
    }
    
    func likePost(postId: String) async throws {
        guard let url = URL(string: "\(baseURL)/posts/\(postId)/like") else {
            throw ApiError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = AuthTokenManager.shared.getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw ApiError.invalidResponse
        }
    }
    
    func commentOnPost(postId: String, content: String) async throws -> Post.Comment {
        guard let url = URL(string: "\(baseURL)/posts/\(postId)/comment") else {
            throw ApiError.invalidURL
        }
        
        print("💬 [API] Commenting on post: \(postId)")
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = AuthTokenManager.shared.getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            print("💬 [API] Authorization header added")
        }
        
        let body = ["content": content]
        request.httpBody = try JSONEncoder().encode(body)
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ [API] Invalid response type")
                throw ApiError.invalidResponse
            }
            
            print("💬 [API] Response status: \(httpResponse.statusCode)")
            
            if httpResponse.statusCode != 200 {
                let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
                print("❌ [API] Error response: \(errorBody)")
                throw ApiError.httpError(httpResponse.statusCode)
            }
            
            let decoded = try JSONDecoder().decode(Post.Comment.self, from: data)
            print("✅ [API] Comment created successfully")
            return decoded
        } catch {
            print("❌ [API] Comment error: \(error.localizedDescription)")
            throw error
        }
    }
    
    // MARK: - Photo Ratings
    
    func ratePost(postId: String, rating: Int) async throws {
        guard let url = URL(string: "\(baseURL)/posts/\(postId)/rate") else {
            throw ApiError.invalidURL
        }
        
        print("⭐ [API] Rating post: \(postId) with rating: \(rating)")
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = AuthTokenManager.shared.getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            print("⭐ [API] Authorization header added")
        }
        
        let body = ["rating": rating]
        request.httpBody = try JSONEncoder().encode(body)
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ [API] Invalid response type")
                throw ApiError.invalidResponse
            }
            
            print("⭐ [API] Response status: \(httpResponse.statusCode)")
            
            if httpResponse.statusCode != 200 {
                let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
                print("❌ [API] Error response: \(errorBody)")
                throw ApiError.httpError(httpResponse.statusCode)
            }
            
            print("✅ [API] Rating submitted successfully")
        } catch {
            print("❌ [API] Rate error: \(error.localizedDescription)")
            throw error
        }
    }
    
    func fetchExistingRating(postId: String) async throws -> Int? {
        guard let url = URL(string: "\(baseURL)/posts/\(postId)/rating") else {
            throw ApiError.invalidURL
        }
        
        print("⭐ [API] Fetching existing rating for post: \(postId)")
        
        var request = URLRequest(url: url)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = AuthTokenManager.shared.getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw ApiError.invalidResponse
            }
            
            if httpResponse.statusCode == 200 {
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let rating = json["rating"] as? Int {
                    print("✅ [API] Found existing rating: \(rating)")
                    return rating
                } else if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                          json["rating"] as? NSNull != nil {
                    print("✅ [API] No existing rating")
                    return nil
                }
            }
            
            return nil
        } catch {
            print("❌ [API] Error fetching rating: \(error.localizedDescription)")
            return nil
        }
    }
    
    // MARK: - Events
    
    func fetchEvents() async throws -> EventsResponse {
        guard let url = URL(string: "\(baseURL)/events") else {
            throw ApiError.invalidURL
        }
        
        print("📅 [API] Fetching events - URL: \(url.absoluteString)")
        
        var request = URLRequest(url: url)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = AuthTokenManager.shared.getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            print("📅 [API] Authorization header added")
        }
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ [API] Invalid response type")
                throw ApiError.invalidResponse
            }
            
            print("📅 [API] Response status: \(httpResponse.statusCode)")
            
            if httpResponse.statusCode != 200 {
                let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
                print("❌ [API] Error response: \(errorBody)")
                throw ApiError.httpError(httpResponse.statusCode)
            }
            
            if let responseString = String(data: data, encoding: .utf8) {
                print("📅 [API] Response body preview: \(responseString.prefix(500))")
            }
            
            let decoded = try JSONDecoder().decode(EventsResponse.self, from: data)
            print("✅ [API] Decoded \(decoded.events.count) events")
            return decoded
        } catch {
            print("❌ [API] Decode error: \(error.localizedDescription)")
            if let decodingError = error as? DecodingError {
                print("❌ [API] Decoding details: \(decodingError)")
            }
            throw error
        }
    }
    
    func followEvent(eventId: String) async throws {
        guard let url = URL(string: "\(baseURL)/events/\(eventId)/follow") else {
            throw ApiError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = AuthTokenManager.shared.getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw ApiError.invalidResponse
        }
    }
    
    // MARK: - Users
    
    func fetchUserProfile(username: String) async throws -> UserProfile {
        // Properly encode the username/email for URL path
        // URL encode @ as %40 by using a character set that excludes it
        let encodedUsername = username
            .addingPercentEncoding(withAllowedCharacters: CharacterSet.urlPathAllowed)?
            .replacingOccurrences(of: "@", with: "%40") ?? username
        let urlString = "\(baseURL)/users/\(encodedUsername)"
        
        print("👤 [API] Fetching user profile - username: \(username)")
        print("👤 [API] Encoded username: \(encodedUsername)")
        print("👤 [API] URL: \(urlString)")
        
        guard let url = URL(string: urlString) else {
            print("❌ [API] Invalid URL: \(urlString)")
            throw ApiError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = AuthTokenManager.shared.getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            print("👤 [API] Authorization header added")
        } else {
            print("⚠️ [API] No auth token available")
        }
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                print("❌ [API] Invalid response type")
                throw ApiError.invalidResponse
            }
            
            print("👤 [API] Response status: \(httpResponse.statusCode)")
            
            if httpResponse.statusCode != 200 {
                let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
                print("❌ [API] Error response: \(errorBody)")
                throw ApiError.httpError(httpResponse.statusCode)
            }
            
            if let responseString = String(data: data, encoding: .utf8) {
                print("👤 [API] Response body preview: \(responseString.prefix(500))")
            }
            
            let decoded = try JSONDecoder().decode(UserProfile.self, from: data)
            print("✅ [API] Decoded user profile: \(decoded.user.username ?? decoded.user.id)")
            return decoded
        } catch {
            print("❌ [API] Decode error: \(error.localizedDescription)")
            if let decodingError = error as? DecodingError {
                print("❌ [API] Decoding details: \(decodingError)")
            }
            throw error
        }
    }
    
    func followUser(userId: String) async throws {
        guard let url = URL(string: "\(baseURL)/users/\(userId)/follow") else {
            throw ApiError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = AuthTokenManager.shared.getAccessToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw ApiError.invalidResponse
        }
    }
}

// MARK: - Error Types

enum ApiError: Error {
    case invalidURL
    case invalidResponse
    case httpError(Int)
    case decodingError(Error)
    
    var localizedDescription: String {
        switch self {
        case .invalidURL:
            return "Invalid URL. Please check Supabase configuration."
        case .invalidResponse:
            return "Invalid response from server."
        case .httpError(let code):
            return "HTTP error \(code). Please check your credentials and try again."
        case .decodingError(let error):
            return "Failed to parse response: \(error.localizedDescription)"
        }
    }
}

// MARK: - Auth Models

struct AuthResponse: Codable {
    let access_token: String
    let refresh_token: String
    let user: User
}

