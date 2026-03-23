import { Whop } from "@whop/sdk";

// Safe initialization with logging for Vercel debugging
const getWhopsdk = () => {
    console.log("Check: NEXT_PUBLIC_WHOP_APP_ID =", !!process.env.NEXT_PUBLIC_WHOP_APP_ID);
    console.log("Check: WHOP_API_KEY =", !!process.env.WHOP_API_KEY);
    console.log("Check: WHOP_WEBHOOK_SECRET =", !!process.env.WHOP_WEBHOOK_SECRET);

    try {
        return new Whop({
            appID: process.env.NEXT_PUBLIC_WHOP_APP_ID,
            apiKey: process.env.WHOP_API_KEY,
            webhookKey: process.env.WHOP_WEBHOOK_SECRET, // Use raw string
        });
    } catch (e) {
        console.error("Critical: Whop SDK failed to initialize:", e);
        return null;
    }
};

export const whopsdk = getWhopsdk() as Whop;
