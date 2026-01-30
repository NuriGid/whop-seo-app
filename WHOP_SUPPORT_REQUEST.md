# Whop Developer Support Request

**Subject:** Urgent Help Needed: API Authentication for App Store Compliance (Data Isolation)

---

## Summary

We are the developers of **"Content Marketing Assistant"** (App ID: `app_womUHsVbtRHsMx`), an app designed to generate AI-powered marketing content for Whop course creators.

Our app was previously rejected from the Whop App Store due to **Data Isolation / Data Leakage concerns** related to using a Company API Key. We have since refactored our entire backend to comply with your security requirements, but we are now stuck with authentication errors that we cannot resolve without your guidance.

---

## The Problem

We want to fetch a company's products (`/api/v5/company/products`) in a way that:
1. ✅ Does NOT use a static Company API Key (to prevent data leakage)
2. ✅ Only returns data for the currently authenticated user's company
3. ✅ Works within the Whop iframe (Seller Dashboard)

---

## What We Have Tried

### Attempt 1: Pass-Through User Token Only
**Approach:** Capture `x-whop-user-token` from iframe, forward it directly to Whop API.

```typescript
// Forward user token to Whop API
const response = await fetch('https://api.whop.com/api/v5/company/products', {
  headers: { 'x-whop-user-token': userToken }
});
```

**Result:** ❌ `401 Unauthorized: User does not have access to this company`

---

### Attempt 2: Use @whop/sdk with App API Key + Token Validation
**Approach:** Initialize SDK with App API Key, validate user token, then fetch products scoped to the validated company_id.

```typescript
import WhopSDK from '@whop/sdk';

const whop = new WhopSDK({
  apiKey: process.env.WHOP_API_KEY,  // App API Key
  appID: process.env.WHOP_APP_ID     // app_womUHsVbtRHsMx
});

// Validate incoming user token
const validation = await whop.verifyUserToken(req.headers);

// Fetch products only for validated company
const products = await whop.products.list({
  company_id: validation.company_id
});
```

**Result:** ❌ `500 Internal Server Error` (SDK throws: "Whop user token not found")

---

### Attempt 3: Use @whop-apps/sdk Client-Side
**Approach:** Use `WhopAPI.connect()` on the frontend to establish SDK connection.

```typescript
import { WhopAPI } from '@whop-apps/sdk';
await WhopAPI.connect({ appId: YOUR_APP_ID });
const token = await WhopAPI.getAccessToken();
```

**Result:** ❌ `TypeError: SDK.connect is not a function` (method doesn't exist)

---

## Our Environment

| Item | Value |
|------|-------|
| App ID | `app_womUHsVbtRHsMx` |
| App API Key | `apik_lZmSAUFo...` (set in Vercel env) |
| Hosting | Vercel (Serverless Functions) |
| SDK Package | `@whop/sdk` (latest) |
| Permissions Enabled | `courses:read`, `access_pass:basic:read`, `plan:basic:read`, `member:basic:read`, `payment:basic:read` |

---

## Our Questions

1. **What is the correct authentication flow** to fetch company products from a Whop App Store application without using a Company API Key?

2. **Is `verifyUserToken()` supposed to work with App API Keys?** If so, what is the expected header format?

3. **Is there a working code example** for fetching company-specific data in a multi-tenant App Store app?

4. **Should we be using Whop Frosted API** or another method for protected data access?

---

## Attached Error Screenshots

*(User can attach the uploaded screenshots here)*

- "Fetch failed: 500" - Backend crashes during SDK token validation
- "Whop user token not found" - SDK cannot locate token in request headers
- "Unauthorized: User does not have access to this company" - Token doesn't grant company access

---

## Contact

We are happy to schedule a call or screen share to debug this together. We want to ensure our app is 100% compliant with Whop's security standards.

Thank you for your time and assistance.

**Developer:** Nuri Yildirim  
**App Name:** Content Marketing Assistant  
**App ID:** app_womUHsVbtRHsMx
