//
//  RatingSheetView.swift
//  LifeApp
//
//  Photo rating sheet for photographers
//

import SwiftUI

struct RatingSheetView: View {
    let postId: String
    let postCreatedAt: String
    let existingRating: Int?
    let photographerInfluence: Double
    let onRatingSubmitted: () -> Void
    
    @State private var selectedRating: Int
    @State private var isSubmitting = false
    @Environment(\.dismiss) var dismiss
    
    init(postId: String, postCreatedAt: String, existingRating: Int?, photographerInfluence: Double, onRatingSubmitted: @escaping () -> Void) {
        self.postId = postId
        self.postCreatedAt = postCreatedAt
        self.existingRating = existingRating
        self.photographerInfluence = photographerInfluence
        self.onRatingSubmitted = onRatingSubmitted
        _selectedRating = State(initialValue: existingRating ?? 0)
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Text("Rate This Photo")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text("Your influence: \(String(format: "%.1f", photographerInfluence))x • \(timeMessage) (\(timeBonus))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(.top)
                
                // Star rating
                HStack(spacing: 16) {
                    ForEach(1...5, id: \.self) { rating in
                        Button(action: {
                            selectedRating = rating
                        }) {
                            Image(systemName: rating <= selectedRating ? "star.fill" : "star")
                                .font(.system(size: 40))
                                .foregroundColor(rating <= selectedRating ? .yellow : .gray)
                        }
                    }
                }
                .padding(.vertical)
                
                // Rating label
                if selectedRating > 0 {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(ratingLabels[selectedRating]?.label ?? "")
                            .font(.headline)
                        Text(ratingLabels[selectedRating]?.description ?? "")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(8)
                }
                
                Spacer()
                
                // Submit button
                Button(action: submitRating) {
                    if isSubmitting {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .padding()
                    } else {
                        Text(existingRating != nil ? "Update Rating" : "Submit Rating")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding()
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(selectedRating == 0 || isSubmitting)
            }
            .padding()
            .navigationTitle("Rate Photo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private var timeBonus: String {
        let hoursSincePost = calculateHoursSincePost()
        if hoursSincePost <= 2 {
            return "1.5x"
        } else if hoursSincePost <= 24 {
            return "1.0x"
        } else if hoursSincePost <= 72 {
            return "0.5x"
        } else {
            return "0.2x"
        }
    }
    
    private var timeMessage: String {
        let hoursSincePost = calculateHoursSincePost()
        if hoursSincePost <= 2 {
            return "Early bird bonus!"
        } else if hoursSincePost <= 24 {
            return "Good timing"
        } else if hoursSincePost <= 72 {
            return "Moderate bonus"
        } else {
            return "Late rating"
        }
    }
    
    private func calculateHoursSincePost() -> Double {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        if let postDate = formatter.date(from: postCreatedAt) {
            return (Date().timeIntervalSince(postDate) / 3600)
        }
        
        // Fallback if parsing fails
        return 0
    }
    
    private func submitRating() {
        guard selectedRating > 0 else { return }
        
        isSubmitting = true
        
        Task {
            do {
                try await ApiService.shared.ratePost(postId: postId, rating: selectedRating)
                await MainActor.run {
                    isSubmitting = false
                    dismiss()
                    onRatingSubmitted()
                }
            } catch {
                await MainActor.run {
                    isSubmitting = false
                }
            }
        }
    }
    
    private let ratingLabels: [Int: (label: String, description: String)] = [
        1: ("Low Quality", "Poor composition, lighting, or technical issues"),
        2: ("Standard", "Acceptable but not remarkable"),
        3: ("Good", "Well composed, good technical execution"),
        4: ("High Quality", "Excellent work, notable composition"),
        5: ("Exceptional", "Outstanding, gallery-worthy photography")
    ]
}

