//
//  AuthenticationManager.swift
//  LifeApp
//
//  Manages user authentication state
//

import Foundation
import Combine

class AuthenticationManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    
    private let tokenManager = AuthTokenManager.shared
    
    init() {
        checkAuthenticationStatus()
    }
    
    /// Verify if we already have a valid session and hydrate state accordingly.
    @MainActor
    func checkSession() async {
        print("🔍 [AuthManager] Checking existing session...")
        checkAuthenticationStatus()
    }
    
    func checkAuthenticationStatus() {
        if let token = tokenManager.getAccessToken(), !token.isEmpty {
            isAuthenticated = true
            // Fetch current user profile asynchronously
            Task {
                await fetchCurrentUser()
            }
        } else {
            isAuthenticated = false
            currentUser = nil
        }
    }
    
    private func fetchCurrentUser() async {
        // If we already have a user from login, use that
        if currentUser != nil {
            return
        }
        
        // Fetch current user from Supabase auth endpoint
        do {
            let config = SupabaseConfig.shared
            guard let url = URL(string: "\(config.supabaseURL)/auth/v1/user") else {
                print("❌ [AuthManager] Invalid URL for user fetch")
                return
            }
            
            var request = URLRequest(url: url)
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            if let token = tokenManager.getAccessToken() {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                request.setValue(config.supabaseAnonKey, forHTTPHeaderField: "apikey")
            }
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                return
            }
            
            if httpResponse.statusCode == 401 || httpResponse.statusCode == 403 {
                print("❌ [AuthManager] Session expired or invalid. Logging out.")
                await MainActor.run {
                    self.logout()
                }
                return
            }
            
            guard httpResponse.statusCode == 200 else {
                print("❌ [AuthManager] Failed to fetch user: \(response)")
                return
            }
            
            // Parse user data
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let userId = json["id"] as? String,
               let email = json["email"] as? String {
                
                let userMetadata = json["user_metadata"] as? [String: Any]
                let username = userMetadata?["username"] as? String
                
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
                    created_at: (json["created_at"] as? String) ?? ""
                )
                
                await MainActor.run {
                    self.currentUser = user
                    print("✅ [AuthManager] Fetched current user: \(user.id)")
                }
                
                // Also fetch full profile from our API to get username
                Task {
                    do {
                        // Try to fetch by user ID first, then fallback to email if needed
                        let profile = try await ApiService.shared.fetchUserProfile(username: userId)
                        await MainActor.run {
                            // Update with full profile data
                            self.currentUser = profile.userModel
                            print("✅ [AuthManager] Updated with full profile data")
                        }
                    } catch {
                        // If fetching by ID fails, try email as fallback
                        do {
                            let profile = try await ApiService.shared.fetchUserProfile(username: email)
                            await MainActor.run {
                                self.currentUser = profile.userModel
                                print("✅ [AuthManager] Updated with full profile data (via email)")
                            }
                        } catch {
                            print("⚠️ [AuthManager] Could not fetch full profile: \(error.localizedDescription)")
                        }
                    }
                }
            }
        } catch {
            print("❌ [AuthManager] Error fetching current user: \(error.localizedDescription)")
        }
    }
    
    func login(email: String, password: String) async throws {
        print("🔑 [AuthManager] Login called for: \(email)")
        do {
            let response = try await ApiService.shared.login(email: email, password: password)
            print("🔑 [AuthManager] Login successful, saving tokens...")
            tokenManager.saveTokens(accessToken: response.access_token, refreshToken: response.refresh_token)
            
            // Update state on main thread
            await MainActor.run {
                currentUser = response.user
                isAuthenticated = true
                print("🔑 [AuthManager] Authentication state updated: isAuthenticated = \(isAuthenticated)")
            }
        } catch {
            print("❌ [AuthManager] Login failed: \(error.localizedDescription)")
            throw error
        }
    }
    
    func signup(email: String, password: String, username: String) async throws {
        print("🔑 [AuthManager] Signup called for: \(email)")
        do {
            let response = try await ApiService.shared.signup(email: email, password: password, username: username)
            print("🔑 [AuthManager] Signup successful, saving tokens...")
            tokenManager.saveTokens(accessToken: response.access_token, refreshToken: response.refresh_token)
            
            // Update state on main thread
            await MainActor.run {
                currentUser = response.user
                isAuthenticated = true
                print("🔑 [AuthManager] Authentication state updated: isAuthenticated = \(isAuthenticated)")
            }
        } catch {
            print("❌ [AuthManager] Signup failed: \(error.localizedDescription)")
            throw error
        }
    }
    
    func logout() {
        print("🔑 [AuthManager] Logout called")
        tokenManager.clearTokens()
        currentUser = nil
        isAuthenticated = false
        print("🔑 [AuthManager] Logout complete")
    }

    func refreshCurrentUser() async {
        guard let current = currentUser else { return }
        do {
            let profile = try await ApiService.shared.fetchUserProfile(username: current.id)
            await MainActor.run {
                self.currentUser = profile.userModel
            }
        } catch {
            print("⚠️ [AuthManager] Failed to refresh user: \(error.localizedDescription)")
        }
    }
}
