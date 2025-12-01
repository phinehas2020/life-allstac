//
//  VideoPlayerView.swift
//  LifeApp
//
//  Lightweight video player wrapper for remote URLs.
//

import SwiftUI
import AVKit

struct VideoPlayerView: View {
    let url: String
    @State private var player: AVPlayer?
    
    var body: some View {
        ZStack {
            if let player = player {
                VideoPlayer(player: player)
                    .onAppear { player.play() }
                    .onDisappear { player.pause() }
            } else {
                VStack(spacing: 8) {
                    ProgressView()
                    Text("Loading video...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .background(Color.black.opacity(0.05))
        .onAppear {
            if player == nil, let videoURL = URL(string: url) {
                player = AVPlayer(url: videoURL)
            }
        }
    }
}
