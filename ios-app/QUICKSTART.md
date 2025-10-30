# Life iOS App - Quick Start Guide

## 🚀 Quick Setup (3 Steps)

### Step 1: Create Xcode Project

1. **Open Xcode**
2. **File → New → Project** (⌘⇧N)
3. Select **iOS → App**
4. Fill in:
   - **Product Name**: `LifeApp`
   - **Team**: (Your team)
   - **Organization Identifier**: `com.yourcompany` (or your domain)
   - **Interface**: **SwiftUI**
   - **Language**: **Swift**
   - **Storage**: None
   - **Include Tests**: (Optional)
5. **Save Location**: Choose the `ios-app` folder
6. **Click Create**

### Step 2: Add Files to Project

1. **Delete** the default `ContentView.swift` that Xcode created
2. In Xcode Project Navigator, **right-click** on `LifeApp` folder
3. Select **"Add Files to LifeApp..."**
4. Navigate to `LifeApp/` folder
5. **Select ALL files** (⌘A):
   - All `.swift` files
   - `Info.plist`
6. **IMPORTANT**: Check these options:
   - ✅ **Copy items if needed**
   - ✅ **Create groups** (not folder references)
   - ✅ **Add to targets: LifeApp**
7. **Click Add**

### Step 3: Configure & Build

1. **Update Base URL**:
   - Open `Services/ApiService.swift`
   - Find `private let baseURL = "https://life.allstac.com/api/mobile"`
   - Update if your backend URL is different

2. **Set Minimum iOS Version**:
   - Select project in navigator (blue icon at top)
   - Select **LifeApp** target
   - Go to **General** tab
   - Set **Minimum Deployments** to **iOS 15.0**

3. **Build & Run**:
   - Select a simulator or device
   - Press **⌘R** or click **Run**

## 📁 Project Structure

```
LifeApp/
├── LifeApp.swift              # App entry point (@main)
├── ContentView.swift          # Main view with tabs
├── Models/
│   ├── User.swift            # User model
│   ├── Post.swift            # Post model  
│   └── Event.swift           # Event model
├── Services/
│   ├── ApiService.swift      # API calls
│   ├── AuthenticationManager.swift
│   └── AuthTokenManager.swift # Keychain storage
├── Views/
│   ├── AuthView.swift        # Login/Signup
│   ├── HomeView.swift        # Feed
│   ├── ExploreView.swift     # Discover
│   ├── EventsView.swift      # Events
│   ├── ProfileView.swift     # Profile
│   ├── PostCardView.swift    # Post card
│   └── PostDetailView.swift  # Post detail
└── Info.plist                # App config
```

## ✅ Features Implemented

- ✅ Authentication (Login/Signup)
- ✅ Home feed with posts
- ✅ Explore/discover grid
- ✅ Events browsing
- ✅ User profiles
- ✅ Post detail with comments
- ✅ Like/comment functionality
- ✅ Image loading
- ✅ Secure token storage

## 🔧 Troubleshooting

### Build Errors
- **"Cannot find type"**: Make sure all files are added to target
- **"Use of undeclared type"**: Check file is in correct folder structure

### Runtime Errors
- **Network errors**: Check `baseURL` in `ApiService.swift`
- **Keychain errors**: Normal on first run, will create entries

### Project Won't Open
- Make sure you're opening `.xcodeproj` (not just folder)
- Or create new project as described above

## 📱 Testing

1. **Run on Simulator**: Select iPhone simulator, press ⌘R
2. **Test Login**: Use your backend credentials
3. **Test API**: Ensure backend is running and accessible

## 🎨 Next Steps

- Add video playback (AVPlayerViewController)
- Add image caching
- Improve error handling UI
- Add pull-to-refresh
- Add photo upload functionality
- Customize UI styling

## 📝 Notes

- Uses SwiftUI (iOS 15+)
- All network calls use async/await
- Tokens stored securely in Keychain
- Images loaded with native AsyncImage

---

**Ready to build!** 🎉

If you run into issues, check the full README.md for detailed instructions.

