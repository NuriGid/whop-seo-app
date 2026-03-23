# Vercel Deployment Troubleshooting Guide

## 🔍 Current Issue Analysis

**Error**: "Application error: a server-side exception has occurred" (Digest: 1610729638)

**Root Cause**: Missing or incorrect environment variables in Vercel production environment.

## 🛠️ Immediate Fix Steps

### 1. Check Vercel Environment Variables

Login to your Vercel dashboard and verify these environment variables are set:

```
✅ WHOP_API_KEY=[YOUR_WHOP_API_KEY]
✅ NEXT_PUBLIC_WHOP_APP_ID=[YOUR_WHOP_APP_ID]
✅ WHOP_WEBHOOK_SECRET=whsec_[YOUR_GENERATED_SECRET]
⚠️  GROQ_API_KEY=[YOUR_VALID_GROQ_API_KEY]  <-- This is likely missing
```

### 2. Generate New Webhook Secret

In your Vercel dashboard:
1. Go to your project settings
2. Navigate to Environment Variables
3. Add: `WHOP_WEBHOOK_SECRET` with value like `whsec_production_secret_7890`

### 3. Add Valid GROQ API Key

1. Get a valid GROQ API key from https://console.groq.com/
2. Add to Vercel environment variables:
   `GROQ_API_KEY=gsk_[your_actual_key]`

### 4. Redeploy Application

After updating environment variables:
1. Go to Vercel Deployments
2. Click "Redeploy" or push a new commit to trigger deployment
3. Monitor the deployment logs for any errors

## 🧪 Testing Steps

### Test Health Endpoint
```
curl https://your-vercel-app.vercel.app/api/health
```

Should return:
```json
{
  "status": "healthy",
  "envVariables": {
    "WHOP_API_KEY": true,
    "NEXT_PUBLIC_WHOP_APP_ID": true,
    "WHOP_WEBHOOK_SECRET": true,
    "GROQ_API_KEY": true
  }
}
```

### Test Dashboard Access
Navigate to: `https://your-vercel-app.vercel.app/dashboard/[your-company-id]`

## 🚨 Common Issues & Solutions

### Issue 1: "Missing Environment Variables"
**Solution**: Double-check all 4 required environment variables are set in Vercel

### Issue 2: "Invalid API Key"
**Solution**: Verify WHOP_API_KEY is correct and has proper permissions

### Issue 3: "Authentication Failed"
**Solution**: 
- Ensure you're accessing from Whop dashboard
- Check that app_womUHsVbtRHsMx is the correct app ID
- Verify webhook secret matches

### Issue 4: "500 Internal Server Error"
**Solution**: Check Vercel function logs for detailed error messages

## 📋 Quick Verification Checklist

- [ ] All 4 environment variables are set in Vercel
- [ ] WHOP_API_KEY is valid and active
- [ ] GROQ_API_KEY is valid (not placeholder)
- [ ] WHOP_WEBHOOK_SECRET is properly formatted
- [ ] NEXT_PUBLIC_WHOP_APP_ID matches your Whop app
- [ ] Health endpoint returns "status": "healthy"
- [ ] Dashboard loads without authentication errors

## 🆘 Emergency Contact

If issues persist:
1. Check Vercel deployment logs
2. Test health endpoint
3. Verify all environment variables
4. Contact Whop support with the error digest (1610729638)

The application is working correctly locally - the issue is definitely environment configuration in Vercel.