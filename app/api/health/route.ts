import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const envCheck = {
      WHOP_API_KEY: !!process.env.WHOP_API_KEY,
      NEXT_PUBLIC_WHOP_APP_ID: !!process.env.NEXT_PUBLIC_WHOP_APP_ID,
      WHOP_WEBHOOK_SECRET: !!process.env.WHOP_WEBHOOK_SECRET,
      GROQ_API_KEY: !!process.env.GROQ_API_KEY
    };

    // Check if all required env vars are present
    const allEnvPresent = Object.values(envCheck).every(Boolean);
    
    const healthStatus = {
      status: allEnvPresent ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      envVariables: envCheck,
      missingVariables: Object.entries(envCheck)
        .filter(([_, present]) => !present)
        .map(([key, _]) => key)
    };

    return NextResponse.json(healthStatus, { 
      status: allEnvPresent ? 200 : 503 
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}