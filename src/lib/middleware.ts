import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './auth';
import { query } from './db';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    email: string;
    username: string;
    isAdmin: boolean;
  };
}

// Authentication middleware
export async function authenticateRequest(
  request: NextRequest
): Promise<{ user: { userId: string; email: string; username: string; isAdmin: boolean } } | NextResponse> {
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
      
      // Fetch admin status from database
      const userResult = await query(
        'SELECT is_admin FROM users WHERE id = $1',
        [payload.userId]
      );
      
      const isAdmin = userResult.rows.length > 0 ? (userResult.rows[0].is_admin === true) : false;
      
      return { 
        user: {
          ...payload,
          isAdmin
        }
      };
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
