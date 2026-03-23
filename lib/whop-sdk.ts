import { Whop } from "@whop/sdk";

let whopInstance: Whop | null = null;

export const getWhopClient = () => {
    if (whopInstance) return whopInstance;
    
    try {
        if (!process.env.WHOP_API_KEY) {
            console.error("WHOP_API_KEY is not defined in environment variables.");
        }
        
        whopInstance = new Whop({
            appID: process.env.NEXT_PUBLIC_WHOP_APP_ID,
            apiKey: process.env.WHOP_API_KEY,
            webhookKey: process.env.WHOP_WEBHOOK_SECRET,
        });
        return whopInstance;
    } catch (e) {
        console.error("Failed to initialize Whop SDK:", e);
        return null;
    }
};
