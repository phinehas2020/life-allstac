# Life iOS App - Authentication Setup

## How Authentication Works

The iOS app uses **Supabase authentication directly**. Here's how it works:

### 1. Authentication Flow

1. **User signs in** → iOS app authenticates with Supabase
2. **Supabase returns access token** → App stores it securely in Keychain
3. **App sends token to backend** → Uses token in `Authorization: Bearer <token>` header
4. **Backend validates token** → Verifies user identity with Supabase

### 2. What You Need to Configure

You need to add your **Supabase credentials** to the app. These are PUBLIC keys and safe to include:

1. **Get your Supabase credentials:**
   - Go to your Supabase Dashboard
   - Go to **Settings → API**
   - Copy your **Project URL** and **anon/public key**

2. **Update the app:**
   - Open `LifeApp/Services/SupabaseConfig.swift`
   - Replace the placeholder values with your actual credentials

### 3. Two Options

#### Option A: Use Supabase Swift SDK (Recommended)

**Benefits:**
- ✅ Official Supabase SDK with full features
- ✅ Automatic token refresh
- ✅ Built-in auth methods
- ✅ Real-time subscriptions support

**Steps:**
1. Add Supabase Swift SDK to your Xcode project
2. Use SDK for authentication
3. Use SDK's access token for API calls

#### Option B: Manual HTTP Auth (Current Implementation)

**Benefits:**
- ✅ No external dependencies
- ✅ Full control over auth flow
- ✅ Smaller app size

**What you need:**
- Supabase URL and anon key (public - safe to include)
- HTTP requests to Supabase auth endpoints

### 4. Security Notes

- **Supabase Anon Key is PUBLIC** - It's designed to be exposed in client apps
- **Row Level Security (RLS)** protects your data, not the key
- **Access tokens** are stored securely in iOS Keychain
- **Never commit** service role keys (those stay server-side only)

### 5. Current Implementation

The current iOS app:
- ✅ Calls Supabase auth endpoints via HTTP
- ✅ Stores tokens in Keychain
- ✅ Sends tokens to backend APIs
- ⚠️ **Needs**: Supabase URL and anon key configuration

### Next Steps

1. **Get your Supabase credentials**
2. **Update** `SupabaseConfig.swift` with your values
3. **Test** authentication flow

The anon key is safe to include in your app - it's public by design!

