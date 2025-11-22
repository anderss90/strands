import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { query } from '@/lib/db';
import { searchSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (authResult && typeof authResult === 'object' && 'status' in authResult && authResult.status !== 200) {
      return authResult as NextResponse;
    }

    if (!authResult || typeof authResult !== 'object' || !('user' in authResult)) {
      return NextResponse.json(
        { message: 'Authorization token is required' },
        { status: 401 }
      );
    }

    const { user: authUser } = authResult as { user: { userId: string; email: string; username: string } };
    
    // Get search query from URL
    let queryParam: string | null = null;
    try {
      queryParam = request.nextUrl?.searchParams?.get('q') || null;
    } catch (error) {
      // Handle case where nextUrl might not be available in test environment
      const url = new URL(request.url);
      queryParam = url.searchParams.get('q');
    }

    if (!queryParam) {
      return NextResponse.json(
        { message: 'Search query is required' },
        { status: 400 }
      );
    }

    // Validate input
    let validatedData;
    try {
      validatedData = searchSchema.parse({ q: queryParam });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { message: 'Validation error', errors: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }

    // Search users by username or email (excluding current user)
    const result = await query(
      `SELECT id, email, username, display_name, profile_picture_url, created_at
       FROM users
       WHERE (username ILIKE $1 OR email ILIKE $1)
         AND id != $2
       LIMIT 20`,
      [`%${validatedData.q}%`, authUser.userId]
    );

    const users = result.rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      username: row.username,
      displayName: row.display_name,
      profilePictureUrl: row.profile_picture_url,
      createdAt: row.created_at,
    }));

    return NextResponse.json(users, { status: 200 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Validation error', errors: error.errors },
        { status: 400 }
      );
    }

    console.error('Search users error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

