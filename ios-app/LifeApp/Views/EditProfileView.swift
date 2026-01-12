//
//  EditProfileView.swift
//  LifeApp
//
//  Edit user profile
//

import SwiftUI
import PhotosUI

struct EditProfileView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var authManager: AuthenticationManager

    @State private var username: String
    @State private var bio: String
    @State private var avatarItem: PhotosPickerItem?
    @State private var avatarImage: Image?
    @State private var avatarData: Data?
    @State private var isLoading = false
    @State private var errorMessage: String?

    private var onSave: (() -> Void)?

    init(currentUser: User? = nil, onSave: (() -> Void)? = nil) {
        let user = currentUser ?? User(
            id: "",
            username: nil,
            email: nil,
            avatar_url: nil,
            bio: nil,
            photographer_status: nil,
            photographer_influence: nil,
            photographer_total_ratings: nil,
            photographer_accuracy_percentage: nil,
            is_admin: nil,
            created_at: ""
        )

        _username = State(initialValue: user.username ?? "")
        _bio = State(initialValue: user.bio ?? "")
        self.onSave = onSave
    }

    var body: some View {
        NavigationStack {
            Form {
                // Avatar section
                Section {
                    HStack {
                        Spacer()

                        ZStack(alignment: .bottomTrailing) {
                            if let avatarImage = avatarImage {
                                avatarImage
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: 100, height: 100)
                                    .clipShape(Circle())
                            } else if let avatarUrl = authManager.currentUser?.avatar_url,
                                    let url = URL(string: avatarUrl) {
                                CachedAsyncImage(url: url) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    avatarPlaceholder
                                }
                                .frame(width: 100, height: 100)
                                .clipShape(Circle())
                            } else {
                                avatarPlaceholder
                            }

                            // Camera button
                            PhotosPicker(selection: $avatarItem, matching: .images) {
                                Image(systemName: "camera.circle.fill")
                                    .font(.title)
                                    .foregroundColor(.white)
                                    .background(Circle().fill(Color.black.opacity(0.3)))
                            }
                        }

                        Spacer()
                    }
                    .listRowBackground(Color.clear)
                }

                // Name/Username section
                Section("Profile Information") {
                    HStack {
                        Text("Username")
                            .foregroundColor(Theme.text)
                        TextField("Username", text: $username)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .multilineTextAlignment(.trailing)
                    }

                    HStack(alignment: .top) {
                        Text("Bio")
                            .foregroundColor(Theme.text)
                        TextEditor(text: $bio)
                            .frame(minHeight: 80)
                            .scrollContentBackground(.hidden)
                            .background(Theme.background)
                            .cornerRadius(8)
                    }
                }

                // Error message
                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.background)
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(Theme.secondaryText)
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: saveProfile) {
                        if isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: Theme.accent))
                        } else {
                            Text("Save")
                                .fontWeight(.semibold)
                                .foregroundColor(Theme.accent)
                        }
                    }
                    .disabled(isLoading)
                }
            }
            .onChange(of: avatarItem) { _, newItem in
                Task {
                    if let data = try? await newItem?.loadTransferable(type: Data.self),
                       let uiImage = UIImage(data: data) {
                        avatarImage = Image(uiImage: uiImage)
                        // Compress and store as JPEG for upload
                        avatarData = uiImage.jpegData(compressionQuality: 0.8)
                    }
                }
            }
        }
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(Theme.subtleGradient)
            .frame(width: 100, height: 100)
            .overlay(
                Text(authManager.currentUser?.username?.prefix(1).uppercased() ?? "U")
                    .font(.system(size: 40, weight: .bold))
                    .foregroundColor(Theme.accent)
            )
    }

    private func saveProfile() {
        let trimmedUsername = username.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedBio = bio.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !trimmedUsername.isEmpty else {
            errorMessage = "Username cannot be empty."
            return
        }

        isLoading = true
        errorMessage = nil
        HapticManager.impact(.medium)

        Task {
            do {
                var newAvatarUrl: String? = nil

                // Upload avatar if user selected a new image
                if let imageData = avatarData {
                    newAvatarUrl = try await ApiService.shared.uploadAvatar(imageData: imageData)
                }

                // Update profile with username, bio, and avatar URL (if uploaded)
                try await ApiService.shared.updateProfile(
                    username: trimmedUsername.isEmpty ? nil : trimmedUsername,
                    bio: trimmedBio.isEmpty ? nil : trimmedBio,
                    avatarUrl: newAvatarUrl
                )

                // Refresh current user data
                await authManager.refreshCurrentUser()

                await MainActor.run {
                    isLoading = false
                    HapticManager.notification(.success)
                    onSave?()
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                    HapticManager.notification(.error)
                }
            }
        }
    }
}

// MARK: - Preview
struct EditProfileView_Previews: PreviewProvider {
    static var previews: some View {
        EditProfileView()
            .environmentObject(AuthenticationManager())
    }
}
