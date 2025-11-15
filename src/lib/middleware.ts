import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    email: string;
    username: string;
  };
}

// Authentication middleware
export async function authenticateRequest(
  request: NextRequest
): Promise<{ user: { userId: string; email: string; username: string } } | NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Authorization token is required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const payload = verifyAccessToken(token);
      return { user: payload };
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { message: 'Authentication error' },
      { status: 401 }
    );
  }
}

// Helper function to get authenticated user from request
export async function getAuthenticatedUser(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  
  if (authResult instanceof NextResponse) {
    return null;
  }
  
  return authResult.user;
}

