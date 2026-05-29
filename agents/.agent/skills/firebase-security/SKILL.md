---
name: firebase-security
description: Audit and harden Firebase security rules
version: 1.0.0
---

# Firebase Security Audit

## Purpose
Ensure Firestore and Storage rules prevent unauthorized access and data manipulation.

## When to Use
- Before any production deployment
- After adding new collections
- When security concerns arise

## Audit Checklist

### Firestore Rules
- [ ] **No open writes**: No `allow write: if true`
- [ ] **User isolation**: Users can only read/write their own data
- [ ] **Admin protection**: Admin role cannot be self-assigned
- [ ] **Sensitive fields protected**: `role`, `balance`, `level` locked
- [ ] **Status enforcement**: Payments created with `pendiente` only

### Storage Rules
- [ ] **Path isolation**: Users write only to `/vouchers/{uid}/`
- [ ] **File type validation**: Only `image/*` allowed
- [ ] **Size limits**: Max 5MB per file
- [ ] **Admin uploads**: Only admins write to `/raffles/`

## Security Patterns

### Prevent Self-Promotion (Critical)
```javascript
allow update: if isOwner(userId) 
  && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'balance']));
```

### Force Initial Status
```javascript
allow create: if request.resource.data.status == 'pendiente';
```

### Admin-Only Writes
```javascript
function isAdmin() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
allow write: if isAdmin();
```

## Deployment Commands
```bash
# Deploy rules only
firebase deploy --only firestore:rules,storage:rules

# Test rules locally
firebase emulators:start --only firestore
```

## Known Vulnerabilities in Solayni (Fixed)
1. ~~Users could set `role: 'admin'`~~ ✅ Fixed
2. ~~Payments could be created as 'aprobado'~~ ✅ Fixed
3. ~~No file size limits on uploads~~ ✅ Fixed
