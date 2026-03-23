# Follow-Up: Still Getting 500 Error After Implementing Your Suggestion

**App ID:** `[YOUR_WHOP_APP_ID]`

---

## Hi again!

Thank you for your quick response! We implemented exactly what you suggested:

```typescript
import WhopSDK from '@whop/sdk';

const whop = new WhopSDK({
    apiKey: process.env.WHOP_API_KEY,
    appID: process.env.WHOP_APP_ID
});

// Step 1: Verify User Token
const tokenResult = await whop.verifyUserToken(req.headers);
const userId = tokenResult.userId;

// Step 2: Get Company ID from headers
const companyId = req.headers['x-whop-company-id'];

// Step 3: Check Access
const access = await whop.users.checkAccess(companyId, { id: userId });

// Step 4: Fetch Products
const products = await whop.products.list({ company_id: companyId });
```

---

## The Problem

We are still getting a **500 Internal Server Error**. The app is:
- ✅ Embedded in Whop Dashboard (iframe)
- ✅ Installed on our company
- ✅ Has required permissions enabled

---

## Our Questions

1. **What is the exact format of `req.headers` that `verifyUserToken` expects?**
   - We are using Vercel Serverless Functions. The headers come as `req.headers` (Node.js IncomingHttpHeaders format).
   - Does the SDK expect `Headers` (Web API) format instead?

2. **What does `verifyUserToken` return?**
   - We are accessing `tokenResult.userId` but getting errors.
   - What is the exact return type? (`{ userId: string }` or something else?)

3. **How does `checkAccess` work?**
   - What is the signature: `checkAccess(companyId, { id: userId })` or something different?
   - Where can we find the TypeScript types for this?

4. **Could you share a complete working example?**
   - We are using Vercel + TypeScript.
   - A minimal working `/api/products.ts` example would be incredibly helpful.

---

## Our Environment

| Item | Value |
|------|-------|
| App ID | `[YOUR_WHOP_APP_ID]` |
| API Key | `[YOUR_WHOP_API_KEY]` (set in Vercel env) |
| Hosting | Vercel Serverless Functions |
| SDK | `@whop/sdk` (npm latest) |
| Framework | Vercel API Routes (not Next.js App Router) |

---

## Screenshot

![Fetch failed: 500](/Users/nuriydrm/.gemini/antigravity/brain/7f9f7923-7102-400c-9558-65c4bbcd8072/uploaded_media_1769409776484.png)

---

We really appreciate your help! A working code example would help us understand the exact implementation pattern.

**Developer:** Nuri Yildirim
