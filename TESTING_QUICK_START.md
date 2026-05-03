# 🧪 Testing Phase - Quick Start

**When to run this:** Next session after reading `SESSION_SUMMARY_MAY3_2026.md`

---

## Pre-Testing Checklist

```bash
# 1. Verify you're on main branch
git status
# Should show: On branch main, nothing to commit

# 2. Verify latest commits
git log --oneline -5
# Should show: cfac6bd - Session Complete...

# 3. Check functions directory
ls -la functions/
# Should show: index.js (700 lines), package.json, README_ADMIN_API.md
```

---

## Step 1: Deploy Cloud Functions

This is the most critical step - functions must be deployed to test.

```bash
cd c:\Users\gparra\TraficoMapGeneral

# 1. Deploy functions
firebase deploy --only functions

# Expected output:
# ✔ functions[adminApi(us-central1)]: http function deployed at...
# https://us-central1-trafico-map-general-v2.cloudfunctions.net/adminApi

# 2. List deployed functions
firebase functions:list

# 3. Test health endpoint
curl https://us-central1-trafico-map-general-v2.cloudfunctions.net/adminApi/health

# Expected response:
# {"status":"OK","timestamp":"2024-...","version":"1.0.0"}
```

---

## Step 2: Start Local Testing

### Option A: Test in Browser Console

```bash
# 1. Open admin panel
http://localhost:8080/admin/

# 2. Open DevTools (F12)

# 3. In Console, type:
window.adminApi
// Should show: AdminApiClient instance

# 4. Test health check:
await adminApi.health()
// Should return: {status: "OK", ...}

# 5. Test create cliente:
await adminApi.criarCliente(
  "Test City",
  "admin@test.com",
  "basico"
)
// Should return: {success: true, cliente: {...}, ...}
```

### Option B: Test with cURL

```bash
# Test 1: Health check
curl https://us-central1-trafico-map-general-v2.cloudfunctions.net/adminApi/health

# Test 2: Create cliente
curl -X POST https://us-central1-trafico-map-general-v2.cloudfunctions.net/adminApi/criarCliente \
  -H "Content-Type: application/json" \
  -d '{
    "nombreCliente": "Test City",
    "email": "admin@test.gov.ar",
    "plan": "basico",
    "ciudad": "Test",
    "telefono": "+54 123 456789"
  }'
```

---

## Step 3: Follow Official Test Plan

**Open:** `FASE_3_TESTING_DEPLOYMENT_PLAN.md`

**Execute in order:**
1. Test 1: Cloud Functions Health Check (already done ✅)
2. Test 2: Unit Test - criarCliente
3. Test 3: Unit Test - cambiarPlan
4. Test 4: Unit Test - registrarPago
5. Test 5: Unit Test - updateCustomClaims
6. Test 6: UI Test - Admin Panel Load
7. Test 7: UI Test - Crear Cliente (E2E)
8. Test 8: Error Handling Test
9. Test 9: Performance Test

---

## Step 4: Verify Firestore Updates

After each test, verify in Firestore Console:

```
https://console.firebase.google.com
→ Firestore Database
→ Check collections:
  • clientes/
  • subscripciones/
  • billing/
  • usuarios_admin/
```

---

## If Tests Fail

### Cloud Function Deploy Failed
```bash
# 1. Check Node.js version
node --version  # Should be 18+

# 2. Check dependencies
cd functions
npm install

# 3. Try again
cd ..
firebase deploy --only functions
```

### API Call Returns Error
```bash
# 1. Check Firebase Functions Logs
firebase functions:log

# 2. Look for error messages
# Common issues:
# - "Faltan datos requeridos"  → Check payload format
# - "CORS error"  → Check origin headers
# - "Firebase not initialized" → Check config

# 3. Check adminApi-client.js URL
# Should auto-detect: 
#   /functions endpoint if localhost
#   https:// endpoint if production
```

### Tests Pass but Firestore Empty
```bash
# 1. Check if using correct database
firebase listProjectAliases
# Should show: trafico-map-general-v2

# 2. Check Firestore console directly
# https://console.firebase.google.com/project/trafico-map-general-v2/firestore

# 3. Create sample doc manually
# This verifies Firestore is writable
```

---

## Testing Environment Setup

### Required
- ✅ Firebase CLI installed
- ✅ Node.js 18+ installed
- ✅ npm packages installed
- ✅ Firebase project configured
- ✅ Functions deployed

### Recommended
- ✅ Firestore Emulator (for local testing)
- ✅ Chrome DevTools
- ✅ cURL or Postman for API testing

### Setup Emulator (Optional)
```bash
# If you want local Firestore without using production:
firebase emulators:start

# In another terminal:
firebase deploy --only functions --emulator
```

---

## Test Execution Timeline

```
Test 1 (Health):              5 min
Test 2 (criarCliente):       10 min
Test 3 (cambiarPlan):        10 min
Test 4 (registrarPago):      10 min
Test 5 (updateCustomClaims): 10 min
Test 6 (UI Load):             5 min
Test 7 (E2E Create):         15 min
Test 8 (Error Handling):     10 min
Test 9 (Performance):        10 min
─────────────────────
TOTAL:                       85 min (~1.5 hours)
```

---

## Success Indicators

After all tests:

```
✅ All endpoints respond <1 second
✅ Firestore documents created correctly
✅ Firebase Auth users created correctly
✅ Admin panel loads without errors
✅ Error messages are user-friendly
✅ No console errors in DevTools
✅ Logs are clean in Firebase Functions Console
```

**If all these pass → Ready for Phase 3B (Security Rules)**

---

## Phase 3B: What's Next

After testing passes:

```bash
# 1. Create firestore.rules file
# (Template in FASE_3_TESTING_DEPLOYMENT_PLAN.md Section 3B)

# 2. Deploy security rules
firebase deploy --only firestore:rules

# 3. Verify rules protect data
# (Test cases in Section 3B)
```

---

## Documents to Reference

| Document | Purpose |
|----------|---------|
| `FASE_3_TESTING_DEPLOYMENT_PLAN.md` | Detailed test cases |
| `README_ADMIN_API.md` | API endpoint reference |
| `SESSION_SUMMARY_MAY3_2026.md` | What was built |
| `PROYECTO_RESUMEN_EJECUTIVO_MAYO2026.md` | Project overview |

---

## Command Reference

```bash
# Deploy functions
firebase deploy --only functions

# View logs
firebase functions:log

# List deployed functions
firebase functions:list

# Open Firestore Console
firebase open firestore

# Open Firebase Console
firebase open hosting

# Stop emulator
firebase emulators:stop

# View project config
firebase projects:list
```

---

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| "Cannot find module" | `npm install` in functions/ |
| "CORS error" | Check origin in admin-api-client.js |
| "Firestore permission denied" | Create security rules in 3B |
| "Function timeout" | Check logs: `firebase functions:log` |
| "Auth not initialized" | Verify firebase-config.js has correct project ID |

---

## Ready to Start?

1. ✅ Read: `SESSION_SUMMARY_MAY3_2026.md`
2. ✅ Deploy: `firebase deploy --only functions`
3. ✅ Test: Follow `FASE_3_TESTING_DEPLOYMENT_PLAN.md`
4. ✅ Document: Update status as tests pass
5. ✅ Proceed: When all tests ✅ pass

**Estimated Time: 1.5-2 hours**

---

Good luck! 🚀
