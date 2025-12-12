import Whop from "@whop/sdk";
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

export const whopsdk = new Whop({
  apiKey: process.env.WHOP_API_KEY!, // App API key
  appID: process.env.WHOP_CLIENT_ID,  // Whop app id (app_xxxxx)
});
