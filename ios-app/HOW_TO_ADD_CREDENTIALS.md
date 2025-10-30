# How to Add Supabase Credentials to iOS App

## Step 1: Get Your Supabase Credentials

1. Go to your **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. You'll see:
   - **Project URL** (e.g., `https://abcdefghijklmnop.supabase.co`)
   - **anon public** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## Step 2: Add Credentials to iOS App

Open this file in Xcode:
```
ios-app/LifeApp/Services/SupabaseConfig.swift
```

Replace these two lines:

```swift
self.supabaseURL = "https://your-project.supabase.co"
self.supabaseAnonKey = "your-anon-key-here"
```

With your actual values:

```swift
self.supabaseURL = "https://abcdefghijklmnop.supabase.co"  // Your Project URL
self.supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // Your anon key
```

## Example:

```swift
private init() {
    // Replace with your actual Supabase credentials
    self.supabaseURL = "https://xyzcompany.supabase.co"
    self.supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emNvbXBhbnkiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2ODAwMCwiZXhwIjoxOTU0NTQ0MDAwfQ.example"
}
```

## Step 3: Verify It's Working

After adding credentials, build and run the app. You should see:
- ✅ No warning messages in console
- ✅ Login/signup should work
- ✅ Can fetch posts from your backend

## Important Notes:

- ✅ **These keys are PUBLIC** - They're designed to be in your app
- ✅ **Safe to commit** to git (they're public by design)
- ✅ **Your data is protected** by Row Level Security (RLS), not by hiding the key
- ❌ **Never add** the `service_role` key (that stays server-side only)

## Where the File Is:

```
ios-app/
└── LifeApp/
    └── Services/
        └── SupabaseConfig.swift  ← Edit this file
```

That's it! Just update those two values in `SupabaseConfig.swift` and you're done.

