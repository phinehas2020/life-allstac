//
//  UploadView.swift
//  LifeApp
//
//  Upload photos and videos with caption and event selection
//

import SwiftUI
import PhotosUI

struct UploadView: View {
    @StateObject private var viewModel = UploadViewModel()
    @State private var showPhotoPicker = false
    @State private var showCamera = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Theme.Spacing.lg) {
                        // Media Selection
                        mediaSelectionView

                        // Caption Input
                        if viewModel.selectedImage != nil {
                            captionSection
                            eventSection
                            uploadButton
                        }
                    }
                    .padding()
                }

                // Upload overlay
                if viewModel.isUploading {
                    uploadProgressOverlay
                }
            }
            .navigationTitle("New Post")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        viewModel.reset()
                    }
                    .foregroundColor(Theme.secondaryText)
                }
            }
            .photosPicker(
                isPresented: $showPhotoPicker,
                selection: $viewModel.selectedItem,
                matching: .any(of: [.images, .videos]),
                photoLibrary: .shared()
            )
            .onChange(of: viewModel.selectedItem) { newValue in
                Task {
                    await viewModel.loadTransferable(from: newValue)
                }
            }
            .alert("Upload Error", isPresented: $viewModel.showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(viewModel.errorMessage)
            }
            .alert("Success!", isPresented: $viewModel.showSuccess) {
                Button("OK") {
                    viewModel.reset()
                }
            } message: {
                Text("Your post has been shared!")
            }
        }
    }

    // MARK: - Media Selection
    private var mediaSelectionView: some View {
        VStack(spacing: Theme.Spacing.md) {
            if let image = viewModel.selectedImage {
                // Selected image preview
                ZStack(alignment: .topTrailing) {
                    Image(uiImage: image)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(maxHeight: 400)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.Radius.lg))
                        .shadow(color: Color.black.opacity(0.1), radius: 12, x: 0, y: 6)

                    // Remove button
                    Button(action: {
                        withAnimation(.bouncy) {
                            viewModel.selectedImage = nil
                            viewModel.selectedItem = nil
                        }
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title)
                            .foregroundColor(.white)
                            .shadow(radius: 4)
                    }
                    .padding(12)
                }
                .transition(.scale.combined(with: .opacity))
            } else {
                // Upload placeholder
                VStack(spacing: Theme.Spacing.lg) {
                    ZStack {
                        // Background circle with gradient
                        Circle()
                            .fill(Theme.subtleGradient)
                            .frame(width: 120, height: 120)

                        Image(systemName: "photo.on.rectangle.angled")
                            .font(.system(size: 48))
                            .foregroundColor(Theme.accent)
                    }

                    Text("Share a moment")
                        .font(Theme.Fonts.heading(size: 24))
                        .foregroundColor(Theme.text)

                    Text("Select a photo or video from your library")
                        .font(Theme.Fonts.body())
                        .foregroundColor(Theme.secondaryText)
                        .multilineTextAlignment(.center)

                    // Action buttons
                    HStack(spacing: Theme.Spacing.md) {
                        Button(action: {
                            showPhotoPicker = true
                        }) {
                            HStack {
                                Image(systemName: "photo.fill")
                                Text("Library")
                            }
                        }
                        .buttonStyle(GradientButtonStyle())

                        Button(action: {
                            showCamera = true
                        }) {
                            HStack {
                                Image(systemName: "camera.fill")
                                Text("Camera")
                            }
                        }
                        .buttonStyle(SecondaryButtonStyle())
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Theme.Spacing.xxl)
                .background(Theme.surface)
                .cornerRadius(Theme.Radius.xl)
                .shadow(color: Color.black.opacity(0.04), radius: 12, x: 0, y: 6)
            }
        }
    }

    // MARK: - Caption Section
    private var captionSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("Caption")
                .font(Theme.Fonts.label())
                .foregroundColor(Theme.text)

            TextEditor(text: $viewModel.caption)
                .font(Theme.Fonts.body())
                .frame(minHeight: 100)
                .padding(Theme.Spacing.sm)
                .background(Theme.surface)
                .cornerRadius(Theme.Radius.md)
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.Radius.md)
                        .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                )

            Text("\(viewModel.caption.count)/500")
                .font(Theme.Fonts.caption())
                .foregroundColor(viewModel.caption.count > 450 ? Theme.warning : Theme.secondaryText)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding()
        .background(Theme.surface)
        .cornerRadius(Theme.Radius.lg)
        .shadow(color: Color.black.opacity(0.04), radius: 8, x: 0, y: 4)
    }

    // MARK: - Event Section
    private var eventSection: some View {
        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
            Text("Add to Event (Optional)")
                .font(Theme.Fonts.label())
                .foregroundColor(Theme.text)

            if viewModel.events.isEmpty {
                Button(action: {
                    Task { await viewModel.loadEvents() }
                }) {
                    HStack {
                        Image(systemName: "calendar.badge.plus")
                        Text("Load events")
                    }
                    .font(Theme.Fonts.body())
                    .foregroundColor(Theme.accent)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Theme.subtleGradient)
                    .cornerRadius(Theme.Radius.md)
                }
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Theme.Spacing.sm) {
                        ForEach(viewModel.events) { event in
                            eventChip(event)
                        }
                    }
                }
            }
        }
        .padding()
        .background(Theme.surface)
        .cornerRadius(Theme.Radius.lg)
        .shadow(color: Color.black.opacity(0.04), radius: 8, x: 0, y: 4)
    }

    private func eventChip(_ event: Event) -> some View {
        let isSelected = viewModel.selectedEventId == event.id

        return Button(action: {
            withAnimation(.bouncy) {
                viewModel.selectedEventId = isSelected ? nil : event.id
            }
            HapticManager.selection()
        }) {
            HStack(spacing: 6) {
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.caption)
                }
                Text(event.name)
                    .font(Theme.Fonts.caption())
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? Theme.brandGradient : LinearGradient(colors: [Color.gray.opacity(0.1)], startPoint: .leading, endPoint: .trailing))
            .foregroundColor(isSelected ? .white : Theme.text)
            .cornerRadius(Theme.Radius.full)
        }
    }

    // MARK: - Upload Button
    private var uploadButton: some View {
        Button(action: {
            Task { await viewModel.upload() }
        }) {
            HStack {
                Image(systemName: "arrow.up.circle.fill")
                Text("Share Post")
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(GradientButtonStyle())
        .disabled(viewModel.selectedImage == nil || viewModel.isUploading)
        .opacity(viewModel.selectedImage == nil ? 0.6 : 1)
        .padding(.top, Theme.Spacing.md)
    }

    // MARK: - Upload Progress Overlay
    private var uploadProgressOverlay: some View {
        ZStack {
            Color.black.opacity(0.5)
                .ignoresSafeArea()

            VStack(spacing: Theme.Spacing.lg) {
                // Animated upload icon
                ZStack {
                    Circle()
                        .fill(Theme.surface)
                        .frame(width: 100, height: 100)

                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: Theme.accent))
                        .scaleEffect(1.5)
                }

                Text("Uploading...")
                    .font(Theme.Fonts.heading(size: 20))
                    .foregroundColor(.white)

                Text("\(Int(viewModel.uploadProgress * 100))%")
                    .font(Theme.Fonts.body())
                    .foregroundColor(.white.opacity(0.8))

                // Progress bar
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.white.opacity(0.3))
                            .frame(height: 8)

                        RoundedRectangle(cornerRadius: 4)
                            .fill(Theme.brandGradient)
                            .frame(width: geometry.size.width * viewModel.uploadProgress, height: 8)
                    }
                }
                .frame(height: 8)
                .frame(maxWidth: 200)
            }
            .padding(Theme.Spacing.xl)
            .background(
                RoundedRectangle(cornerRadius: Theme.Radius.xl)
                    .fill(.ultraThinMaterial)
            )
        }
    }
}

