//
//  AuthView.swift
//  LifeApp
//
//  Authentication view (Login/Signup)
//

import SwiftUI

struct AuthView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @State private var isLoginMode = true
    @State private var email = ""
    @State private var password = ""
    @State private var username = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                // Logo/Branding
                VStack(spacing: 8) {
                    Text("Life.")
                        .font(.system(size: 48, weight: .bold))
                        .foregroundColor(.primary)
                }
                .padding(.top, 60)
                
                // Form
                VStack(spacing: 16) {
                    if !isLoginMode {
                        TextField("Username", text: $username)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .autocapitalization(.none)
                    }
                    
                    TextField("Email", text: $email)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .autocapitalization(.none)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()
                    
                    SecureField("Password", text: $password)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    if let error = errorMessage {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                    
                    Button(action: handleAuth) {
                        if isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text(isLoginMode ? "Log In" : "Sign Up")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                    .disabled(isLoading || email.isEmpty || password.isEmpty)
                    
                    Button(action: {
                        isLoginMode.toggle()
                        errorMessage = nil
                    }) {
                        Text(isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Log In")
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                }
                .padding(.horizontal, 32)
                
                Spacer()
            }
        }
    }
    
    private func handleAuth() {
        print("📱 [AuthView] handleAuth called - isLoginMode: \(isLoginMode)")
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                if isLoginMode {
                    print("📱 [AuthView] Attempting login...")
                    try await authManager.login(email: email, password: password)
                    print("📱 [AuthView] Login successful!")
                } else {
                    guard !username.isEmpty else {
                        await MainActor.run {
                            errorMessage = "Username is required"
                            isLoading = false
                        }
                        return
                    }
                    print("📱 [AuthView] Attempting signup...")
                    try await authManager.signup(email: email, password: password, username: username)
                    print("📱 [AuthView] Signup successful!")
                }
            } catch {
                let errorDescription = error.localizedDescription
                print("❌ [AuthView] Authentication error: \(errorDescription)")
                if let apiError = error as? ApiError {
                    switch apiError {
                    case .invalidURL:
                        print("❌ [AuthView] Invalid URL - check SupabaseConfig")
                    case .invalidResponse:
                        print("❌ [AuthView] Invalid response from server")
                    case .httpError(let code):
                        print("❌ [AuthView] HTTP error code: \(code)")
                    case .decodingError(let err):
                        print("❌ [AuthView] Decoding error: \(err.localizedDescription)")
                    }
                }
                await MainActor.run {
                    errorMessage = "Authentication failed: \(errorDescription)"
                    isLoading = false
                }
            }
        }
    }
}

