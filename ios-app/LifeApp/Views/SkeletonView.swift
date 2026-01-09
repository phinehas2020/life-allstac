//
//  SkeletonView.swift
//  LifeApp
//
//  Shimmer loading skeleton animations
//

import SwiftUI

// MARK: - Shimmer Effect
struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geometry in
                    LinearGradient(
                        colors: [
                            Color.white.opacity(0),
                            Color.white.opacity(0.4),
                            Color.white.opacity(0)
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geometry.size.width * 2)
                    .offset(x: -geometry.size.width + phase * geometry.size.width * 2)
                }
            )
            .mask(content)
            .onAppear {
                withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

extension View {
    func shimmer() -> some View {
        modifier(ShimmerModifier())
    }
}

// MARK: - Skeleton Shapes
struct SkeletonRectangle: View {
    var width: CGFloat?
    var height: CGFloat
    var cornerRadius: CGFloat = 8

    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius)
            .fill(Color.gray.opacity(0.15))
            .frame(width: width, height: height)
            .shimmer()
    }
}

struct SkeletonCircle: View {
    var size: CGFloat

    var body: some View {
        Circle()
            .fill(Color.gray.opacity(0.15))
            .frame(width: size, height: size)
            .shimmer()
    }
}

// MARK: - Post Card Skeleton
struct PostCardSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack(spacing: 12) {
                SkeletonCircle(size: 44)

                VStack(alignment: .leading, spacing: 6) {
                    SkeletonRectangle(width: 120, height: 14, cornerRadius: 4)
                    SkeletonRectangle(width: 80, height: 10, cornerRadius: 4)
                }

                Spacer()
            }
            .padding(.horizontal)

            // Image placeholder
            SkeletonRectangle(height: 320, cornerRadius: 16)
                .padding(.horizontal, 8)

            // Actions
            HStack(spacing: 20) {
                SkeletonCircle(size: 28)
                SkeletonCircle(size: 28)
                SkeletonCircle(size: 28)
                Spacer()
                SkeletonCircle(size: 28)
            }
            .padding(.horizontal)

            // Likes
            SkeletonRectangle(width: 80, height: 14, cornerRadius: 4)
                .padding(.horizontal)

            // Caption
            VStack(alignment: .leading, spacing: 6) {
                SkeletonRectangle(height: 14, cornerRadius: 4)
                SkeletonRectangle(width: 200, height: 14, cornerRadius: 4)
            }
            .padding(.horizontal)

            // Date
            SkeletonRectangle(width: 100, height: 10, cornerRadius: 4)
                .padding(.horizontal)
                .padding(.bottom, 8)
        }
        .background(Theme.surface)
        .cornerRadius(24)
        .shadow(color: Color.black.opacity(0.02), radius: 5, x: 0, y: 2)
        .padding(.horizontal, 10)
    }
}

// MARK: - Grid Item Skeleton
struct GridItemSkeleton: View {
    var body: some View {
        SkeletonRectangle(height: 120, cornerRadius: 4)
    }
}

// MARK: - Profile Header Skeleton
struct ProfileHeaderSkeleton: View {
    var body: some View {
        VStack(spacing: 16) {
            // Avatar
            SkeletonCircle(size: 100)

            // Name
            SkeletonRectangle(width: 150, height: 24, cornerRadius: 6)

            // Bio
            VStack(spacing: 6) {
                SkeletonRectangle(width: 250, height: 14, cornerRadius: 4)
                SkeletonRectangle(width: 180, height: 14, cornerRadius: 4)
            }

            // Stats
            HStack(spacing: 40) {
                ForEach(0..<3, id: \.self) { _ in
                    VStack(spacing: 4) {
                        SkeletonRectangle(width: 40, height: 20, cornerRadius: 4)
                        SkeletonRectangle(width: 60, height: 12, cornerRadius: 4)
                    }
                }
            }
            .padding(.top, 8)
        }
        .padding()
    }
}

// MARK: - Event Card Skeleton
struct EventCardSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Cover image
            SkeletonRectangle(height: 160, cornerRadius: 16)

            // Title
            SkeletonRectangle(width: 200, height: 18, cornerRadius: 4)
                .padding(.horizontal, 12)

            // Date
            SkeletonRectangle(width: 120, height: 14, cornerRadius: 4)
                .padding(.horizontal, 12)

            // Description
            VStack(alignment: .leading, spacing: 4) {
                SkeletonRectangle(height: 12, cornerRadius: 4)
                SkeletonRectangle(width: 180, height: 12, cornerRadius: 4)
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 12)
        }
        .background(Theme.surface)
        .cornerRadius(20)
        .shadow(color: Color.black.opacity(0.04), radius: 8, x: 0, y: 4)
    }
}

// MARK: - Feed Skeleton (Multiple Posts)
struct FeedSkeleton: View {
    var count: Int = 3

    var body: some View {
        VStack(spacing: 24) {
            ForEach(0..<count, id: \.self) { _ in
                PostCardSkeleton()
            }
        }
    }
}

// MARK: - Grid Skeleton (Explore/Profile)
struct GridSkeleton: View {
    let columns = [
        GridItem(.flexible(), spacing: 2),
        GridItem(.flexible(), spacing: 2),
        GridItem(.flexible(), spacing: 2)
    ]

    var itemCount: Int = 12

    var body: some View {
        LazyVGrid(columns: columns, spacing: 2) {
            ForEach(0..<itemCount, id: \.self) { _ in
                GridItemSkeleton()
            }
        }
    }
}

// MARK: - Preview
struct SkeletonView_Previews: PreviewProvider {
    static var previews: some View {
        ScrollView {
            VStack(spacing: 24) {
                PostCardSkeleton()

                Divider()

                ProfileHeaderSkeleton()

                Divider()

                GridSkeleton(itemCount: 9)
                    .padding(.horizontal)
            }
        }
        .background(Theme.background)
    }
}
