// Error handling utilities for Whop Pilot dashboard

export function handleDashboardError(error: unknown, context: string = "Dashboard") {
  console.error(`${context} Error:`, error);
  
  // Return a user-friendly error component
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-red-100 max-w-lg">
        <div className="text-4xl mb-4">🌪️</div>
        <h1 className="text-xl font-bold text-red-600 mb-2">Server Error Occurred</h1>
        <p className="text-gray-600 mb-6">
          An unexpected error occurred while loading your dashboard.
          This is usually caused by missing environment variables or API connectivity issues.
        </p>
        <div className="bg-gray-100 p-4 rounded-lg text-left text-xs font-mono text-gray-700 overflow-auto max-h-40">
          {error instanceof Error ? error.message : JSON.stringify(error)}
        </div>
        <div className="mt-6 text-sm text-gray-500">
          Please check your Vercel environment variables and try again.
        </div>
      </div>
    </div>
  );
}

export function validateEnvironment() {
  const requiredVars = [
    'WHOP_API_KEY',
    'NEXT_PUBLIC_WHOP_APP_ID',
    'WHOP_WEBHOOK_SECRET'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  return true;
}

export function isDevelopment() {
  return process.env.NODE_ENV === 'development';
}