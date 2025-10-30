//
//  SupabaseClient.swift
//  LifeApp
//
//  Supabase client configuration
//

import Foundation

class SupabaseConfig {
    static let shared = SupabaseConfig()
    
    // These are PUBLIC keys - safe to include in your app
    // Get them from your Supabase project settings
    let supabaseURL: String
    let supabaseAnonKey: String
    
    private init() {
       
        self.supabaseURL = "https://lkbrxerkhhxeusuxbibu.supabase.co"
        self.supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrYnJ4ZXJraGh4ZXVzdXhiaWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MDA0NTYsImV4cCI6MjA3NzA3NjQ1Nn0.eq279zRKRT_R4lAVXdPDH3y_WBIIgvAy5NBdgdHrm4Y"
        
        // Log configuration status
        print("⚙️ [SupabaseConfig] Initialized")
        print("⚙️ [SupabaseConfig] URL: \(self.supabaseURL)")
        print("⚙️ [SupabaseConfig] Anon Key: \(self.supabaseAnonKey.prefix(20))...")
    }
}

