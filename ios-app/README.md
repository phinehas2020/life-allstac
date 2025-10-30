# Life iOS App

Native iOS app for Life social media platform, built with SwiftUI.

## Quick Start

**Just double-click `LifeApp.xcodeproj` to open in Xcode!**

The Xcode project is fully configured and ready to build. All Swift files are already included.

## Setup Steps

1. **Double-click** `LifeApp.xcodeproj` to open in Xcode
2. **Select your development team**:
   - Select project in navigator (blue icon)
   - Select "LifeApp" target
   - Go to "Signing & Capabilities" tab
   - Select your team under "Team"
3. **Update API URL** (if needed):
   - Open `LifeApp/Services/ApiService.swift`
   - Update `baseURL` if your backend URL is different
   - Currently set to: `https://life.allstac.com/api/mobile`
4. **Select a simulator or device** and press **⌘R** to build and run!

## Project Structure

```
LifeApp/
├── LifeApp.swift                 # App entry point (@main)
├── ContentView.swift             # Main content view with tabs
├── Models/
│   ├── User.swift                # User model
│   ├── Post.swift                # Post model
│   └── Event.swift                # Event model
├── Services/
│   ├── ApiService.swift          # API communication
│   ├── AuthenticationManager.swift # Auth state management
│   └── AuthTokenManager.swift    # Keychain token storage
├── Views/
│   ├── AuthView.swift            # Login/Signup
│   ├── HomeView.swift            # Home feed
│   ├── ExploreView.swift        # Explore/discover
│   ├── EventsView.swift          # Events list
│   ├── ProfileView.swift         # User profile
│   ├── PostCardView.swift        # Post card component
│   └── PostDetailView.swift      # Post detail with comments
└── Info.plist                    # App configuration
```

## Features

- ✅ Authentication (Login/Signup)
- ✅ Home feed with posts
- ✅ Explore/discover feed
- ✅ Events browsing
- ✅ User profiles
- ✅ Post detail with comments
- ✅ Like/comment functionality
- ✅ Image loading with AsyncImage
- ✅ Secure token storage in Keychain

## API Integration

The app uses the mobile API endpoints:
- `/api/mobile/posts` - Fetch posts
- `/api/mobile/posts/[id]` - Get single post
- `/api/mobile/events` - Fetch events
- `/api/mobile/users/[username]` - Get user profile
- `/api/login` - Authentication
- `/api/signup` - User registration

## Configuration

### Update Backend URL

Before running, update the backend URL in:
```
LifeApp/Services/ApiService.swift
```

Change line:
```swift
private let baseURL = "https://life.allstac.com/api/mobile"
```

### Minimum iOS Version

- Set to **iOS 15.0** (already configured)
- Can be changed in project settings if needed

### Bundle Identifier

- Default: `com.life.app`
- Can be changed in project settings → Signing & Capabilities

## Building & Running

1. **Open** `LifeApp.xcodeproj` in Xcode
2. **Select target device** (Simulator or physical device)
3. **Product → Run** (⌘R)
4. App should launch and connect to backend

## Troubleshooting

### Build Errors
- **"Cannot find type"**: All files should be included automatically
- **"Signing error"**: Select your development team in Signing & Capabilities

### Runtime Errors
- **Network errors**: Check `baseURL` in `ApiService.swift`
- **Keychain errors**: Normal on first run, will create entries

### Project Won't Open
- Make sure you're double-clicking `LifeApp.xcodeproj` (not the folder)
- Ensure Xcode is installed (macOS App Store)

## Next Steps

1. **Test API Connection**:
   - Ensure backend is deployed and accessible
   - Update `baseURL` if needed

2. **Add Missing Features**:
   - Video playback (AVPlayerViewController)
   - Image caching
   - Pull-to-refresh
   - Infinite scroll
   - Error handling UI
   - Loading states

3. **Enhance UI**:
   - Custom styling
   - Animations
   - Better image loading
   - Photo upload

4. **Testing**:
   - Test on simulator
   - Test on physical device
   - Test API connectivity

## Notes

- Uses SwiftUI (iOS 15+)
- All network calls use async/await
- Tokens stored securely in Keychain
- Images loaded with native AsyncImage
- Fully configured Xcode project - ready to build!

---

**Ready to build!** 🎉

Just double-click `LifeApp.xcodeproj` and press ⌘R!
