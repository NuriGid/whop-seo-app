import { Whop } from "@whop/sdk";

// Safe initialization to prevent module-level crashes
const getWhopsdk = () => {
    try {
        return new Whop({
            appID: process.env.NEXT_PUBLIC_WHOP_APP_ID,
            apiKey: process.env.WHOP_API_KEY,
            webhookKey: process.env.WHOP_WEBHOOK_SECRET ? Buffer.from(process.env.WHOP_WEBHOOK_SECRET).toString('base64') : undefined,
        });
    } catch (e) {
        console.error("Critical: Whop SDK failed to initialize", e);
        return null;
    }
};

export const whopsdk = getWhopsdk() as Whop;
