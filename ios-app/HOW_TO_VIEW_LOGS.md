# How to View Debug Logs in Xcode

## Step 1: Open Console

1. **Run your app** (⌘R)
2. **Open Console**:
   - **View → Debug Area → Activate Console** (⇧⌘C)
   - Or click the **console icon** at the bottom of Xcode

## Step 2: Filter Logs

The console shows LOTS of system messages. To see ONLY your app logs:

### Option A: Filter by Text
1. Click in the **search box** at bottom of console
2. Type: `[LOGIN]` or `[AuthView]` or `[SupabaseConfig]`
3. Only matching logs will show

### Option B: Filter by Process
1. In console, look for filter dropdown
2. Select **"LifeApp"** or your app name
3. This filters out system messages

## Step 3: What You Should See

When you **tap the Login button**, you should see logs like:

```
🚀 [LifeApp] App starting...
⚙️ [SupabaseConfig] Initialized
⚙️ [SupabaseConfig] URL: https://lkbrxerkhhxeusuxbibu.supabase.co
📱 [AuthView] handleAuth called - isLoginMode: true
📱 [AuthView] Attempting login...
🔑 [AuthManager] Login called for: your@email.com
🔐 [LOGIN] Starting authentication...
🔐 [LOGIN] Supabase URL: https://lkbrxerkhhxeusuxbibu.supabase.co
🔐 [LOGIN] Request URL: https://lkbrxerkhhxeusuxbibu.supabase.co/auth/v1/token?grant_type=password
🔐 [LOGIN] Sending request...
🔐 [LOGIN] Response status code: 200 (or 400/401/500 if error)
```

## Common Issues:

### If you see NO logs at all:
- Make sure Console is open (⇧⌘C)
- Try restarting the app
- Check you're looking at the right simulator/device

### If you see "Reporter disconnected" errors:
- These are **harmless** - just simulator noise
- Ignore them and look for your `[LOGIN]` logs

### If you see errors like:
- `❌ [LOGIN] HTTP Error 400` → Invalid email/password format
- `❌ [LOGIN] HTTP Error 401` → Wrong credentials
- `❌ [LOGIN] HTTP Error 500` → Server error
- `❌ [LOGIN] URL Error code: -1009` → No internet

## Quick Test:

1. Clear console (⌘K)
2. Tap Login button
3. Look for logs starting with `📱` or `🔐`
4. Share what you see!

The XPC errors you're seeing are just simulator warnings - ignore them and focus on the authentication logs that start with emojis.

