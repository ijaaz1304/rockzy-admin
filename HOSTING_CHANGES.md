# Required Changes for Firebase App Hosting

## 🔴 Critical Issues to Fix

### 1. **Project Name Inconsistencies**

**Current State:**
- Folder name: `insect-admin-main`
- Firebase project (`.firebaserc`): `coinzy-26a4d`
- Package name (`package.json`): `coinzy-admin-panel`
- Firebase Project ID (env vars): `insect-e4ee5`
- Backend ID (`firebase.json`): `coinzy-admin`

**Required Actions:**
- ✅ Decide on ONE consistent project name (recommend: `insect-admin` or `coinzy-admin`)
- ✅ Update all references to match the chosen name
- ✅ Ensure Firebase project ID matches the actual Firebase project you're using

---

### 2. **Environment Variables in `apphosting.yaml`**

**Issues Found:**

#### a) **NEXT_PUBLIC_API_URL** (Line 7)
```yaml
value: https://coinzy-admin--coinzy-26a4d.asia-east1.hosted.app/api
```
- **Issue**: This URL structure suggests it's pointing to a different backend
- **Required**: Update to match your actual App Hosting backend URL
- **Format**: Should be `https://<backend-id>--<project-id>.<region>.hosted.app/api`

#### b) **NEXT_PUBLIC_CHECK_ADMIN_URL** (Line 13)
```yaml
value: https://asia-east1-coinzy-26a4d.cloudfunctions.net/checkAdmin
```
- **Issue**: Points to Cloud Functions, but you have a Next.js API route at `/api/check-admin`
- **Required**: Since you're using a Next.js API route, this should be:
  - Either: `https://<your-app-hosting-url>/api/check-admin`
  - Or: Remove this env var if you're using relative paths (like `/api/check-admin`)

#### c) **Firebase Project ID Mismatch** (Line 31)
```yaml
value: insect-e4ee5
```
- **Issue**: `.firebaserc` shows `coinzy-26a4d`, but env var shows `insect-e4ee5`
- **Required**: Update to match your actual Firebase project ID from `.firebaserc`

#### d) **Missing Server-Side Environment Variables**
- **Issue**: `lib/firebaseAdmin.ts` uses `NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL` and `NEXT_PUBLIC_FIREBASE_PRIVATE_KEY`
- **Critical Security Issue**: These should NOT have `NEXT_PUBLIC_` prefix (exposes secrets to client)
- **Required**: 
  - Rename to `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` (without `NEXT_PUBLIC_`)
  - Add these to `apphosting.yaml` with `availability: [RUNTIME]` only (not BUILD)
  - Update `lib/firebaseAdmin.ts` to use the new variable names

---

### 3. **Firebase Configuration (`firebase.json`)**

**Current Issues:**
- Has duplicate `apphosting` entries (lines 2-24)
- Two entries with same `backendId: "coinzy-admin"` but different `rootDir`

**Required Actions:**
- ✅ Remove duplicate entry
- ✅ Keep only one `apphosting` configuration
- ✅ Ensure `rootDir` is correct (should be `"."` for root directory)

---

### 4. **Next.js Configuration (`next.config.js`)**

**Current State:**
- Has commented out static export config (lines 9-10)
- `output: 'export'` is commented
- `distDir: 'out'` is commented

**Required Actions:**
- ✅ For Firebase App Hosting, you typically DON'T need static export (App Hosting runs Next.js server)
- ✅ Keep the config as-is (commented out is correct for server-side rendering)
- ✅ Verify `images.unoptimized: true` is appropriate for your use case

---

### 5. **Code References**

**File: `pages/index.tsx`**
- Line 120: Title says "Coinzy Admin Login" - update if project name changes
- Line 125: Heading says "Coinzy Admin" - update if project name changes
- Line 158: Footer says "Coinzy Admin Panel" - update if project name changes

**File: `lib/firebaseAdmin.ts`**
- Lines 7-9: Using `NEXT_PUBLIC_` prefix for sensitive credentials (security risk)
- **Required**: Change to non-prefixed environment variables

---

## 📋 Checklist of Required Changes

### High Priority (Must Fix)

- [ ] **Fix project name inconsistencies** - Decide on one name and update all references
- [ ] **Update Firebase Project ID** in `apphosting.yaml` to match `.firebaserc` (currently `coinzy-26a4d`)
- [ ] **Fix API URL** in `apphosting.yaml` - Update `NEXT_PUBLIC_API_URL` to match your actual backend
- [ ] **Remove or fix `NEXT_PUBLIC_CHECK_ADMIN_URL`** - Use relative path `/api/check-admin` instead
- [ ] **Fix security issue in `firebaseAdmin.ts`** - Remove `NEXT_PUBLIC_` prefix from credentials
- [ ] **Add missing environment variables** - Add `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` to `apphosting.yaml`
- [ ] **Clean up `firebase.json`** - Remove duplicate `apphosting` entry

### Medium Priority (Should Fix)

- [ ] **Update UI text** in `pages/index.tsx` if project name changes
- [ ] **Verify Firebase region** - Ensure `asia-east1` is correct in all places
- [ ] **Verify backend ID** - Ensure `coinzy-admin` matches your actual backend ID

### Low Priority (Nice to Have)

- [ ] **Update README.md** - Add proper project documentation
- [ ] **Update package.json name** if project name changes

---

## 🔧 Recommended Fix Order

1. First, decide on the project name (insect-admin vs coinzy-admin)
2. Update `.firebaserc` to use the correct Firebase project
3. Fix `apphosting.yaml` environment variables
4. Fix security issue in `firebaseAdmin.ts`
5. Clean up `firebase.json`
6. Update code references to match new project name

---

## 📝 Environment Variables Template for `apphosting.yaml`

```yaml
environment:
  # Public Firebase config (available at build and runtime)
  - variable: NEXT_PUBLIC_FIREBASE_API_KEY
    value: "YOUR_API_KEY"
    availability: [BUILD, RUNTIME]
  
  - variable: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    value: "your-project.firebaseapp.com"
    availability: [BUILD, RUNTIME]
  
  - variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
    value: "your-project-id"  # Must match .firebaserc
    availability: [BUILD, RUNTIME]
  
  - variable: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    value: "your-project.firebasestorage.app"
    availability: [BUILD, RUNTIME]
  
  - variable: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    value: "YOUR_SENDER_ID"
    availability: [BUILD, RUNTIME]
  
  - variable: NEXT_PUBLIC_FIREBASE_APP_ID
    value: "YOUR_APP_ID"
    availability: [BUILD, RUNTIME]
  
  - variable: NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    value: "YOUR_MEASUREMENT_ID"
    availability: [BUILD, RUNTIME]
  
  # Server-side only (RUNTIME only, no NEXT_PUBLIC_ prefix)
  - variable: FIREBASE_CLIENT_EMAIL
    value: "your-service-account@your-project.iam.gserviceaccount.com"
    availability: [RUNTIME]
  
  - variable: FIREBASE_PRIVATE_KEY
    value: "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
    availability: [RUNTIME]
  
  # Optional: API URL (if needed)
  - variable: NEXT_PUBLIC_API_URL
    value: "https://your-backend-id--your-project-id.region.hosted.app/api"
    availability: [BUILD, RUNTIME]
```

---

## ⚠️ Security Notes

1. **Never use `NEXT_PUBLIC_` prefix** for sensitive credentials (private keys, emails, etc.)
2. **Server-side only variables** should use `availability: [RUNTIME]` only
3. **Private keys** should be stored securely and never committed to git (use Firebase console or secret manager)
