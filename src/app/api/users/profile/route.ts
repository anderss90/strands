import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getAuthenticatedUser } from '@/lib/middleware';
import { getUserById } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    // Check if authResult is an error response
    if (authResult && typeof authResult === 'object' && 'status' in authResult && authResult.status !== 200) {
      return authResult as NextResponse;
    }

    // Check if authResult has user property
    if (!authResult || typeof authResult !== 'object' || !('user' in authResult)) {
      return NextResponse.json(
        { message: 'Authorization token is required' },
        { status: 401 }
      );
    }

    const { user: authUser } = authResult as { user: { userId: string; email: string; username: string; isAdmin: boolean } };
    const user = await getUserById(authUser.userId);

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Remove password hash from response
    const { password_hash: _, ...userWithoutPassword } = user;
    
    // Include isAdmin status from the authenticated user (which is fetched from DB in middleware)
    const userWithAdmin = {
      ...userWithoutPassword,
      isAdmin: authUser.isAdmin,
    };

    return NextResponse.json(userWithAdmin, { status: 200 });
  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    // Check if authResult is an error response
    if (authResult && typeof authResult === 'object' && 'status' in authResult && authResult.status !== 200) {
      return authResult as NextResponse;
    }

    // Check if authResult has user property
    if (!authResult || typeof authResult !== 'object' || !('user' in authResult)) {
      return NextResponse.json(
        { message: 'Authorization token is required' },
        { status: 401 }
      );
    }

    const { user: authUser } = authResult as { user: { userId: string; email: string; username: string } };
    const body = await request.json();
    
    // Update user profile
    // TODO: Implement profile update
    const user = await getUserById(authUser.userId);

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Remove password hash from response
    const { password_hash: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword, { status: 200 });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

