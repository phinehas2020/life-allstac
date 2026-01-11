//
//  SettingsView.swift
//  LifeApp
//
//  Settings view for managing account preferences
//

import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @Environment(\.dismiss) private var dismiss
    @State private var notificationsEnabled = true
    @State private var showDeleteAccountAlert = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Theme.Spacing.lg) {
                        settingsSection("Account") {
                            SettingsRow(
                                icon: "person.circle",
                                title: "Edit Profile",
                                subtitle: authManager.currentUser?.username ?? "Unknown"
                            )

                            SettingsRow(
                                icon: "envelope",
                                title: "Email",
                                subtitle: authManager.currentUser?.email ?? "Not set"
                            )
                        }

                        settingsSection("Preferences") {
                            SettingsToggleRow(
                                icon: "bell",
                                title: "Notifications",
                                isOn: $notificationsEnabled
                            )
                        }

                        settingsSection("Support") {
                            SettingsRow(
                                icon: "questionmark.circle",
                                title: "Help & Support"
                            )

                            SettingsRow(
                                icon: "info.circle",
                                title: "About"
                            )
                        }

                        deleteAccountButton
                    }
                    .padding()
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .alert("Delete Account", isPresented: $showDeleteAccountAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Delete", role: .destructive) {
                    authManager.logout()
                }
            } message: {
                Text("Are you sure you want to delete your account? This action cannot be undone.")
            }
        }
    }

    private func settingsSection<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text(title.uppercased())
                .font(Theme.Fonts.caption())
                .foregroundColor(Theme.secondaryText)
                .padding(.horizontal, Theme.Spacing.md)

            VStack(spacing: 0) {
                content()
            }
            .background(Theme.surface)
            .cornerRadius(Theme.Radius.md)
            .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 4)
        }
    }

    private var deleteAccountButton: some View {
        Button(action: {
            showDeleteAccountAlert = true
        }) {
            Text("Delete Account")
                .font(Theme.Fonts.label())
                .foregroundColor(Theme.error)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Theme.surface)
                .cornerRadius(Theme.Radius.md)
                .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 4)
        }
        .padding(.top, Theme.Spacing.lg)
    }
}

struct SettingsRow: View {
    let icon: String
    let title: String
    let subtitle: String?

    init(icon: String, title: String, subtitle: String? = nil) {
        self.icon = icon
        self.title = title
        self.subtitle = subtitle
    }

    var body: some View {
        HStack(spacing: Theme.Spacing.md) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(Theme.accent)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(Theme.Fonts.body())
                    .foregroundColor(Theme.text)

                if let subtitle {
                    Text(subtitle)
                        .font(Theme.Fonts.caption())
                        .foregroundColor(Theme.secondaryText)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(Theme.secondaryText)
        }
        .padding()
        .contentShape(Rectangle())
    }
}

struct SettingsToggleRow: View {
    let icon: String
    let title: String
    @Binding var isOn: Bool

    var body: some View {
        HStack(spacing: Theme.Spacing.md) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(Theme.accent)
                .frame(width: 24)

            Text(title)
                .font(Theme.Fonts.body())
                .foregroundColor(Theme.text)

            Spacer()

            Toggle("", isOn: $isOn)
        }
        .padding()
    }
}

struct SettingsView_Previews: PreviewProvider {
    static var previews: some View {
        SettingsView()
            .environmentObject(AuthenticationManager())
    }
}
