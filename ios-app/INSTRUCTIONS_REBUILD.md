# How to Open and Run the App

I have completely rebuilt the iOS app with a modern, user-friendly design.

## Important: Opening the Project

Since I have added new files (`Theme.swift`, `MainTabView.swift`) and refactored the UI, the existing `.xcodeproj` file might not automatically include these new files if you open it directly.

**Option 1: Open as a Swift Package (Recommended)**
1.  Open Xcode.
2.  Select "File" -> "Open".
3.  Navigate to the `ios-app/` folder.
4.  Double-click `Package.swift`.
5.  Xcode will open the project structure correctly, including all new files.

**Option 2: Using the Xcode Project (.xcodeproj)**
1.  Open `ios-app/LifeApp.xcodeproj`.
2.  In the Project Navigator (left sidebar), verify if `Theme.swift` and `MainTabView.swift` are visible in the `LifeApp/Views` folder.
3.  If they are missing (or red), drag them from Finder into the Xcode project tree.
4.  Ensure they are added to the "LifeApp" target.

## Supabase Configuration

The app requires your Supabase credentials to function.
1.  Open `ios-app/LifeApp/Services/SupabaseConfig.swift`.
2.  Update `supabaseURL` and `supabaseAnonKey` with your project's credentials.
