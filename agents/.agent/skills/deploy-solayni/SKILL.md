---
name: deploy-solayni
description: Production deployment checklist for Solayni
version: 1.0.0
---

# Deploy Solayni

## Purpose
Ensure consistent, error-free deployments to production.

## Prerequisites
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Logged in (`firebase login`)
- [ ] Project linked (`firebase use <project-id>`)

## Pre-Deployment Checklist
- [ ] All `.env` variables set correctly
- [ ] No `console.log` in production code
- [ ] Firebase rules updated (`firestore.rules`, `storage.rules`)
- [ ] Build succeeds locally (`npm run build`)

## Deployment Steps

### Step 1: Build
```bash
cd apps/sorteos-automaticos
npm run build
```
Expected: `dist/` folder created with optimized assets.

### Step 2: Deploy Security Rules
```bash
firebase deploy --only firestore:rules,storage:rules
```
Expected: Rules deployed without errors.

### Step 3: Deploy Hosting
```bash
firebase deploy --only hosting
```
Expected: Site live at `https://<project>.web.app`

### Step 4: Verify
1. Open production URL
2. Test Google login
3. View a raffle detail
4. (Admin) Check Admin panel loads

## Rollback
If issues occur:
```bash
firebase hosting:rollback
```

## Environment Variables (.env)
```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
VITE_ADMIN_EMAIL=admin@example.com
VITE_OPENAI_API_KEY=sk-xxx  # For AI verification
VITE_WEBHOOK_URL=https://hook.make.com/xxx  # For notifications
```

## Post-Deploy
- [ ] Monitor Firebase Console for errors
- [ ] Check Analytics for traffic
- [ ] Test payment flow end-to-end
