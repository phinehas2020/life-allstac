//
//  PostImageView.swift
//  LifeApp
//
//  Image view component that prevents cancellation
//

import SwiftUI

struct PostImageView: View {
    let url: String
    let height: CGFloat
    
    init(url: String, height: CGFloat = 400) {
        self.url = url
        self.height = height
    }
    
    var body: some View {
        LoadableImageView(url: url, height: height)
    }
}