// MARK: - View Model
@MainActor
class UploadViewModel: ObservableObject {
    @Published var selectedItem: PhotosPickerItem?
    @Published var selectedImage: UIImage?
    @Published var caption = ""
    @Published var selectedEventId: String?
    @Published var events: [Event] = []

    @Published var isUploading = false
    @Published var uploadProgress: Double = 0
    @Published var showError = false
    @Published var showSuccess = false
    @Published var errorMessage = ""

    func loadTransferable(from item: PhotosPickerItem?) async {
        guard let item = item else { return }

        do {
            if let data = try await item.loadTransferable(type: Data.self),
               let image = UIImage(data: data) {
                withAnimation(.bouncy) {
                    self.selectedImage = image
                }
            }
        } catch {
            errorMessage = "Failed to load image"
            showError = true
        }
    }

    func loadEvents() async {
        do {
            let response = try await ApiService.shared.fetchEvents()
            withAnimation(.smooth) {
                self.events = response.events
            }
        } catch {
            // Silently fail - events are optional
            print("Failed to load events: \(error)")
        }
    }

    func upload() async {
        guard let image = selectedImage else { return }

        isUploading = true
        uploadProgress = 0

        // Simulate upload progress
        for i in 1...10 {
            try? await Task.sleep(nanoseconds: 200_000_000)
            withAnimation(.easeOut) {
                uploadProgress = Double(i) / 10.0
            }
        }

        do {
            // Get image data
            guard let imageData = image.jpegData(compressionQuality: 0.8) else {
                throw NSError(domain: "Upload", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to compress image"])
            }

            try await ApiService.shared.uploadPost(
                imageData: imageData,
                caption: caption.isEmpty ? nil : caption,
                eventId: selectedEventId
            )

            HapticManager.notification(.success)
            showSuccess = true
        } catch {
            HapticManager.notification(.error)
            errorMessage = error.localizedDescription
            showError = true
        }

        isUploading = false
    }

    func reset() {
        selectedItem = nil
        selectedImage = nil
        caption = ""
        selectedEventId = nil
        uploadProgress = 0
    }
}

// MARK: - Preview
struct UploadView_Previews: PreviewProvider {
    static var previews: some View {
        UploadView()
    }
}
