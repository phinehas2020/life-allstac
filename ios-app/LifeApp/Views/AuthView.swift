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
        ZStack {
            Theme.background.ignoresSafeArea()

            VStack(spacing: 30) {
                // Header
                VStack(spacing: 12) {
                    Text("The Who")
                        .font(Theme.Fonts.heading(size: 48))
                        .foregroundColor(Theme.text)

                    Text(isLoginMode ? "Welcome back" : "Join the community")
                        .font(Theme.Fonts.body(size: 18))
                        .foregroundColor(Theme.secondaryText)
                }
                .padding(.top, 60)
                
                // Form Container
                VStack(spacing: 20) {
                    if !isLoginMode {
                        CustomTextField(placeholder: "Username", text: $username, icon: "person")
                    }
                    
                    CustomTextField(placeholder: "Email", text: $email, icon: "envelope")
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                    
                    CustomSecureField(placeholder: "Password", text: $password)
                    
                    if let error = errorMessage {
                        Text(error)
                            .foregroundColor(.red)
                            .font(Theme.Fonts.caption())
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                    
                    Button(action: handleAuth) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Text(isLoginMode ? "Log In" : "Sign Up")
                                    .font(Theme.Fonts.body(size: 18).weight(.bold))
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Theme.text)
                        .foregroundColor(Theme.surface)
                        .cornerRadius(12)
                        .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: 5)
                    }
                    .disabled(isLoading || email.isEmpty || password.isEmpty)
                }
                .padding(.horizontal, 32)
                
                Spacer()

                // Toggle Mode
                Button(action: {
                    withAnimation {
                        isLoginMode.toggle()
                        errorMessage = nil
                    }
                }) {
                    Text(isLoginMode ? "New here? Create account" : "Have an account? Log in")
                        .font(Theme.Fonts.body())
                        .foregroundColor(Theme.text)
                        .underline()
                }
                .padding(.bottom, 40)
            }
        }
    }
    
    private func handleAuth() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                if isLoginMode {
                    try await authManager.login(email: email, password: password)
                } else {
                    guard !username.isEmpty else {
                        await MainActor.run {
                            errorMessage = "Username is required"
                            isLoading = false
                        }
                        return
                    }
                    try await authManager.signup(email: email, password: password, username: username)
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isLoading = false
                }
            }
        }
    }
}

// MARK: - Custom Components

struct CustomTextField: View {
    var placeholder: String
    @Binding var text: String
    var icon: String

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(Theme.secondaryText)
                .frame(width: 20)
            TextField(placeholder, text: $text)
                .foregroundColor(Theme.text)
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 2)
    }
}

struct CustomSecureField: View {
    var placeholder: String
    @Binding var text: String

    var body: some View {
        HStack {
            Image(systemName: "lock")
                .foregroundColor(Theme.secondaryText)
                .frame(width: 20)
            SecureField(placeholder, text: $text)
                .foregroundColor(Theme.text)
        }
        .padding()
        .background(Color.white)
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 2)
    }
}
