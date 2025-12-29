import Whop from "@whop/sdk";
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Only initialize SDK if API key is present (production mode)
let whopsdk: Whop | null = null;

if (process.env.WHOP_API_KEY) {
  whopsdk = new Whop({
    apiKey: process.env.WHOP_API_KEY,
    appID: process.env.WHOP_CLIENT_ID,
  });
} else {
  console.warn('⚠️ WHOP_API_KEY not set - running in local dev mode');
}

export { whopsdk };
