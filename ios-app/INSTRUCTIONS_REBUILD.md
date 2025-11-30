# How to Open and Run the App

I have completely rebuilt the iOS app with a modern, user-friendly design.

## Important: Opening the Project

I have consolidated the new design system code into the existing files to ensure compatibility with your current Xcode project file.

**Option 1: Open as a Swift Package (Recommended)**
1.  Open Xcode.
2.  Select "File" -> "Open".
3.  Navigate to the `ios-app/` folder.
4.  Double-click `Package.swift`.
5.  Xcode will open the project structure correctly.

**Option 2: Using the Xcode Project (.xcodeproj)**
1.  Open `ios-app/LifeApp.xcodeproj`.
2.  Build and run.
3.  Note: The `Theme` and `MainTabView` structures are now defined within `LifeApp.swift` and `ContentView.swift` respectively to avoid "missing file" errors in your project structure.

## Supabase Configuration

The app requires your Supabase credentials to function.
1.  Open `ios-app/LifeApp/Services/SupabaseConfig.swift`.
2.  Update `supabaseURL` and `supabaseAnonKey` with your project's credentials.
