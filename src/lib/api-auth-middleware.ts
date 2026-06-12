import { NextResponse } from 'next/server';

// Load API key from environment variables
const API_KEY = process.env.AGENT_API_KEY;

export function apiAuthMiddleware(handler: Function) {
  return async (request: Request, ...args: any[]) => {
    // Skip authentication for GET requests that are read-only by nature
    if (request.method === 'GET') {
      return handler(request, ...args);
    }

    if (!API_KEY) {
      // Return a 503 Service Unavailable if the API key is not configured.
      // This prevents accidental unauthenticated access in production.
      return NextResponse.json({ error: 'Service Unavailable: API key not configured' }, { status: 503 });
    }

    const providedKey = request.headers.get('X-Agent-Auth');

    if (!providedKey || providedKey !== API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If authentication is successful, proceed with the original handler
    return handler(request, ...args);
  };
}